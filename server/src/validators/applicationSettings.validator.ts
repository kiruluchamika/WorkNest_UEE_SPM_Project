import { z } from "zod";

export const applicationModeEnum = z.enum(["QUICK_APPLY", "STANDARD", "PROFESSIONAL"]);
export const questionTypeEnum = z.enum(["YES_NO", "TEXT", "MULTIPLE_CHOICE"]);

const questionSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    question: z.string().trim().min(1, "Question text is required."),
    type: questionTypeEnum,
    required: z.boolean(),
    options: z.array(z.string().trim().min(1, "Options cannot be empty.")).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "MULTIPLE_CHOICE" && (!data.options || data.options.length < 2)) {
      ctx.addIssue({
        code: "custom",
        message: "Multiple choice questions need at least 2 options.",
        path: ["options"],
      });
    }
  });

export const applicationSettingsSchema = z.object({
  applicationMode: applicationModeEnum,
  requirements: z.object({
    requireCV: z.boolean(),
    requireCoverLetter: z.boolean(),
    requireExperience: z.boolean(),
    requireAvailability: z.boolean(),
    requireTransportation: z.boolean(),
    requirePortfolio: z.boolean(),
    requireExpectedSalary: z.boolean(),
    requireShortMessage: z.boolean(),
  }),
  customQuestions: z.array(questionSchema).max(5, "You can add up to 5 screening questions."),
});

export type ApplicationSettingsInput = z.infer<typeof applicationSettingsSchema>;
