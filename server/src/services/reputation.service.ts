import { prisma } from "../config/db";

export interface ReputationSummary {
  userId: string;
  averageRating: number | null;
  totalReviews: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export async function computeReputation(userId: string): Promise<ReputationSummary> {
  const where = { revieweeId: userId, status: "PUBLISHED" as const };

  const [aggregate, grouped] = await Promise.all([
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: { rating: true } }),
    prisma.review.groupBy({ by: ["rating"], where, _count: { rating: true } }),
  ]);

  const distribution: ReputationSummary["distribution"] = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const row of grouped) {
    const key = String(row.rating) as keyof typeof distribution;
    if (key in distribution) {
      distribution[key] = row._count.rating;
    }
  }

  return {
    userId,
    averageRating: aggregate._avg.rating !== null ? Math.round(aggregate._avg.rating * 10) / 10 : null,
    totalReviews: aggregate._count.rating,
    distribution,
  };
}
