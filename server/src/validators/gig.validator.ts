import { z } from "zod";

export const GIG_LIMITS = {
  titleMax: 100,
  descriptionMax: 2000,
  locationMax: 150,
  paymentMax: 1_000_000,
  workersMax: 100,
  skillsMax: 15,
  skillLengthMax: 40,
  contactMax: 100,
  // ~1.5 MB of image data once base64 is decoded; photos are compressed on the device first.
  imageDataUriMax: 2_000_000,
} as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s-]{9,15}$/;
const SRI_LANKA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Accepts either an http(s) URL or a base64 data URI (uploaded from the device).
const imageSourceSchema = z
  .string()
  .trim()
  .refine((v) => /^https?:\/\//.test(v) || /^data:image\//.test(v), {
    message: "Please attach a valid image.",
  })
  .refine((v) => v.length <= GIG_LIMITS.imageDataUriMax, {
    message: "Image is too large. Please choose a smaller photo.",
  });

const timeSchema = z.string().trim().regex(TIME_PATTERN, "Please enter a valid time (HH:mm).");

const contactInfoSchema = z
  .string()
  .trim()
  .min(1)
  .max(GIG_LIMITS.contactMax, `Contact information must be at most ${GIG_LIMITS.contactMax} characters.`)
  .refine((v) => EMAIL_PATTERN.test(v) || PHONE_PATTERN.test(v), {
    message: "Contact information must be a valid phone number or email.",
  });

const gigPostFields = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Gig title is required.")
    .max(GIG_LIMITS.titleMax, `Gig title must be at most ${GIG_LIMITS.titleMax} characters.`),
  categoryId: z.string().trim().min(1, "Please select a category."),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters.")
    .max(GIG_LIMITS.descriptionMax, `Description must be at most ${GIG_LIMITS.descriptionMax} characters.`),
  location: z
    .string()
    .trim()
    .min(1, "Location is required.")
    .max(GIG_LIMITS.locationMax, `Location must be at most ${GIG_LIMITS.locationMax} characters.`),
  paymentAmount: z.coerce
    .number()
    .positive("Payment must be greater than 0.")
    .max(GIG_LIMITS.paymentMax, `Payment must be at most Rs. ${GIG_LIMITS.paymentMax.toLocaleString("en-US")}.`),
  paymentType: z.enum(["HOURLY", "DAILY", "FIXED"]),
  startDate: z.coerce.date({ message: "Please enter a valid date." }),
  startTime: timeSchema.optional(),
  endDate: z.coerce.date({ message: "Please enter a valid date." }).optional(),
  endTime: timeSchema.optional(),
  workersNeeded: z.coerce
    .number()
    .int()
    .min(1, "Workers needed must be at least 1.")
    .max(GIG_LIMITS.workersMax, `Workers needed must be at most ${GIG_LIMITS.workersMax}.`),
  requiredSkills: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(GIG_LIMITS.skillLengthMax, `Each skill must be at most ${GIG_LIMITS.skillLengthMax} characters.`)
    )
    .max(GIG_LIMITS.skillsMax, `You can list at most ${GIG_LIMITS.skillsMax} skills.`)
    .optional(),
  contactInfo: contactInfoSchema.optional(),
  imageUrl: imageSourceSchema.optional(),
});

export interface GigSchedule {
  startDate?: Date | null;
  startTime?: string | null;
  endDate?: Date | null;
  endTime?: string | null;
}

export interface GigScheduleIssue {
  path: "endDate" | "endTime";
  message: string;
}

// Date-only values arrive as "YYYY-MM-DD" and are stored as UTC midnight, so
// "today" is the Sri Lanka calendar day expressed the same way.
export function isBeforeTodayInSriLanka(date: Date): boolean {
  const nowInSriLanka = new Date(Date.now() + SRI_LANKA_OFFSET_MS);
  const today = Date.UTC(
    nowInSriLanka.getUTCFullYear(),
    nowInSriLanka.getUTCMonth(),
    nowInSriLanka.getUTCDate()
  );
  return date.getTime() < today;
}

// Shared by create (inside the schema) and update (in the controller, against
// the stored gig merged with the incoming changes).
export function findScheduleIssue(schedule: GigSchedule): GigScheduleIssue | null {
  const { startDate, startTime, endDate, endTime } = schedule;

  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return { path: "endDate", message: "End date cannot be before the start date." };
  }

  if (endTime && !startTime) {
    return { path: "endTime", message: "Add a start time before setting an end time." };
  }

  const endsOnStartDay = !endDate || (startDate ? endDate.getTime() === startDate.getTime() : false);
  if (startTime && endTime && endsOnStartDay && endTime <= startTime) {
    return {
      path: "endTime",
      message: "End time must be after the start time. For overnight work, set an end date.",
    };
  }

  return null;
}

export const createGigPostSchema = gigPostFields.superRefine((data, ctx) => {
  if (isBeforeTodayInSriLanka(data.startDate)) {
    ctx.addIssue({ code: "custom", path: ["startDate"], message: "Start date cannot be in the past." });
  }

  const issue = findScheduleIssue(data);
  if (issue) {
    ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message });
  }
});

export type CreateGigPostInput = z.infer<typeof createGigPostSchema>;

// Optional fields accept null on update so the business can clear them.
export const updateGigPostSchema = gigPostFields.partial().extend({
  startTime: timeSchema.nullable().optional(),
  endDate: z.coerce.date({ message: "Please enter a valid date." }).nullable().optional(),
  endTime: timeSchema.nullable().optional(),
  contactInfo: contactInfoSchema.nullable().optional(),
  imageUrl: imageSourceSchema.nullable().optional(),
});

export type UpdateGigPostInput = z.infer<typeof updateGigPostSchema>;

export const rejectGigSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Please provide a meaningful rejection reason.")
    .max(500, "Rejection reason must be at most 500 characters."),
});

export type RejectGigInput = z.infer<typeof rejectGigSchema>;
