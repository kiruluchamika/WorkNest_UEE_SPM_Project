import { Request, Response, NextFunction } from "express";
import { GigStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { CreateGigPostInput, UpdateGigPostInput, RejectGigInput } from "../validators/gig.validator";
import { markGigComplete } from "../services/gigCompletion.service";
import { fetchGigWithCategory } from "../services/gig.service";

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

async function toPublicGigWithFilledPositions<T extends { id: string; paymentAmount: Prisma.Decimal }>(gig: T) {
  const filledPositions = await prisma.application.count({
    where: {
      gigPostId: gig.id,
      status: { in: ["HIRED", "COMPLETED"] },
    },
  });

  return { ...toPublicGig(gig), filledPositions };
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

    res.json({ gigs: gigs.map(toPublicGig) });
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
        business: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ gigs: await Promise.all(gigs.map(toPublicGigWithFilledPositions)) });
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
        business: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!gig) {
      return next(new HttpError(404, "Gig not found"));
    }

    res.json({ gig: await toPublicGigWithFilledPositions(gig) });
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

    res.json({ gig: toPublicGig(gig) });
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

    if (existing.status === "CLOSED") {
      return next(new HttpError(409, "Closed gigs cannot be edited."));
    }

    if (updates.categoryId) {
      await assertActiveCategory(updates.categoryId);
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

    res.json({ gig: toPublicGig(gig) });
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

    res.json({ gig: toPublicGig(gig) });
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

    res.json({ gig: toPublicGig(gig) });
  } catch (err) {
    next(err);
  }
}

export async function completeGig(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { id } = req.params;

    const gig = await markGigComplete(id, userId);

    res.json({ gig: toPublicGig(gig) });
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

    res.json({ message: "Gig rejected.", gig: toPublicGig(gig) });
  } catch (err) {
    next(err);
  }
}
