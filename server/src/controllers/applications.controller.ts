import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { SubmitApplicationInput } from "../validators/application.validator";

interface RequirementsShape {
  requireCV: boolean;
  requireCoverLetter: boolean;
  requireExperience: boolean;
  requireAvailability: boolean;
  requireTransportation: boolean;
  requirePortfolio: boolean;
  requireExpectedSalary: boolean;
  requireShortMessage: boolean;
}

interface StoredQuestion {
  id?: string;
  question: string;
  type: "YES_NO" | "TEXT" | "MULTIPLE_CHOICE";
  required: boolean;
  options?: string[];
}

// Must stay in sync with the STANDARD preset in app/src/utils/applicationSettings.ts
const STANDARD_DEFAULT_REQUIREMENTS: RequirementsShape = {
  requireCV: false,
  requireCoverLetter: false,
  requireExperience: true,
  requireAvailability: true,
  requireTransportation: false,
  requirePortfolio: false,
  requireExpectedSalary: true,
  requireShortMessage: true,
};

function toApplicantGigSummary<T extends { paymentAmount: Prisma.Decimal }>(gig: T) {
  return { ...gig, paymentAmount: Number(gig.paymentAmount) };
}

function toPublicApplication(row: {
  id: string;
  gigPostId: string;
  applicantId: string;
  applicationMode: string;
  status: string;
  experience: string | null;
  availability: string | null;
  transportation: boolean | null;
  shortMessage: string | null;
  cvUrl: string | null;
  coverLetter: string | null;
  portfolioUrl: string | null;
  expectedSalary: Prisma.Decimal | null;
  answers: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    gigId: row.gigPostId,
    applicantId: row.applicantId,
    applicationMode: row.applicationMode,
    status: row.status,
    experience: row.experience ?? undefined,
    availability: row.availability ?? undefined,
    transportation: row.transportation ?? undefined,
    shortMessage: row.shortMessage ?? undefined,
    cvUrl: row.cvUrl ?? undefined,
    coverLetter: row.coverLetter ?? undefined,
    portfolioUrl: row.portfolioUrl ?? undefined,
    expectedSalary: row.expectedSalary !== null ? Number(row.expectedSalary) : undefined,
    answers: row.answers,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validateAgainstRequirements(
  requirements: RequirementsShape,
  questions: StoredQuestion[],
  fields: {
    experience?: string;
    availability?: string;
    transportation?: boolean;
    shortMessage?: string;
    cvUrl?: string;
    coverLetter?: string;
    portfolioUrl?: string;
    expectedSalary?: number;
  },
  answers: { questionId: string; answer: string | boolean | string[] }[]
): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];

  if (requirements.requireExperience && !fields.experience?.trim()) {
    issues.push({ path: "experience", message: "Experience is required." });
  }
  if (requirements.requireAvailability && !fields.availability?.trim()) {
    issues.push({ path: "availability", message: "Availability is required." });
  }
  if (requirements.requireTransportation && typeof fields.transportation !== "boolean") {
    issues.push({ path: "transportation", message: "Please indicate whether you have transportation." });
  }
  if (requirements.requireShortMessage && !fields.shortMessage?.trim()) {
    issues.push({ path: "shortMessage", message: "A short message is required." });
  }
  if (requirements.requireCV && !fields.cvUrl?.trim()) {
    issues.push({ path: "cvUrl", message: "A CV is required." });
  }
  if (requirements.requireCoverLetter && !fields.coverLetter?.trim()) {
    issues.push({ path: "coverLetter", message: "A cover letter is required." });
  }
  if (requirements.requirePortfolio && !fields.portfolioUrl?.trim()) {
    issues.push({ path: "portfolioUrl", message: "A portfolio link is required." });
  }
  if (requirements.requireExpectedSalary && (fields.expectedSalary === undefined || fields.expectedSalary === null)) {
    issues.push({ path: "expectedSalary", message: "Expected pay is required." });
  }

  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));
  questions.forEach((q, index) => {
    if (!q.required) return;
    const key = q.id ?? String(index);
    const answer = answerMap.get(key);
    const missing =
      answer === undefined ||
      answer === null ||
      (typeof answer === "string" && !answer.trim()) ||
      (Array.isArray(answer) && answer.length === 0);
    if (missing) {
      issues.push({ path: `answers.${key}`, message: `Please answer: ${q.question}` });
    }
  });

  return issues;
}

export async function getGigForApplicant(req: Request<{ gigId: string }>, res: Response, next: NextFunction) {
  try {
    const { gigId } = req.params;

    const gig = await prisma.gigPost.findFirst({
      where: { id: gigId, isDeleted: false },
      include: { category: true },
    });

    if (!gig) {
      return next(new HttpError(404, "Gig not found"));
    }

    res.json({ gig: toApplicantGigSummary(gig) });
  } catch (err) {
    next(err);
  }
}

export async function checkApplication(req: Request<{ gigId: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { gigId } = req.params;

    const application = await prisma.application.findUnique({
      where: { gigPostId_applicantId: { gigPostId: gigId, applicantId: userId } },
    });

    res.json({
      applied: !!application,
      application: application ? toPublicApplication(application) : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function submitApplication(
  req: Request<unknown, unknown, SubmitApplicationInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { gigId, answers, ...fields } = req.body;

    const gig = await prisma.gigPost.findFirst({ where: { id: gigId, isDeleted: false } });
    if (!gig) {
      return next(new HttpError(404, "Gig not found"));
    }
    if (gig.status !== "ACTIVE") {
      return next(new HttpError(400, "This gig is not currently accepting applications."));
    }

    const existing = await prisma.application.findUnique({
      where: { gigPostId_applicantId: { gigPostId: gigId, applicantId: userId } },
    });
    if (existing) {
      return next(new HttpError(409, "You have already applied for this gig."));
    }

    const settingsRow = await prisma.applicationSettings.findUnique({ where: { gigPostId: gigId } });
    const applicationMode = settingsRow?.applicationMode ?? "STANDARD";
    const requirements: RequirementsShape = settingsRow
      ? {
          requireCV: settingsRow.requireCV,
          requireCoverLetter: settingsRow.requireCoverLetter,
          requireExperience: settingsRow.requireExperience,
          requireAvailability: settingsRow.requireAvailability,
          requireTransportation: settingsRow.requireTransportation,
          requirePortfolio: settingsRow.requirePortfolio,
          requireExpectedSalary: settingsRow.requireExpectedSalary,
          requireShortMessage: settingsRow.requireShortMessage,
        }
      : STANDARD_DEFAULT_REQUIREMENTS;
    const customQuestions = ((settingsRow?.customQuestions as unknown as StoredQuestion[]) ?? []).filter(Boolean);

    const issues = validateAgainstRequirements(requirements, customQuestions, fields, answers);
    if (issues.length > 0) {
      return res.status(400).json({ error: "Validation failed", issues });
    }

    const application = await prisma.application.create({
      data: {
        gigPostId: gigId,
        applicantId: userId,
        applicationMode,
        status: "PENDING",
        experience: fields.experience,
        availability: fields.availability,
        transportation: fields.transportation,
        shortMessage: fields.shortMessage,
        cvUrl: fields.cvUrl,
        coverLetter: fields.coverLetter,
        portfolioUrl: fields.portfolioUrl,
        expectedSalary: fields.expectedSalary,
        answers: (answers ?? []) as unknown as Prisma.InputJsonValue,
      },
    });

    res.status(201).json({
      message: "Application submitted successfully.",
      application: toPublicApplication(application),
    });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}
