import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { CreateReviewInput, ReportReviewInput } from "../validators/review.validator";
import { createNotification } from "../services/notification.service";

export async function createReview(
  req: Request<{ gigId: string }, unknown, CreateReviewInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { gigId } = req.params;
    const { rating, comment } = req.body;

    const gig = await prisma.gigPost.findFirst({ where: { id: gigId, isDeleted: false } });
    if (!gig) {
      return next(new HttpError(404, "Gig not found"));
    }

    // Review eligibility is decided per-pair by Application.status, not by
    // GigPost.status: a hired worker's engagement can be individually
    // completed (via PATCH /applications/:id/complete) while the gig itself
    // stays ACTIVE for other hires, and that worker/business pair is
    // review-eligible the moment their own application reaches COMPLETED.
    let revieweeId: string;

    if (userId === gig.businessId) {
      if (!req.body.revieweeId) {
        return next(new HttpError(400, "revieweeId is required when reviewing as the business."));
      }
      revieweeId = req.body.revieweeId;

      const application = await prisma.application.findFirst({
        where: { gigPostId: gigId, applicantId: revieweeId, status: "COMPLETED" },
      });
      if (!application) {
        return next(new HttpError(400, "That user did not complete this gig."));
      }
    } else {
      const application = await prisma.application.findFirst({
        where: { gigPostId: gigId, applicantId: userId, status: "COMPLETED" },
      });
      if (!application) {
        return next(new HttpError(403, "You did not complete this gig."));
      }
      revieweeId = gig.businessId;
    }

    if (revieweeId === userId) {
      return next(new HttpError(400, "You cannot review yourself."));
    }

    const existing = await prisma.review.findUnique({
      where: { gigId_reviewerId_revieweeId: { gigId, reviewerId: userId, revieweeId } },
    });
    if (existing) {
      return next(new HttpError(409, "You have already reviewed this user for this gig."));
    }

    const reviewer = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const review = await prisma.review.create({
      data: { gigId, reviewerId: userId, revieweeId, rating, comment },
    });

    await createNotification({
      recipientId: revieweeId,
      type: "REVIEW_RECEIVED",
      title: "New Review Received",
      message: `You received a new ${rating}-star review for "${gig.title}".`,
      link: `/reviews/${review.id}`,
      relatedEntityId: review.id,
      emailParams: { raterName: reviewer?.name ?? "Someone", rating, gigTitle: gig.title },
    });

    res.status(201).json({ review });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(new HttpError(409, "You have already reviewed this user for this gig."));
    }
    next(err);
  }
}

export async function reportReview(
  req: Request<{ reviewId: string }, unknown, ReportReviewInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return next(new HttpError(404, "Review not found"));
    }
    if (review.status === "REMOVED") {
      return next(new HttpError(400, "This review has already been removed."));
    }
    if (review.reviewerId === userId) {
      return next(new HttpError(400, "You cannot report your own review."));
    }

    const existingReport = await prisma.reviewReport.findFirst({
      where: { reviewId, reporterId: userId, status: "PENDING" },
    });
    if (existingReport) {
      return next(new HttpError(409, "You have already reported this review."));
    }

    await prisma.reviewReport.create({ data: { reviewId, reporterId: userId, reason } });

    if (review.status !== "FLAGGED") {
      await prisma.review.update({ where: { id: reviewId }, data: { status: "FLAGGED" } });
    }

    // Confirms receipt to the reporter; the report itself is already visible
    // to admins via GET /admin/reviews/flagged, so no separate admin
    // notification is created here.
    await createNotification({
      recipientId: userId,
      type: "REVIEW_REPORTED",
      title: "Report Submitted",
      message: "Your review report was submitted successfully.",
      link: `/reviews/${reviewId}`,
      relatedEntityId: reviewId,
    });

    res.status(201).json({ message: "Review reported." });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}
