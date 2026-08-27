import { http, extractErrorMessage } from "./http";
import type { FlaggedReview, ModerationAction, Review } from "../types";

export async function listFlaggedReviews(): Promise<FlaggedReview[]> {
  try {
    const { data } = await http.get("/admin/reviews/flagged");
    return data.reviews;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load flagged reviews."));
  }
}

export async function moderateReview(
  reviewId: string,
  action: ModerationAction,
  reason: string
): Promise<Review> {
  try {
    const { data } = await http.patch(`/admin/reviews/${reviewId}/moderate`, { action, reason });
    return data.review;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not moderate this review."));
  }
}
