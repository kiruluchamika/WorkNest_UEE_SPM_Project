import { z } from "zod";

const answerSchema = z.object({
  questionId: z.string().trim().min(1),
  question: z.string().trim().optional(),
  answer: z.union([z.string(), z.boolean(), z.array(z.string())]),
});

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "URL must start with http:// or https://.",
  });

export const submitApplicationSchema = z.object({
  gigId: z.string().trim().min(1, "gigId is required."),
  experience: z.string().trim().min(1).max(2000).optional(),
  availability: z.string().trim().min(1).max(500).optional(),
  transportation: z.boolean().optional(),
  shortMessage: z.string().trim().min(1).max(500).optional(),
  cvUrl: httpUrlSchema.optional(),
  coverLetter: z.string().trim().min(1).max(3000).optional(),
  portfolioUrl: httpUrlSchema.optional(),
  expectedSalary: z.coerce.number().min(0, "Expected pay must be zero or greater.").optional(),
  answers: z.array(answerSchema).max(5).optional().default([]),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
