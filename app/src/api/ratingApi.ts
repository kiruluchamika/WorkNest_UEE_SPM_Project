import { mockClient } from "./client";
import type { Rating } from "../types";

let MOCK_RATINGS: Rating[] = [
  {
    id: "rate-1",
    fromUserId: "user-2",
    fromUserName: "Savithri Silva",
    toUserId: "user-1",
    toUserName: "Amal Perera",
    gigId: "gig-1",
    gigTitle: "Weekend Café Assistant",
    score: 5,
    comment: "Amal was reliable and friendly with customers. Would hire again.",
    createdAt: "2026-08-02T08:00:00Z",
  },
];

export async function listRatingsForUser(userId: string): Promise<Rating[]> {
  return mockClient(
    MOCK_RATINGS.filter((r) => r.toUserId === userId)
  ).then((r) => r.data);
}

export async function createRating(payload: Omit<Rating, "id" | "createdAt">): Promise<Rating> {
  const rating: Rating = {
    ...payload,
    id: `rate-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  MOCK_RATINGS = [rating, ...MOCK_RATINGS];
  return mockClient(rating).then((r) => r.data);
}
