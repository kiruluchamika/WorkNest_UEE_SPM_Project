import { Request, Response, NextFunction } from "express";
import { Prisma, ApplicationStatus } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { SubmitApplicationInput } from "../validators/application.validator";
import { canTransitionApplicationStatus, getStatusesThatCanTransitionTo } from "../utils/applicationStatus";

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

interface SubmittedAnswer {
  questionId: string;
  answer: string | boolean | string[];
}

interface NormalizedAnswer extends SubmittedAnswer {
  question: string;
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

interface ApplicationRow {
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
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toPublicApplication(row: ApplicationRow) {
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
    completedAt: row.completedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toGigSummary<T extends { paymentAmount: Prisma.Decimal }>(gig: T) {
  return { ...gig, paymentAmount: Number(gig.paymentAmount) };
}

async function toGigSummaryWithFilledPositions<T extends { id: string; paymentAmount: Prisma.Decimal }>(gig: T) {
  return {
    ...toGigSummary(gig),
    filledPositions: await countFilledPositions(prisma, gig.id),
  };
}

const APPLICANT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  location: true,
  trustScore: true,
} as const;

async function getOwnedGigForApplications(gigId: string, userId: string) {
  const gig = await prisma.gigPost.findFirst({ where: { id: gigId, isDeleted: false } });

  if (!gig) {
    throw new HttpError(404, "Gig not found");
  }
  if (gig.businessId !== userId) {
    throw new HttpError(403, "You do not have permission to manage applications for this gig.");
  }

  return gig;
}

async function countFilledPositions(
  client: typeof prisma | Prisma.TransactionClient,
  gigPostId: string
): Promise<number> {
  return client.application.count({
    where: {
      gigPostId,
      status: { in: [ApplicationStatus.HIRED, ApplicationStatus.COMPLETED] },
    },
  });
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
  answers: SubmittedAnswer[]
): { issues: { path: string; message: string }[]; normalizedAnswers: NormalizedAnswer[] } {
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

  const questionsById = new Map(
    questions.map((q, index) => [q.id ?? String(index), q])
  );
  const answerMap = new Map<string, SubmittedAnswer>();

  answers.forEach((answer, index) => {
    if (answerMap.has(answer.questionId)) {
      issues.push({
        path: `answers.${answer.questionId}`,
        message: "Please answer each screening question only once.",
      });
      return;
    }

    const question = questionsById.get(answer.questionId);
    if (!question) {
      issues.push({
        path: `answers.${index}`,
        message: "One of your screening answers no longer matches this gig's questions.",
      });
      return;
    }

    if (question.type === "YES_NO" && typeof answer.answer !== "boolean") {
      issues.push({ path: `answers.${answer.questionId}`, message: `Please answer yes or no: ${question.question}` });
      return;
    }

    if (question.type === "TEXT" && (typeof answer.answer !== "string" || !answer.answer.trim())) {
      issues.push({ path: `answers.${answer.questionId}`, message: `Please answer: ${question.question}` });
      return;
    }

    if (question.type === "MULTIPLE_CHOICE") {
      const options = question.options ?? [];
      const selected = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
      const invalid =
        selected.length === 0 ||
        selected.some((value) => typeof value !== "string" || !options.includes(value));

      if (invalid) {
        issues.push({
          path: `answers.${answer.questionId}`,
          message: `Please choose one of the available options for: ${question.question}`,
        });
        return;
      }
    }

    answerMap.set(answer.questionId, answer);
  });

  questions.forEach((q, index) => {
    if (!q.required) return;
    const key = q.id ?? String(index);
    const answer = answerMap.get(key)?.answer;
    const missing =
      answer === undefined ||
      answer === null ||
      (typeof answer === "string" && !answer.trim()) ||
      (Array.isArray(answer) && answer.length === 0);
    if (missing) {
      issues.push({ path: `answers.${key}`, message: `Please answer: ${q.question}` });
    }
  });

  const normalizedAnswers = Array.from(answerMap.entries()).map(([questionId, answer]) => {
    const question = questionsById.get(questionId);
    return {
      questionId,
      question: question?.question ?? answer.questionId,
      answer: answer.answer,
    };
  });

  return { issues, normalizedAnswers };
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

    const filledPositions = await countFilledPositions(prisma, gigId);
    if (filledPositions >= gig.workersNeeded) {
      return next(new HttpError(400, "This gig has already filled all available positions."));
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

    const { issues, normalizedAnswers } = validateAgainstRequirements(
      requirements,
      customQuestions,
      fields,
      answers
    );
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
        answers: normalizedAnswers as unknown as Prisma.InputJsonValue,
      },
    });

    res.status(201).json({
      message: "Application submitted successfully.",
      application: toPublicApplication(application),
    });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(new HttpError(409, "You have already applied for this gig."));
    }
    next(err);
  }
}

// ---- Youth: My Applications / Application Details / Withdraw ----

