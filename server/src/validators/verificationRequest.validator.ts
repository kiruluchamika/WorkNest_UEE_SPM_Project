import { z } from "zod";
import { requireDocument } from "./verificationDocuments";
import { districtSchemaValues } from "../constants/districts";

export const createVerificationRequestSchema = z.object({
  gateExplanation: z.string().trim().max(4000).optional(),
  district: z.enum(districtSchemaValues, { error: "Please select a supported district" }),
  personalInformation: z.string().refine(value => value.trim().length >= 10, "Personal information is required"),
  identityDocumentUpload: z.unknown().optional(),
  identityDocument: z.string().trim().optional().default(""),
  supportingEvidenceUpload: z.unknown().optional(),
  supportingEvidence: z.string().trim().optional(),
  communityReferences: z.string().trim().min(5, "Community references are required"),
}).superRefine((data, ctx) => {
  const phones = [...data.personalInformation.matchAll(/^Phone Number: (.*)$/gm)];
  if (phones.length !== 1 || !/^[0-9]{10}$/.test(phones[0][1])) ctx.addIssue({ code: "custom", path: ["personalInformation"], message: "Mobile number must be exactly 10 digits." });
  const identity = /^(NATIONAL_ID|PASSPORT|DRIVING_LICENCE): ([^\n]+)/.exec(data.identityDocument.replace(/worknest-file:[0-9a-f-]{36}/g, "").trim());
  if (!identity || identity[2].trim().length < 2) ctx.addIssue({ code: "custom", path: ["identityDocument"], message: "Identity document is required." });
  requireDocument(data, ctx, "identityDocument", "Identity document is required.");
}).transform(data => ({ ...data, personalInformation: data.personalInformation.trim() }));
export const availabilitySchema = z.object({ isAvailable: z.boolean() });
export const verifierNoteSchema = z.object({ verifierNote: z.string().trim().min(5, "Verifier note is required") });
export const rejectVerificationSchema = z.object({ verifierNote: z.string().trim().min(5), rejectionReason: z.string().trim().min(5, "A meaningful rejection reason is required") });
export const flagVerificationSchema = z.object({ verifierNote: z.string().trim().min(5), flagReason: z.string().trim().min(5, "A meaningful flag reason is required") });
export const adminFlagOutcomeSchema = z.object({ response: z.string().trim().min(5, "An Admin response is required") });

export const badgeReasonSchema = z.object({ reason: z.string().trim().min(1, "A reason is required.").max(4000) });
