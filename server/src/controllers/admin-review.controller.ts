import { Request, Response, NextFunction } from "express";
import { ReviewStatus } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { ModerateReviewInput } from "../validators/review.validator";
import { createNotification } from "../services/notification.service";

export async function listFlaggedReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { status: "FLAGGED" },
        include: {
          gig: { select: { id: true, title: true } },
          reviewer: { select: { id: true, name: true, email: true } },
          reviewee: { select: { id: true, name: true, email: true } },
          reports: {
            where: { status: "PENDING" },
            include: { reporter: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { status: "FLAGGED" } }),
    ]);

    res.json({ reviews, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function moderateReview(
  req: Request<{ reviewId: string }, unknown, ModerateReviewInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId: adminId } = req as unknown as AuthedRequest;
    const { reviewId } = req.params;
    const { action, reason } = req.body;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { gig: { select: { title: true } } },
    });
    if (!review) {
      return next(new HttpError(404, "Review not found"));
    }
    if (review.status !== "FLAGGED") {
      return next(new HttpError(409, "Only flagged reviews can be moderated."));
    }

    const previousStatus: ReviewStatus = review.status;
    const newStatus: ReviewStatus = action === "REMOVE_REVIEW" ? "REMOVED" : "PUBLISHED";
    const reportStatus = action === "DISMISS_REPORT" ? "DISMISSED" : "RESOLVED";

    await prisma.review.update({ where: { id: reviewId }, data: { status: newStatus } });

    const pendingReports = await prisma.reviewReport.findMany({
      where: { reviewId, status: "PENDING" },
    });
    await prisma.reviewReport.updateMany({
      where: { reviewId, status: "PENDING" },
      data: { status: reportStatus },
    });

    await prisma.moderationAudit.create({
      data: { reviewId, adminId, action, previousStatus, newStatus, reason },
    });

    if (action === "REMOVE_REVIEW") {
      await createNotification({
        userId: review.reviewerId,
        type: "REVIEW_REMOVED",
        title: "Your review was removed",
        body: `Your review for "${review.gig.title}" was removed by a moderator.`,
        linkType: "REVIEW",
        linkId: review.id,
        emailParams: { gigTitle: review.gig.title, reason },
      });
    } else if (action === "WARN_AUTHOR") {
      await createNotification({
        userId: review.reviewerId,
        type: "ACCOUNT_WARNING",
        title: "Account warning",
        body: `You received a warning regarding your review for "${review.gig.title}".`,
        linkType: "REVIEW",
        linkId: review.id,
        emailParams: { reason },
      });
    }

    if (action === "DISMISS_REPORT" || action === "WARN_AUTHOR") {
      await Promise.all(
        pendingReports.map((report) =>
          createNotification({
            userId: report.reporterId,
            type: "REPORT_DISMISSED",
            title: "Your report was reviewed",
            body: `Your report on a review for "${review.gig.title}" was reviewed. The review remains published.`,
            linkType: "REVIEW",
            linkId: review.id,
            emailParams: { reason },
          })
        )
      );
    }

    const updated = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
    res.json({ review: updated });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}
