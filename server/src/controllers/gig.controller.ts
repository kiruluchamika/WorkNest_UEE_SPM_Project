import { Request, Response, NextFunction } from "express";
import { GigStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import {
  CreateGigPostInput,
  UpdateGigPostInput,
  RejectGigInput,
  findScheduleIssue,
  isBeforeTodayInSriLanka,
} from "../validators/gig.validator";
import { markGigComplete } from "../services/gigCompletion.service";
import { fetchGigWithCategory } from "../services/gig.service";
import { createNotification } from "../services/notification.service";

const ADMIN_GIG_INCLUDE = {
  category: true,
  business: { select: { id: true, name: true, email: true, phone: true } },
} as const;

const IMPORTANT_FIELDS = [
  "title",
  "categoryId",
  "description",
  "paymentAmount",
  "paymentType",
  "location",
  "startDate",
  "startTime",
  "endDate",
  "endTime",
] as const;

function hasImportantChange(existing: Record<string, unknown>, updates: Record<string, unknown>): boolean {
  return IMPORTANT_FIELDS.some((field) => {
    if (!(field in updates)) return false;

    const newValue = updates[field];
    const oldValue = existing[field];

    if (newValue instanceof Date || oldValue instanceof Date) {
      const newTime = newValue ? new Date(newValue as string | Date).getTime() : null;
      const oldTime = oldValue ? new Date(oldValue as string | Date).getTime() : null;
      return newTime !== oldTime;
    }

    if (field === "paymentAmount") {
      return Number(newValue) !== Number(oldValue);
    }

    return newValue !== oldValue;
  });
}

async function assertActiveCategory(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) {
    throw new HttpError(400, "Selected category is not available.");
  }
}

function toPublicGig<T extends { paymentAmount: Prisma.Decimal }>(gig: T) {
  return { ...gig, paymentAmount: Number(gig.paymentAmount) };
}

// One grouped count for the whole list instead of a count query per gig.
async function toPublicGigsWithFilledPositions<T extends { id: string; paymentAmount: Prisma.Decimal }>(
  gigs: T[]
) {
  if (!gigs.length) return [];

  const counts = await prisma.application.groupBy({
    by: ["gigPostId"],
    where: {
      gigPostId: { in: gigs.map((g) => g.id) },
      status: { in: ["HIRED", "COMPLETED"] },
    },
    _count: { id: true },
  });
  const countMap = new Map(counts.map((c) => [c.gigPostId, c._count.id]));

  return gigs.map((gig) => ({ ...toPublicGig(gig), filledPositions: countMap.get(gig.id) ?? 0 }));
}

async function toPublicGigWithFilledPositions<T extends { id: string; paymentAmount: Prisma.Decimal }>(gig: T) {
  return (await toPublicGigsWithFilledPositions([gig]))[0];
}

// Approval/rejection must never fail because the notification could not be saved.
async function notifyGigModeration(params: {
  recipientId: string;
  gigId: string;
  type: "GIG_APPROVED" | "GIG_REJECTED";
  title: string;
  message: string;
}) {
  try {
    await createNotification({
      recipientId: params.recipientId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: `/gigs/${params.gigId}`,
      relatedEntityId: params.gigId,
    });
  } catch (err) {
    console.error(`Failed to send ${params.type} notification for gig ${params.gigId}:`, err);
  }
}

async function fetchAdminGig(id: string) {
  return prisma.gigPost.findUniqueOrThrow({ where: { id }, include: ADMIN_GIG_INCLUDE });
}

