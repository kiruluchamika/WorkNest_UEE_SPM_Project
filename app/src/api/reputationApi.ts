import { http, extractErrorMessage } from "./http";
import type { Review, ReputationSummary, WorkHistoryEntry } from "../types";

export async function getUserReviews(userId: string): Promise<Review[]> {
  try {
    const { data } = await http.get(`/users/${userId}/reviews`);
    return data.reviews;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load reviews."));
  }
}

export async function getUserReputation(userId: string): Promise<ReputationSummary> {
  try {
    const { data } = await http.get(`/users/${userId}/reputation`);
    return data.reputation;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load reputation."));
  }
}

export async function getUserWorkHistory(userId: string): Promise<WorkHistoryEntry[]> {
  try {
    const { data } = await http.get(`/users/${userId}/work-history`);
    return data.workHistory;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load work history."));
  }
}
