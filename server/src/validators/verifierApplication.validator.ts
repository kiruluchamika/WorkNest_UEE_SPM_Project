import { z } from "zod";
import { districtSchemaValues } from "../constants/districts";

export const rejectVerifierApplicationSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a meaningful rejection reason."),
});

export const suspendVerifierApplicationSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a meaningful suspension reason."),
});

export const verifierReapplicationSchema = z.object({
  district: z.enum(districtSchemaValues, { error: "Please select a supported district" }),
  identityType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVING_LICENCE"]),
  identityNumber: z.string().trim().min(4, "ID number is required"),
  identityDocumentReferenceUpload: z.unknown().optional(),
  identityDocumentReference: z.string().trim().optional(),
  identityDocumentMetadata: z.record(z.string(), z.unknown()).optional(),
  addressInformation: z.string().trim().min(5, "Address information is required"),
  communityReference: z.string().trim().optional(),
});

export const reactivationRequestSchema = z.object({
  explanation: z.string().trim().min(10, "Please provide a meaningful reactivation explanation."),
  attachmentReferenceUpload: z.unknown().optional(),
  attachmentReference: z.string().trim().max(500, "Attachment reference is too long.").optional(),
  attachmentMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const rejectReactivationRequestSchema = z.object({
  reason: z.string().trim().min(5, "Please provide a meaningful rejection reason."),
});

export type RejectVerifierApplicationInput = z.infer<typeof rejectVerifierApplicationSchema>;
export type SuspendVerifierApplicationInput = z.infer<typeof suspendVerifierApplicationSchema>;
export type VerifierReapplicationInput = z.infer<typeof verifierReapplicationSchema>;
export type ReactivationRequestInput = z.infer<typeof reactivationRequestSchema>;
export type RejectReactivationRequestInput = z.infer<typeof rejectReactivationRequestSchema>;
