import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string().min(9, "Please enter a valid phone number"),
    role: z.enum(["jobseeker", "shopowner", "verifier"]),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Accepts either an http(s) URL or a base64 data URI (from the device image picker).
const imageSourceSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//.test(v) || /^data:image\//.test(v), {
    message: "Please attach a valid image.",
  })
  .optional()
  .or(z.literal(""));

export const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

export const gigPostFormSchema = z.object({
  title: z.string().trim().min(1, "Gig title is required."),
  categoryId: z.string().trim().min(1, "Please select a category."),
  description: z.string().trim().min(20, "Description must be at least 20 characters."),
  location: z.string().trim().min(1, "Location is required."),
  paymentAmount: z.coerce.number().positive("Payment must be greater than 0."),
  paymentType: z.enum(["HOURLY", "DAILY", "FIXED"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date."),
  startTime: z.string().trim().optional().or(z.literal("")),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date.")
    .optional()
    .or(z.literal("")),
  endTime: z.string().trim().optional().or(z.literal("")),
  workersNeeded: z.coerce.number().int().min(1, "Workers needed must be at least 1."),
  requiredSkills: z.string().optional(),
  contactInfo: z.string().trim().optional(),
  imageUrl: imageSourceSchema,
});

export const profileFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  phone: z.string().trim().optional().or(z.literal("")),
  bio: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().optional().or(z.literal("")),
  avatarUrl: imageSourceSchema,
});

export const applicationSchema = z.object({
  message: z.string().min(20, "Please write at least 20 characters"),
});

export const endorsementSchema = z.object({
  jobSeekerId: z.string().min(1, "Select a job seeker"),
  skill: z.string().min(2, "Skill is required"),
  note: z.string().min(10, "Please write a short endorsement note"),
});

export const ratingSchema = z.object({
  score: z.number().min(1).max(5),
  comment: z.string().min(5, "Please add a short comment"),
});