export async function createGig(
  req: Request<unknown, unknown, CreateGigPostInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as AuthedRequest;
    const data = req.body;

    await assertActiveCategory(data.categoryId);

    const created = await prisma.gigPost.create({
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        businessId: userId,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        paymentAmount: data.paymentAmount,
        paymentType: data.paymentType,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        workersNeeded: data.workersNeeded,
        requiredSkills: data.requiredSkills ?? [],
        contactInfo: data.contactInfo,
        imageUrl: data.imageUrl,
        status: "PENDING",
      },
    });
    const gig = await fetchGigWithCategory(created.id);

    await createNotification({
      recipientId: userId,
      type: "GIG_POSTED",
      title: "Gig Submitted",
      message: `"${gig.title}" has been submitted and is pending review.`,
      link: `/gigs/${gig.id}`,
      relatedEntityId: gig.id,
      emailParams: {
        gigTitle: gig.title,
        category: gig.category.name,
        paymentAmount: Number(gig.paymentAmount),
        paymentType: gig.paymentType,
        location: gig.location,
      },
    });

    res.status(201).json({ gig: toPublicGig(gig) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

export async function listMyGigs(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    const statusParam = req.query.status as string | undefined;

    if (statusParam && !Object.values(GigStatus).includes(statusParam as GigStatus)) {
      return next(new HttpError(400, "Invalid status filter."));
    }

    const gigs = await prisma.gigPost.findMany({
      where: {
        businessId: userId,
        isDeleted: false,
        ...(statusParam ? { status: statusParam as GigStatus } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ gigs: await toPublicGigsWithFilledPositions(gigs) });
  } catch (err) {
    next(err);
  }
}

export async function listActiveGigs(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const location = req.query.location as string | undefined;

    const gigs = await prisma.gigPost.findMany({
      where: {
        status: "ACTIVE",
        isDeleted: false,
        ...(categoryId ? { categoryId } : {}),
        ...(location
          ? { location: { contains: location, mode: "insensitive" } }
          : {}),
      },
      include: {
        category: true,
        business: { select: { id: true, name: true, email: true, phone: true, bio: true, location: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ gigs: await enrichEmployers(await toPublicGigsWithFilledPositions(gigs)) });
  } catch (err) {
    next(err);
  }
}

export async function getPublicGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const gig = await prisma.gigPost.findFirst({
      where: { id, isDeleted: false },
      include: {
        category: true,
        business: { select: { id: true, name: true, email: true, phone: true, bio: true, location: true, avatarUrl: true } },
      },
    });

    if (!gig) {
      return next(new HttpError(404, "Gig not found"));
    }

    res.json({ gig: (await enrichEmployers([await toPublicGigWithFilledPositions(gig)]))[0] });
  } catch (err) {
    next(err);
  }
}

export async function getMyGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { id } = req.params;

    const gig = await prisma.gigPost.findFirst({
      where: { id, businessId: userId, isDeleted: false },
      include: { category: true },
    });

    if (!gig) {
      return next(new HttpError(404, "Gig not found"));
    }

    res.json({ gig: await toPublicGigWithFilledPositions(gig) });
  } catch (err) {
    next(err);
  }
}

export async function updateGig(
  req: Request<{ id: string }, unknown, UpdateGigPostInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { id } = req.params;
    const updates = req.body;

    const existing = await prisma.gigPost.findFirst({
      where: { id, businessId: userId, isDeleted: false },
    });

    if (!existing) {
      return next(new HttpError(404, "Gig not found"));
    }

    if (existing.status === "CLOSED" || existing.status === "COMPLETED") {
      const label = existing.status === "CLOSED" ? "Closed" : "Completed";
      return next(new HttpError(409, `${label} gigs cannot be edited.`));
    }

    if (updates.categoryId && updates.categoryId !== existing.categoryId) {
      await assertActiveCategory(updates.categoryId);
    }

    // An untouched past start date is left alone so older gigs stay editable.
    if (
      updates.startDate &&
      updates.startDate.getTime() !== existing.startDate.getTime() &&
      isBeforeTodayInSriLanka(updates.startDate)
    ) {
      return next(new HttpError(400, "Start date cannot be in the past."));
    }

    const scheduleIssue = findScheduleIssue({
      startDate: updates.startDate ?? existing.startDate,
      startTime: updates.startTime !== undefined ? updates.startTime : existing.startTime,
      endDate: updates.endDate !== undefined ? updates.endDate : existing.endDate,
      endTime: updates.endTime !== undefined ? updates.endTime : existing.endTime,
    });
    if (scheduleIssue) {
      return next(new HttpError(400, scheduleIssue.message));
    }

    const important = hasImportantChange(existing, updates);
    const shouldResetToPending = important && (existing.status === "ACTIVE" || existing.status === "REJECTED");

    await prisma.gigPost.update({
      where: { id },
      data: {
        ...updates,
        ...(shouldResetToPending ? { status: "PENDING", rejectionReason: null } : {}),
      },
    });
    const gig = await fetchGigWithCategory(id);

    res.json({ gig: await toPublicGigWithFilledPositions(gig) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

export async function deleteGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { id } = req.params;

    const existing = await prisma.gigPost.findFirst({
      where: { id, businessId: userId, isDeleted: false },
    });

    if (!existing) {
      return next(new HttpError(404, "Gig not found"));
    }

    const hiredWorkers = await prisma.application.count({
      where: { gigPostId: id, status: "HIRED" },
    });
    if (hiredWorkers > 0) {
      return next(
        new HttpError(409, "This gig has hired workers. Mark it completed before deleting it.")
      );
    }

    await prisma.gigPost.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function closeGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { id } = req.params;

    const existing = await prisma.gigPost.findFirst({
      where: { id, businessId: userId, isDeleted: false },
    });

    if (!existing) {
      return next(new HttpError(404, "Gig not found"));
    }

    if (existing.status !== "ACTIVE") {
      return next(new HttpError(409, "Only active gigs can be closed."));
    }

    await prisma.gigPost.update({ where: { id }, data: { status: "CLOSED" } });
    const gig = await fetchGigWithCategory(id);

    res.json({ gig: await toPublicGigWithFilledPositions(gig) });
  } catch (err) {
    next(err);
  }
}

export async function resubmitGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { id } = req.params;

    const existing = await prisma.gigPost.findFirst({
      where: { id, businessId: userId, isDeleted: false },
    });

    if (!existing) {
      return next(new HttpError(404, "Gig not found"));
    }

    if (existing.status !== "REJECTED") {
      return next(new HttpError(409, "Only rejected gigs can be resubmitted."));
    }

    await prisma.gigPost.update({
      where: { id },
      data: { status: "PENDING", rejectionReason: null },
    });
    const gig = await fetchGigWithCategory(id);

    res.json({ gig: await toPublicGigWithFilledPositions(gig) });
  } catch (err) {
    next(err);
  }
}

