import { Request, Response, NextFunction } from "express";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { computeReputation } from "../services/reputation.service";
import { invalidateAccountStatus } from "../services/accountStatus.service";
import { CreateNotificationInput, createNotification } from "../services/notification.service";
import { DisableUserInput, EnableUserInput, listUsersQuerySchema } from "../validators/adminUser.validator";

const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  location: true,
  avatarUrl: true,
  createdAt: true,
  isDisabled: true,
  disabledAt: true,
  disabledReason: true,
} satisfies Prisma.UserSelect;

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid filters"));
    }
    const { search, role, status, page, limit } = parsed.data;

    // Role and search narrow everything; status is applied on top so the
    // all/active/disabled counts always describe the same set of people.
    const base: Prisma.UserWhereInput = {
      ...(role !== "all" ? { role: role as Role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };
    const where: Prisma.UserWhereInput =
      status === "all" ? base : { ...base, isDisabled: status === "disabled" };

    const [users, total, active, disabled] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SUMMARY_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...base, isDisabled: false } }),
      prisma.user.count({ where: { ...base, isDisabled: true } }),
    ]);

    res.json({ users, total, page, limit, counts: { all: active + disabled, active, disabled } });
  } catch (err) {
    next(err);
  }
}

export async function getUserDetail(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { ...USER_SUMMARY_SELECT, bio: true, trustScore: true },
    });
    if (!user) {
      return next(new HttpError(404, "User not found"));
    }

    const [
      gigsPosted,
      activeGigs,
      applications,
      hiredApplications,
      completedJobs,
      reputation,
      warningCount,
      recentWarnings,
      statusHistory,
      latestVerificationRequest,
      latestVerifierApplication,
    ] = await Promise.all([
      prisma.gigPost.count({ where: { businessId: id, isDeleted: false } }),
      prisma.gigPost.count({ where: { businessId: id, isDeleted: false, status: "ACTIVE" } }),
      prisma.application.count({ where: { applicantId: id } }),
      prisma.application.count({ where: { applicantId: id, status: { in: ["HIRED", "COMPLETED"] } } }),
      prisma.workHistoryEntry.count({ where: { userId: id } }),
      computeReputation(id),
      prisma.notification.count({ where: { recipientId: id, type: "ACCOUNT_WARNING" } }),
      prisma.notification.findMany({
        where: { recipientId: id, type: "ACCOUNT_WARNING" },
        select: { id: true, message: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.userStatusEvent.findMany({
        where: { userId: id },
        select: { id: true, action: true, reason: true, createdAt: true, admin: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.verificationRequest.findFirst({
        where: { applicantId: id },
        select: { status: true, submittedAt: true },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.verifierApplication.findFirst({
        where: { applicantId: id },
        select: { status: true, submittedAt: true },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    res.json({
      user,
      stats: { gigsPosted, activeGigs, applications, hiredApplications, completedJobs },
      reputation,
      warnings: { total: warningCount, recent: recentWarnings },
      verification: {
        jobSeekerRequest: latestVerificationRequest,
        verifierApplication: latestVerifierApplication,
      },
      statusHistory,
    });
  } catch (err) {
    next(err);
  }
}

// Guards shared by disable/enable: the target must exist and be a non-admin
// other than the acting admin, so nobody can lock themselves or another admin out.
async function findManageableUser(adminId: string, userId: string) {
  if (adminId === userId) {
    throw new HttpError(400, "You can't change the status of your own account.");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isDisabled: true },
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  if (user.role === "admin") {
    throw new HttpError(403, "Admin accounts can't be disabled or enabled here.");
  }
  return user;
}

// The status change has already been saved by the time this runs, so a
// notification failure is logged instead of turning the admin's action into an error.
async function notifyBestEffort(input: CreateNotificationInput) {
  try {
    await createNotification(input);
  } catch (err) {
    console.error(`Failed to notify user ${input.recipientId} about ${input.type}:`, err);
  }
}

export async function disableUser(
  req: Request<{ id: string }, unknown, DisableUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId: adminId } = req as unknown as AuthedRequest;
    const { id } = req.params;
    const { reason } = req.body;

    const target = await findManageableUser(adminId, id);
    if (target.isDisabled) {
      return next(new HttpError(409, "This account is already disabled."));
    }

    // Sequential writes: the Neon HTTP adapter can't run transactions.
    const user = await prisma.user.update({
      where: { id },
      data: { isDisabled: true, disabledAt: new Date(), disabledReason: reason },
      select: USER_SUMMARY_SELECT,
    });
    await prisma.userStatusEvent.create({ data: { userId: id, adminId, action: "DISABLED", reason } });
    invalidateAccountStatus(id);

    // The in-app copy is mostly for the record; the email is what actually
    // reaches someone who can no longer sign in.
    await notifyBestEffort({
      recipientId: id,
      type: "ACCOUNT_DISABLED",
      title: "Account Disabled",
      message: `Your account was disabled by an administrator. Reason: ${reason}`,
      emailParams: { reason },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function enableUser(
  req: Request<{ id: string }, unknown, EnableUserInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId: adminId } = req as unknown as AuthedRequest;
    const { id } = req.params;
    const reason = req.body.reason || undefined;

    const target = await findManageableUser(adminId, id);
    if (!target.isDisabled) {
      return next(new HttpError(409, "This account is already active."));
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isDisabled: false, disabledAt: null, disabledReason: null },
      select: USER_SUMMARY_SELECT,
    });
    await prisma.userStatusEvent.create({ data: { userId: id, adminId, action: "ENABLED", reason } });
    invalidateAccountStatus(id);

    await notifyBestEffort({
      recipientId: id,
      type: "ACCOUNT_ENABLED",
      title: "Account Re-enabled",
      message: "Your account was re-enabled by an administrator. Welcome back!",
      emailParams: { reason },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}