export async function listMyApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;

    const applications = await prisma.application.findMany({
      where: { applicantId: userId },
      include: { gigPost: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      applications: applications.map((a) => ({
        ...toPublicApplication(a),
        gig: toGigSummary(a.gigPost),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getApplicationById(
  req: Request<{ applicationId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { applicationId } = req.params;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        gigPost: { include: { category: true } },
        applicant: { select: APPLICANT_SELECT },
      },
    });

    if (!application) {
      return next(new HttpError(404, "Application not found"));
    }

    const isApplicant = application.applicantId === userId;
    const isGigOwner = application.gigPost.businessId === userId;

    if (!isApplicant && !isGigOwner) {
      return next(new HttpError(403, "You do not have permission to view this application."));
    }

    res.json({
      application: {
        ...toPublicApplication(application),
        gig: await toGigSummaryWithFilledPositions(application.gigPost),
        applicant: isGigOwner ? application.applicant : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function withdrawApplication(
  req: Request<{ applicationId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { applicationId } = req.params;

    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) {
      return next(new HttpError(404, "Application not found"));
    }
    if (application.applicantId !== userId) {
      return next(new HttpError(403, "You do not have permission to withdraw this application."));
    }
    if (!canTransitionApplicationStatus(application.status, ApplicationStatus.WITHDRAWN)) {
      return next(
        new HttpError(400, `An application with status ${application.status} can no longer be withdrawn.`)
      );
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: "WITHDRAWN" },
    });

    res.json({ message: "Application withdrawn successfully.", application: toPublicApplication(updated) });
  } catch (err) {
    next(err);
  }
}

// ---- Business: Gig Applicants / Shortlist / Reject / Hire / Complete ----

export async function listGigApplicants(req: Request<{ gigId: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { gigId } = req.params;

    await getOwnedGigForApplications(gigId, userId);

    const applications = await prisma.application.findMany({
      where: { gigPostId: gigId },
      include: { applicant: { select: APPLICANT_SELECT } },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      applications: applications.map((a) => ({
        ...toPublicApplication(a),
        applicant: a.applicant,
      })),
    });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

async function transitionApplicationAsGigOwner(
  applicationId: string,
  userId: string,
  targetStatus: ApplicationStatus,
  client: typeof prisma | Prisma.TransactionClient = prisma
) {
  const application = await client.application.findUnique({
    where: { id: applicationId },
    include: { gigPost: true },
  });

  if (!application) {
    throw new HttpError(404, "Application not found");
  }
  if (application.gigPost.businessId !== userId) {
    throw new HttpError(403, "You do not have permission to manage this application.");
  }
  if (!canTransitionApplicationStatus(application.status, targetStatus)) {
    throw new HttpError(
      400,
      `This application is ${application.status} and cannot be moved to ${targetStatus}.`
    );
  }

  return application;
}

export async function shortlistApplication(
  req: Request<{ applicationId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { applicationId } = req.params;

    await transitionApplicationAsGigOwner(applicationId, userId, ApplicationStatus.SHORTLISTED);

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: "SHORTLISTED" },
    });

    res.json({ message: "Applicant shortlisted.", application: toPublicApplication(updated) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

export async function rejectApplication(
  req: Request<{ applicationId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { applicationId } = req.params;

    await transitionApplicationAsGigOwner(applicationId, userId, ApplicationStatus.REJECTED);

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: "REJECTED" },
    });

    res.json({ message: "Applicant rejected.", application: toPublicApplication(updated) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

export async function hireApplication(
  req: Request<{ applicationId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { applicationId } = req.params;

    const application = await transitionApplicationAsGigOwner(
      applicationId,
      userId,
      ApplicationStatus.HIRED
    );

    const filledPositions = await countFilledPositions(prisma, application.gigPostId);
    if (filledPositions >= application.gigPost.workersNeeded) {
      return next(new HttpError(400, "All positions for this gig have already been filled."));
    }

    // The Neon HTTP adapter (see config/db.ts) has no session support, so this
    // can't run inside an interactive prisma.$transaction(). Instead, close
    // the race window between the check above and this write with a single
    // conditional UPDATE that re-verifies the status transition and the
    // filled-position count against the live row in one atomic statement.
    const sourceStatuses = getStatusesThatCanTransitionTo(ApplicationStatus.HIRED);
    const affected = await prisma.$executeRaw`
      UPDATE "Application" AS a
      SET status = 'HIRED', "updatedAt" = now()
      WHERE a.id = ${applicationId}
        AND a.status::text IN (${Prisma.join(sourceStatuses)})
        AND (
          SELECT COUNT(*) FROM "Application" a2
          WHERE a2."gigPostId" = a."gigPostId"
            AND a2.status IN ('HIRED', 'COMPLETED')
        ) < (SELECT "workersNeeded" FROM "GigPost" WHERE id = a."gigPostId")
    `;

    if (affected === 0) {
      return next(new HttpError(400, "All positions for this gig have already been filled."));
    }

    const updated = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!updated) {
      return next(new HttpError(404, "Application not found"));
    }

    // Note: GigPost.status has no "FILLED"/"OPEN" equivalent in the current
    // schema (PENDING/ACTIVE/REJECTED/CLOSED/COMPLETED), so hiring does not
    // change the Gig's own status here. See final summary for details.

    res.json({ message: "Applicant hired.", application: toPublicApplication(updated) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

export async function completeApplication(
  req: Request<{ applicationId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { applicationId } = req.params;

    await transitionApplicationAsGigOwner(applicationId, userId, ApplicationStatus.COMPLETED);

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    res.json({ message: "Application marked as completed.", application: toPublicApplication(updated) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}
