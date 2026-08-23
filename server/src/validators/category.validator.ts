import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  description: z.string().trim().min(1).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  description: z.string().trim().min(1).optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const updateCategoryStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateCategoryStatusInput = z.infer<typeof updateCategoryStatusSchema>;
