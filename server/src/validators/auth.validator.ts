import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().trim().min(9, "Please enter a valid phone number").optional(),
  role: z.enum(["jobseeker", "shopowner", "verifier"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
