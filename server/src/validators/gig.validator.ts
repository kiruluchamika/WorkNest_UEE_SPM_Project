import { z } from "zod";

export const createGigPostSchema = z.object({
  title: z.string().trim().min(1, "Gig title is required."),
  categoryId: z.string().trim().min(1, "Please select a category."),
  description: z.string().trim().min(20, "Description must be at least 20 characters."),
  location: z.string().trim().min(1, "Location is required."),
  paymentAmount: z.coerce.number().positive("Payment must be greater than 0."),
  paymentType: z.enum(["HOURLY", "DAILY", "FIXED"]),
  startDate: z.coerce.date({ message: "Please enter a valid date." }),
  startTime: z.string().trim().min(1).optional(),
  endDate: z.coerce.date().optional(),
  endTime: z.string().trim().min(1).optional(),
  workersNeeded: z.coerce.number().int().min(1, "Workers needed must be at least 1."),
  requiredSkills: z.array(z.string().trim().min(1)).optional(),
  contactInfo: z.string().trim().min(1).optional(),
  imageUrl: z.string().trim().url("Please enter a valid image URL.").optional(),
});

export type CreateGigPostInput = z.infer<typeof createGigPostSchema>;

export const updateGigPostSchema = createGigPostSchema.partial();

export type UpdateGigPostInput = z.infer<typeof updateGigPostSchema>;

export const rejectGigSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a meaningful rejection reason."),
});

export type RejectGigInput = z.infer<typeof rejectGigSchema>;
