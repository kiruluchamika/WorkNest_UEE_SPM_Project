import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { ApplicationSettingsInput } from "../validators/applicationSettings.validator";

async function getOwnedGig(gigId: string, userId: string) {
  const gig = await prisma.gigPost.findFirst({ where: { id: gigId, isDeleted: false } });

  if (!gig) {
    throw new HttpError(404, "Gig not found");
  }

  if (gig.businessId !== userId) {
    throw new HttpError(403, "You do not have permission to manage this gig's application settings.");
  }

  return gig;
}

function toPublicSettings(row: {
  gigPostId: string;
  applicationMode: string;
  requireCV: boolean;
  requireCoverLetter: boolean;
  requireExperience: boolean;
  requireAvailability: boolean;
  requireTransportation: boolean;
  requirePortfolio: boolean;
  requireExpectedSalary: boolean;
  requireShortMessage: boolean;
  customQuestions: Prisma.JsonValue;
}) {
  return {
    gigId: row.gigPostId,
    applicationMode: row.applicationMode,
    requirements: {
      requireCV: row.requireCV,
      requireCoverLetter: row.requireCoverLetter,
      requireExperience: row.requireExperience,
      requireAvailability: row.requireAvailability,
      requireTransportation: row.requireTransportation,
      requirePortfolio: row.requirePortfolio,
      requireExpectedSalary: row.requireExpectedSalary,
      requireShortMessage: row.requireShortMessage,
    },
    customQuestions: row.customQuestions,
  };
}

export async function getApplicationSettings(
  req: Request<{ gigId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { gigId } = req.params;

    await getOwnedGig(gigId, userId);

    const settings = await prisma.applicationSettings.findUnique({ where: { gigPostId: gigId } });

    res.json({ settings: settings ? toPublicSettings(settings) : null });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

export async function createApplicationSettings(
  req: Request<{ gigId: string }, unknown, ApplicationSettingsInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { gigId } = req.params;
    const { applicationMode, requirements, customQuestions } = req.body;

    await getOwnedGig(gigId, userId);

    const existing = await prisma.applicationSettings.findUnique({ where: { gigPostId: gigId } });
    if (existing) {
      return next(new HttpError(409, "Application settings already exist for this gig."));
    }

    const settings = await prisma.applicationSettings.create({
      data: {
        gigPostId: gigId,
        applicationMode,
        ...requirements,
        customQuestions: customQuestions as unknown as Prisma.InputJsonValue,
      },
    });

    res.status(201).json({ settings: toPublicSettings(settings) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}

export async function updateApplicationSettings(
  req: Request<{ gigId: string }, unknown, ApplicationSettingsInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const { gigId } = req.params;
    const { applicationMode, requirements, customQuestions } = req.body;

    await getOwnedGig(gigId, userId);

    const data = {
      applicationMode,
      ...requirements,
      customQuestions: customQuestions as unknown as Prisma.InputJsonValue,
    };

    const settings = await prisma.applicationSettings.upsert({
      where: { gigPostId: gigId },
      create: { gigPostId: gigId, ...data },
      update: data,
    });

    res.json({ settings: toPublicSettings(settings) });
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(err);
  }
}
