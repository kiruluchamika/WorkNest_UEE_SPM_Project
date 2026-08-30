import { http, extractErrorMessage } from "./http";
import type { Review } from "../types";

export interface SubmitReviewPayload {
  revieweeId?: string;
  rating: number;
  comment?: string;
}

export async function submitReview(gigId: string, payload: SubmitReviewPayload): Promise<Review> {
  try {
    const { data } = await http.post(`/gigs/${gigId}/reviews`, payload);
    return data.review;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not submit your review."));
  }
}

export async function reportReview(reviewId: string, reason: string): Promise<void> {
  try {
    await http.post(`/reviews/${reviewId}/report`, { reason });
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not report this review."));
  }
}