export async function completeGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { id } = req.params;

    const gig = await markGigComplete(id, userId);

    res.json({ gig: await toPublicGigWithFilledPositions(gig) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

// ---- Admin moderation ----

export async function listAdminGigs(req: Request, res: Response, next: NextFunction) {
  try {
    const statusParam = req.query.status as string | undefined;

    if (statusParam && statusParam !== "ALL" && !Object.values(GigStatus).includes(statusParam as GigStatus)) {
      return next(new HttpError(400, "Invalid status filter."));
    }

    const gigs = await prisma.gigPost.findMany({
      where: {
        isDeleted: false,
        ...(statusParam && statusParam !== "ALL" ? { status: statusParam as GigStatus } : {}),
      },
      include: ADMIN_GIG_INCLUDE,
      orderBy: { createdAt: statusParam === "PENDING" ? "asc" : "desc" },
    });

    res.json({ gigs: gigs.map(toPublicGig) });
  } catch (err) {
    next(err);
  }
}

export async function getAdminGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const gig = await prisma.gigPost.findFirst({
      where: { id, isDeleted: false },
      include: ADMIN_GIG_INCLUDE,
    });

    if (!gig) {
      return next(new HttpError(404, "Gig not found"));
    }

    res.json({ gig: toPublicGig(gig) });
  } catch (err) {
    next(err);
  }
}

export async function approveGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const existing = await prisma.gigPost.findFirst({ where: { id, isDeleted: false } });
    if (!existing) {
      return next(new HttpError(404, "Gig not found"));
    }
    if (existing.status !== "PENDING") {
      return next(new HttpError(409, "Only pending gigs can be approved."));
    }

    await prisma.gigPost.update({
      where: { id },
      data: { status: "ACTIVE", rejectionReason: null },
    });
    const gig = await fetchAdminGig(id);

    await notifyGigModeration({
      recipientId: gig.businessId,
      gigId: gig.id,
      type: "GIG_APPROVED",
      title: "Gig Approved",
      message: `"${gig.title}" has been approved and is now open for applications.`,
    });

    res.json({ message: "Gig approved successfully.", gig: toPublicGig(gig) });
  } catch (err) {
    next(err);
  }
}

export async function rejectGig(
  req: Request<{ id: string }, unknown, RejectGigInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await prisma.gigPost.findFirst({ where: { id, isDeleted: false } });
    if (!existing) {
      return next(new HttpError(404, "Gig not found"));
    }
    if (existing.status !== "PENDING") {
      return next(new HttpError(409, "Only pending gigs can be rejected."));
    }

    await prisma.gigPost.update({
      where: { id },
      data: { status: "REJECTED", rejectionReason: reason },
    });
    const gig = await fetchAdminGig(id);

    await notifyGigModeration({
      recipientId: gig.businessId,
      gigId: gig.id,
      type: "GIG_REJECTED",
      title: "Gig Needs Changes",
      message: `"${gig.title}" was not approved: ${reason}`,
    });

    res.json({ message: "Gig rejected.", gig: toPublicGig(gig) });
  } catch (err) {
    next(err);
  }
}

// Batch employer aggregates to avoid one reputation request per card.
async function enrichEmployers<T extends { businessId: string }>(gigs: T[]) {
 const ids = [...new Set(gigs.map(g => g.businessId))];
 if (!ids.length) return gigs;
 const [ratings, completed] = await Promise.all([
 prisma.review.groupBy({ by: ["revieweeId"], where: { revieweeId: { in: ids }, status: "PUBLISHED" }, _avg: { rating: true }, _count: { rating: true } }),
 prisma.gigPost.groupBy({ by: ["businessId"], where: { businessId: { in: ids }, status: "COMPLETED", isDeleted: false }, _count: { id: true } }),
 ]);
 const ratingMap = new Map(ratings.map(r => [r.revieweeId, r]));
 const completedMap = new Map(completed.map(r => [r.businessId, r._count.id]));
 return gigs.map(g => { const r = ratingMap.get(g.businessId); return { ...g, employerSummary: {
 averageRating: r?._avg.rating == null ? null : Math.round(r._avg.rating * 10) / 10,
 totalReviews: r?._count.rating ?? 0, completedGigs: completedMap.get(g.businessId) ?? 0,
 // Shop-owner verification is not yet backed by a verification workflow.
 isVerified: false,
 } }; });
}
