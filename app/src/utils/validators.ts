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

export const gigPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.enum(["retail", "hospitality", "delivery", "events", "general"]),
  location: z.string().min(3, "Location is required"),
  wage: z.coerce.number().min(1, "Wage must be greater than 0"),
  wageType: z.enum(["hour", "day", "fixed"]),
  requiredSkills: z.string().min(3, "Please list at least one skill"),
  startDate: z.string().min(1, "Start date is required"),
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
