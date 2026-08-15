export const ROLES: { value: "jobseeker" | "shopowner" | "verifier"; label: string }[] = [
  { value: "jobseeker", label: "Youth Job Seeker" },
  { value: "shopowner", label: "Local Business / Shop Owner" },
  { value: "verifier", label: "Community Verifier" },
];

export const GIG_CATEGORIES: { value: string; label: string }[] = [
  { value: "retail", label: "Retail" },
  { value: "hospitality", label: "Hospitality" },
  { value: "delivery", label: "Delivery" },
  { value: "events", label: "Events" },
  { value: "general", label: "General" },
];

export const GIG_PAYMENT_TYPES: { value: "HOURLY" | "DAILY" | "FIXED"; label: string }[] = [
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "FIXED", label: "Fixed" },
];

export const MIN_PASSWORD_LENGTH = 6;

export const APP_NAME = "WorkNest";
export const APP_TAGLINE = "Trusted community gig board";
