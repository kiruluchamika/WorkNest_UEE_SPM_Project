import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().trim().min(9, "Please enter a valid phone number").optional(),
  role: z.enum(["jobseeker", "shopowner", "verifier"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  district: z.string().trim().min(2, "District is required").optional(),
  identityType: z.string().trim().min(2, "ID type is required").optional(),
  identityNumber: z.string().trim().min(4, "ID number is required").optional(),
  identityDocumentReference: z.string().trim().optional(),
  identityDocumentMetadata: z.record(z.string(), z.unknown()).optional(),
  addressInformation: z.string().trim().min(5, "Address information is required").optional(),
  communityReference: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.role !== "verifier") return;
  for (const field of ["district", "identityType", "identityNumber", "addressInformation"] as const) {
    if (!data[field]) ctx.addIssue({ code: "custom", path: [field], message: `${field} is required for verifiers` });
  }
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
