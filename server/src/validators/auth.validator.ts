import { z } from "zod";
import { requireDocument } from "./verificationDocuments";
import { districtSchemaValues } from "../constants/districts";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().optional(),
  role: z.enum(["jobseeker", "shopowner", "verifier"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  district: z.enum(districtSchemaValues, { error: "Please select a supported district" }).optional(),
  identityType: z.string().trim().min(2, "ID type is required").optional(),
  identityNumber: z.string().trim().min(4, "ID number is required").optional(),
  identityDocumentReferenceUpload: z.unknown().optional(),
  identityDocumentReference: z.string().trim().optional(),
  identityDocumentMetadata: z.record(z.string(), z.unknown()).optional(),
  addressInformation: z.string().trim().min(5, "Address information is required").optional(),
  communityReference: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.role !== "verifier") {
    if (data.phone !== undefined && data.phone.trim().length < 9) ctx.addIssue({ code: "custom", path: ["phone"], message: "Please enter a valid phone number" });
    return;
  }
  if (!/^[0-9]{10}$/.test(data.phone || "")) ctx.addIssue({ code: "custom", path: ["phone"], message: "Mobile number must be exactly 10 digits." });
  requireDocument(data, ctx, "identityDocumentReference", "Identity document is required.");
  for (const field of ["district", "identityType", "identityNumber", "addressInformation"] as const) {
    if (!data[field]) ctx.addIssue({ code: "custom", path: [field], message: `${field} is required for verifiers` });
  }
}).transform(data => ({ ...data, phone: data.role === "verifier" ? data.phone : data.phone?.trim() }));

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
