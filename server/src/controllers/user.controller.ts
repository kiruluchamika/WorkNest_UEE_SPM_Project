import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { computeReputation } from "../services/reputation.service";

function parsePagination(query: Request["query"]) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export async function getUserReviews(req: Request<{ userId: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { page, limit, skip } = parsePagination(req.query);
    const where = { revieweeId: userId, status: "PUBLISHED" as const };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          reviewer: { select: { id: true, name: true, avatarUrl: true } },
          gig: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ reviews, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getUserReputation(req: Request<{ userId: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return next(new HttpError(404, "User not found"));
    }

    const reputation = await computeReputation(userId);
    res.json({ reputation });
  } catch (err) {
    next(err);
  }
}

export async function getUserWorkHistory(req: Request<{ userId: string }>, res: Response, next: NextFunction) {
  try {
    const { userId: paramUserId } = req.params;
    const { userId: requesterId } = req as unknown as AuthedRequest;
    const { page, limit, skip } = parsePagination(req.query);

    const [entries, total] = await Promise.all([
      prisma.workHistoryEntry.findMany({
        where: { userId: paramUserId },
        include: {
          gig: { select: { id: true, title: true, business: { select: { id: true, name: true } } } },
          application: { select: { applicant: { select: { id: true, name: true } } } },
        },
        orderBy: { completedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.workHistoryEntry.count({ where: { userId: paramUserId } }),
    ]);

    const isSelf = requesterId === paramUserId;
    let reviewedPairs = new Set<string>();
    if (isSelf && entries.length > 0) {
      const gigIds = [...new Set(entries.map((e) => e.gigId))];
      const reviewsGiven = await prisma.review.findMany({
        where: { reviewerId: requesterId, gigId: { in: gigIds } },
        select: { gigId: true, revieweeId: true },
      });
      reviewedPairs = new Set(reviewsGiven.map((r) => `${r.gigId}:${r.revieweeId}`));
    }

    const workHistory = entries.map((entry) => {
      const counterpart = entry.role === "YOUTH" ? entry.gig.business : entry.application.applicant;
      const base = {
        id: entry.id,
        gigId: entry.gigId,
        gigTitle: entry.gig.title,
        role: entry.role,
        completedAt: entry.completedAt,
        gigStatus: entry.gigStatus,
        counterpartId: counterpart.id,
        counterpartName: counterpart.name,
      };
      return isSelf ? { ...base, hasReviewed: reviewedPairs.has(`${entry.gigId}:${counterpart.id}`) } : base;
    });

    res.json({ workHistory, total, page, limit });
  } catch (err) {
    next(err);
  }
}
