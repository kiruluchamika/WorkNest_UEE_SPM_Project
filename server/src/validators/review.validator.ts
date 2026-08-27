import { z } from "zod";

export const createReviewSchema = z.object({
  revieweeId: z.string().trim().min(1).optional(),
  rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5.").max(5, "Rating must be between 1 and 5."),
  comment: z.string().trim().max(1000, "Comment must be 1000 characters or fewer.").optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reportReviewSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Please describe why you're reporting this review.")
    .max(500, "Reason must be 500 characters or fewer."),
});
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;

export const moderateReviewSchema = z.object({
  action: z.enum(["REMOVE_REVIEW", "DISMISS_REPORT", "WARN_AUTHOR"]),
  reason: z
    .string()
    .trim()
    .min(5, "A moderation reason is required.")
    .max(1000, "Reason must be 1000 characters or fewer."),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
