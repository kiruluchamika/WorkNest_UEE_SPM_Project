import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { neonSql, prisma } from "../config/db";
import { hashPassword, comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { RegisterInput, LoginInput, UpdateProfileInput } from "../validators/auth.validator";
import { sendWelcomeEmail } from "../services/email.service";
import { accountDisabledError } from "../services/accountStatus.service";

// Best-effort: registration must succeed even if SMTP is down, so the send is
// not awaited and a failure is only logged.
function sendWelcomeEmailInBackground(email: string, name: string, role: string) {
  void sendWelcomeEmail(email, { recipientName: name, role }).catch((err) => {
    console.error(`Failed to send welcome email to ${email}:`, err);
  });
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  trustScore: number;
  createdAt: Date;
  verifierApplications?: Array<{
    id: string; status: string; submittedAt: Date; reviewedAt: Date | null; rejectionReason: string | null;
    approvalAcknowledgedAt: Date | null; suspendedAt: Date | null; suspensionReason: string | null;
  }>;
}) {
  const applications = user.verifierApplications ?? [];
  const latestApplication = applications.find((application) => application.status === "PENDING")
    ?? applications.find((application) => application.status === "SUSPENDED")
    ?? applications.find((application) => application.status === "APPROVED")
    ?? applications[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? undefined,
    bio: user.bio ?? undefined,
    location: user.location ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    trustScore: user.trustScore,
    createdAt: user.createdAt.toISOString(),
    verifierApplication: latestApplication ? {
      ...latestApplication,
      submittedAt: latestApplication.submittedAt.toISOString(),
      reviewedAt: latestApplication.reviewedAt?.toISOString(),
      rejectionReason: latestApplication.rejectionReason ?? undefined,
      approvalAcknowledgedAt: latestApplication.approvalAcknowledgedAt?.toISOString(),
      suspendedAt: latestApplication.suspendedAt?.toISOString(),
      suspensionReason: latestApplication.suspensionReason ?? undefined,
    } : undefined,
  };
}

export async function register(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, email, phone, role, password, district, identityType, identityNumber,
      identityDocumentReference, identityDocumentMetadata, addressInformation, communityReference } = req.body;

    const passwordHash = await hashPassword(password);

    if (role === "verifier") {
      const userId = randomUUID();
      const applicationId = randomUUID();
      const createdAt = new Date();
      const documentMetadata = identityDocumentMetadata
        ? JSON.stringify(identityDocumentMetadata)
        : null;

      await neonSql.transaction([
        neonSql`
          INSERT INTO "User" (
            "id", "name", "email", "passwordHash", "role", "phone",
            "trustScore", "createdAt", "updatedAt"
          ) VALUES (
            ${userId}, ${name}, ${email}, ${passwordHash}, 'verifier'::"Role", ${phone ?? null},
            0, ${createdAt}, ${createdAt}
          )
        `,
        neonSql`
          INSERT INTO "VerifierApplication" (
            "id", "applicantId", "district", "identityType", "identityNumber",
            "identityDocumentReference", "identityDocumentMetadata",
            "addressInformation", "communityReference", "status", "submittedAt"
          ) VALUES (
            ${applicationId}, ${userId}, ${district!}, ${identityType!}, ${identityNumber!},
            ${identityDocumentReference || ""}, ${documentMetadata}::jsonb,
            ${addressInformation!}, ${communityReference || null},
            'PENDING'::"VerifierApplicationStatus", ${createdAt}
          )
        `,
      ]);

      const user = {
        id: userId,
        name,
        email,
        role,
        phone: phone ?? null,
        bio: null,
        location: null,
        avatarUrl: null,
        trustScore: 0,
        createdAt,
        verifierApplications: [{
          id: applicationId,
          status: "PENDING",
          submittedAt: createdAt,
          reviewedAt: null,
          rejectionReason: null,
          approvalAcknowledgedAt: null,
          suspendedAt: null,
          suspensionReason: null,
        }],
      };
      const token = signToken({ userId: user.id, role: user.role });
      sendWelcomeEmailInBackground(user.email, user.name, user.role);
      return res.status(201).json({ token, user: toPublicUser(user) });
    }

    const user = await prisma.user.create({
      data: {
        name, email, phone, role, passwordHash,
      },
    });

    const token = signToken({ userId: user.id, role: user.role });
    sendWelcomeEmailInBackground(user.email, user.name, user.role);

    res.status(201).json({ token, user: toPublicUser({ ...user, verifierApplications: [] }) });
  } catch (err) {
    if ((err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") ||
        (typeof err === "object" && err !== null && "code" in err && err.code === "23505")) {
      return next(new HttpError(409, "Email already registered"));
    }
    next(err);
  }
}

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email }, include: { verifierApplications: { orderBy: { submittedAt: "desc" } } } });
    if (!user) {
      return next(new HttpError(401, "Invalid email or password"));
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      return next(new HttpError(401, "Invalid email or password"));
    }

    // Checked only after the password, so a wrong guess can't reveal that an account is disabled.
    if (user.isDisabled) {
      return next(accountDisabledError(user.disabledReason));
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { verifierApplications: { orderBy: { submittedAt: "desc" } } } });
    if (!user) {
      return next(new HttpError(401, "Invalid or expired session"));
    }

    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request<unknown, unknown, UpdateProfileInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthedRequest;
    const { name, phone, bio, location, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, phone, bio, location, avatarUrl },
    });

    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
