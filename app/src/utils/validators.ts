import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z.string(),
    role: z.enum(["jobseeker", "shopowner", "verifier"]),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    district: z.string().trim().optional(),
    identityType: z.string().trim().optional(),
    identityNumber: z.string().trim().optional(),
    identityDocumentReference: z.string().trim().optional(),
    identityDocumentReferenceUpload: z.unknown().optional(),
    addressInformation: z.string().trim().optional(),
    communityReference: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }).superRefine((data, ctx) => {
    if (data.role !== "verifier") {
      if (data.phone.length < 9) ctx.addIssue({ code: "custom", path: ["phone"], message: "Please enter a valid phone number" });
      return;
    }
    if (!/^[0-9]{10}$/.test(data.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "Mobile number must be exactly 10 digits." });
    const required = [
      ["district", "District is required"], ["identityType", "ID type is required"],
      ["identityNumber", "ID number is required"],
      ["addressInformation", "Address information is required"],
    ] as const;
    required.forEach(([field, message]) => { if (!data[field]) ctx.addIssue({ code: "custom", path: [field], message }); });
  });

export const verifierReapplicationSchema = z.object({
  district: z.string().trim().min(2, "District is required"),
  identityType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVING_LICENCE"]),
  identityNumber: z.string().trim().min(4, "ID number is required"),
  identityDocumentReference: z.string().trim().optional(),
  identityDocumentReferenceUpload: z.unknown().optional(),
  addressInformation: z.string().trim().min(5, "Address information is required"),
  communityReference: z.string().trim().optional(),
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

// Kept in sync with GIG_LIMITS in server/src/validators/gig.validator.ts.
export const GIG_LIMITS = {
  titleMax: 100,
  descriptionMax: 2000,
  locationMax: 150,
  paymentMax: 1_000_000,
  workersMax: 100,
  skillsMax: 15,
  skillLengthMax: 40,
  contactMax: 100,
} as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s-]{9,15}$/;

const optionalTimeSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || TIME_PATTERN.test(v), { message: "Please enter a valid time." })
  .optional();

function splitSkills(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const gigPostFormSchema = z
  .object({
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
      .number("Please enter a valid amount.")
      .positive("Payment must be greater than 0.")
      .max(GIG_LIMITS.paymentMax, "Payment must be at most Rs. 1,000,000."),
    paymentType: z.enum(["HOURLY", "DAILY", "FIXED"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a start date."),
    startTime: optionalTimeSchema,
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date.")
      .optional()
      .or(z.literal("")),
    endTime: optionalTimeSchema,
    workersNeeded: z.coerce
      .number("Please enter a valid number.")
      .int("Workers needed must be a whole number.")
      .min(1, "Workers needed must be at least 1.")
      .max(GIG_LIMITS.workersMax, `Workers needed must be at most ${GIG_LIMITS.workersMax}.`),
    requiredSkills: z
      .string()
      .optional()
      .refine((v) => splitSkills(v).length <= GIG_LIMITS.skillsMax, {
        message: `You can list at most ${GIG_LIMITS.skillsMax} skills.`,
      })
      .refine((v) => splitSkills(v).every((s) => s.length <= GIG_LIMITS.skillLengthMax), {
        message: `Each skill must be at most ${GIG_LIMITS.skillLengthMax} characters.`,
      }),
    contactInfo: z
      .string()
      .trim()
      .max(GIG_LIMITS.contactMax, `Contact information must be at most ${GIG_LIMITS.contactMax} characters.`)
      .refine((v) => v === "" || EMAIL_PATTERN.test(v) || PHONE_PATTERN.test(v), {
        message: "Enter a valid phone number or email.",
      })
      .optional(),
    imageUrl: imageSourceSchema,
  })
  .superRefine((data, ctx) => {
    // "YYYY-MM-DD" and "HH:mm" strings compare correctly as plain strings.
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date cannot be before the start date." });
    }

    if (data.endTime && !data.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Add a start time before setting an end time." });
      return;
    }

    const endsOnStartDay = !data.endDate || data.endDate === data.startDate;
    if (data.startTime && data.endTime && endsOnStartDay && data.endTime <= data.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after the start time. For overnight work, set an end date.",
      });
    }
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
