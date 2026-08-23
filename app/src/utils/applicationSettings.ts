import type { ApplicationMode, ApplicationRequirements, QuestionType } from "../types";

export const MAX_CUSTOM_QUESTIONS = 5;

export const APPLICATION_MODE_OPTIONS: {
  value: ApplicationMode;
  label: string;
  description: string;
  suitedFor: string;
}[] = [
  {
    value: "QUICK_APPLY",
    label: "Quick Apply",
    description: "Fast application for temporary and short-term work.",
    suitedFor: "Catering, event helpers, temporary workers, 1-3 day jobs",
  },
  {
    value: "STANDARD",
    label: "Standard",
    description: "Balanced application for part-time or general work.",
    suitedFor: "Part-time jobs, tutors, shop assistants, medium-term work",
  },
  {
    value: "PROFESSIONAL",
    label: "Professional",
    description: "Detailed application for full-time or professional jobs.",
    suitedFor: "Full-time, software, office and professional positions",
  },
];

export const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "YES_NO", label: "Yes / No" },
  { value: "TEXT", label: "Text Answer" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
];

const PRESETS: Record<ApplicationMode, ApplicationRequirements> = {
  QUICK_APPLY: {
    requireCV: false,
    requireCoverLetter: false,
    requireExperience: true,
    requireAvailability: true,
    requireTransportation: true,
    requirePortfolio: false,
    requireExpectedSalary: false,
    requireShortMessage: true,
  },
  STANDARD: {
    requireCV: false,
    requireCoverLetter: false,
    requireExperience: true,
    requireAvailability: true,
    requireTransportation: false,
    requirePortfolio: false,
    requireExpectedSalary: true,
    requireShortMessage: true,
  },
  PROFESSIONAL: {
    requireCV: true,
    requireCoverLetter: true,
    requireExperience: true,
    requireAvailability: true,
    requireTransportation: false,
    requirePortfolio: false,
    requireExpectedSalary: true,
    requireShortMessage: false,
  },
};

export function getDefaultRequirements(mode: ApplicationMode): ApplicationRequirements {
  return { ...PRESETS[mode] };
}

export const REQUIREMENT_FIELDS: { key: keyof ApplicationRequirements; label: string }[] = [
  { key: "requireAvailability", label: "Availability" },
  { key: "requireExperience", label: "Previous Experience" },
  { key: "requireCV", label: "CV / Resume" },
  { key: "requireCoverLetter", label: "Cover Letter" },
  { key: "requireTransportation", label: "Transportation" },
  { key: "requirePortfolio", label: "Portfolio" },
  { key: "requireExpectedSalary", label: "Expected Salary / Rate" },
  { key: "requireShortMessage", label: "Short Message" },
];
