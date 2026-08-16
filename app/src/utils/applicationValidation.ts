import type { ApplicationQuestion, ApplicationRequirements, SubmitApplicationPayload } from "../types";

export interface ApplicationFormValues {
  experience: string;
  availability: string;
  transportation: boolean | null;
  shortMessage: string;
  cvUrl: string;
  coverLetter: string;
  portfolioUrl: string;
  expectedSalary: string;
  answers: Record<string, string | boolean>;
}

export function createEmptyFormValues(): ApplicationFormValues {
  return {
    experience: "",
    availability: "",
    transportation: null,
    shortMessage: "",
    cvUrl: "",
    coverLetter: "",
    portfolioUrl: "",
    expectedSalary: "",
    answers: {},
  };
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateApplicationForm(
  requirements: ApplicationRequirements,
  questions: ApplicationQuestion[],
  values: ApplicationFormValues
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (requirements.requireExperience && !values.experience.trim()) {
    errors.experience = "Please describe your experience.";
  }
  if (requirements.requireAvailability && !values.availability.trim()) {
    errors.availability = "Please provide your availability.";
  }
  if (requirements.requireTransportation && values.transportation === null) {
    errors.transportation = "Please select Yes or No.";
  }
  if (requirements.requireShortMessage && !values.shortMessage.trim()) {
    errors.shortMessage = "Please write a short message.";
  }
  if (requirements.requireCoverLetter && !values.coverLetter.trim()) {
    errors.coverLetter = "Please write a cover letter.";
  }
  if (requirements.requirePortfolio && !values.portfolioUrl.trim()) {
    errors.portfolioUrl = "Please provide a portfolio link.";
  }

  if (requirements.requireCV && !values.cvUrl.trim()) {
    errors.cvUrl = "Please provide your CV.";
  }
  if (values.cvUrl.trim() && !isValidUrl(values.cvUrl.trim())) {
    errors.cvUrl = "Enter a valid URL.";
  }
  if (values.portfolioUrl.trim() && !isValidUrl(values.portfolioUrl.trim())) {
    errors.portfolioUrl = "Enter a valid URL.";
  }

  const trimmedSalary = values.expectedSalary.trim();
  if (requirements.requireExpectedSalary && !trimmedSalary) {
    errors.expectedSalary = "Please enter your expected pay.";
  } else if (trimmedSalary && (Number.isNaN(Number(trimmedSalary)) || Number(trimmedSalary) < 0)) {
    errors.expectedSalary = "Enter a valid amount (0 or greater).";
  }

  questions.forEach((q) => {
    if (!q.required || !q.id) return;
    const key = `question_${q.id}`;
    const answer = values.answers[q.id];
    if (q.type === "YES_NO") {
      if (typeof answer !== "boolean") errors[key] = "Please answer this question.";
    } else if (typeof answer !== "string" || !answer.trim()) {
      errors[key] = "Please answer this question.";
    }
  });

  return errors;
}

export function buildApplicationPayload(
  gigId: string,
  questions: ApplicationQuestion[],
  values: ApplicationFormValues
): SubmitApplicationPayload {
  const payload: SubmitApplicationPayload = { gigId, answers: [] };

  if (values.experience.trim()) payload.experience = values.experience.trim();
  if (values.availability.trim()) payload.availability = values.availability.trim();
  if (values.transportation !== null) payload.transportation = values.transportation;
  if (values.shortMessage.trim()) payload.shortMessage = values.shortMessage.trim();
  if (values.cvUrl.trim()) payload.cvUrl = values.cvUrl.trim();
  if (values.coverLetter.trim()) payload.coverLetter = values.coverLetter.trim();
  if (values.portfolioUrl.trim()) payload.portfolioUrl = values.portfolioUrl.trim();
  if (values.expectedSalary.trim()) payload.expectedSalary = Number(values.expectedSalary.trim());

  payload.answers = questions
    .filter((q): q is ApplicationQuestion & { id: string } => {
      if (!q.id) return false;
      const answer = values.answers[q.id];
      return answer !== undefined && answer !== "";
    })
    .map((q) => ({ questionId: q.id, question: q.question, answer: values.answers[q.id] }));

  return payload;
}
