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

export const WAGE_TYPES: { value: "hour" | "day" | "fixed"; label: string }[] = [
  { value: "hour", label: "Per hour" },
  { value: "day", label: "Per day" },
  { value: "fixed", label: "Fixed amount" },
];

export const MIN_PASSWORD_LENGTH = 6;

export const APP_NAME = "WorkNest";
export const APP_TAGLINE = "Trusted community gig board";
