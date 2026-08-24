import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().trim().min(9, "Please enter a valid phone number").optional(),
  role: z.enum(["jobseeker", "shopowner", "verifier"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Accepts either an http(s) URL or a base64 data URI (uploaded from the device).
const imageSourceSchema = z
  .string()
  .trim()
  .refine((v) => /^https?:\/\//.test(v) || /^data:image\//.test(v), {
    message: "Please attach a valid image.",
  });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().trim().min(1).optional(),
  bio: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  avatarUrl: imageSourceSchema.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
