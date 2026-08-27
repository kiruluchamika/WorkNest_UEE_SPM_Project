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
    // updateMany is avoided: the Neon HTTP adapter implicitly wraps it in an
    // interactive transaction, which isn't supported in HTTP mode.
    await Promise.all(
      pendingReports.map((report) =>
        prisma.reviewReport.update({ where: { id: report.id }, data: { status: reportStatus } })
      )
    );

    await prisma.moderationAudit.create({
      data: { reviewId, adminId, action, previousStatus, newStatus, reason },
    });

    const reviewLink = `/reviews/${review.id}`;

    // The author only hears about REMOVE_REVIEW/WARN_AUTHOR — a dismissed
    // report took no action against them, so they aren't notified.
    if (action === "REMOVE_REVIEW") {
      await createNotification({
        recipientId: review.reviewerId,
        type: "REVIEW_REMOVED",
        title: "Review Removed",
        message: "Your review was removed by an administrator.",
        link: reviewLink,
        relatedEntityId: review.id,
        emailParams: { gigTitle: review.gig.title, reason },
      });
    } else if (action === "WARN_AUTHOR") {
      await createNotification({
        recipientId: review.reviewerId,
        type: "ACCOUNT_WARNING",
        // Deviates slightly from the spec's generic placeholder text — there's
        // no separate "notification detail" screen to view the reason on, so
        // it's included directly here instead.
        title: "Account Warning",
        message: `You received an account warning. Reason: ${reason}`,
        emailParams: { reason },
      });
    }

    // REMOVE_REVIEW and WARN_AUTHOR both took action on the report, so the
    // reporter is told it was RESOLVED; DISMISS_REPORT took no action, so
    // they're told it was DISMISSED.
    const reporterNotificationType = action === "DISMISS_REPORT" ? "REPORT_DISMISSED" : "REPORT_RESOLVED";
    const reporterTitle = action === "DISMISS_REPORT" ? "Report Dismissed" : "Report Resolved";
    const reporterMessage =
      action === "DISMISS_REPORT"
        ? "Your review report was dismissed by an administrator."
        : "An administrator reviewed your reported review.";

    await Promise.all(
      pendingReports.map((report) =>
        createNotification({
          recipientId: report.reporterId,
          type: reporterNotificationType,
          title: reporterTitle,
          message: reporterMessage,
          link: reviewLink,
          relatedEntityId: review.id,
          emailParams: { reason },
        })
      )
    );

    const updated = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
    res.json({ review: updated });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}
