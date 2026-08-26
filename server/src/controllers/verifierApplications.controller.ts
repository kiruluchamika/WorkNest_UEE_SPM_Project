import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { VerifierApplicationStatus } from "@prisma/client";
import { neonSql, prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth.middleware";
import { HttpError } from "../middleware/error.middleware";
import { ReactivationRequestInput, RejectReactivationRequestInput, RejectVerifierApplicationInput, SuspendVerifierApplicationInput, VerifierReapplicationInput } from "../validators/verifierApplication.validator";

const includeApplication = {
  applicant: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
  reviewer: { select: { id: true, name: true, email: true } },
  suspendedBy: { select: { id: true, name: true, email: true } },
  reactivationRequests: {
    orderBy: { createdAt: "desc" as const },
    include: { reviewer: { select: { id: true, name: true, email: true } } },
  },
} as const;

export async function listVerifierApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const rawStatus = String(req.query.status ?? "PENDING");
    if (!Object.values(VerifierApplicationStatus).includes(rawStatus as VerifierApplicationStatus)) {
      return next(new HttpError(400, "Invalid application status."));
    }
    const applications = await prisma.verifierApplication.findMany({
      where: { status: rawStatus as VerifierApplicationStatus }, include: includeApplication,
      orderBy: { submittedAt: rawStatus === "PENDING" ? "asc" : "desc" },
    });
    res.json({ applications });
  } catch (error) { next(error); }
}

export async function getVerifierApplication(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const application = await prisma.verifierApplication.findUnique({ where: { id: req.params.id }, include: includeApplication });
    if (!application) return next(new HttpError(404, "Verifier application not found."));
    res.json({ application });
  } catch (error) { next(error); }
}

export async function approveVerifierApplication(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const updated = await neonSql`
      UPDATE "VerifierApplication"
      SET "status" = 'APPROVED'::"VerifierApplicationStatus",
          "reviewerId" = ${userId},
          "reviewedAt" = ${new Date()},
          "rejectionReason" = NULL
      WHERE "id" = ${req.params.id}
        AND "status" = 'PENDING'::"VerifierApplicationStatus"
      RETURNING "id"
    `;
    if (!updated.length) return next(new HttpError(409, "Only pending applications can be approved."));
    const application = await prisma.verifierApplication.findUnique({ where: { id: req.params.id }, include: includeApplication });
    res.json({ message: "Verifier application approved.", application });
  } catch (error) { next(error); }
}

export async function rejectVerifierApplication(req: Request<{ id: string }, unknown, RejectVerifierApplicationInput>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const updated = await neonSql`
      UPDATE "VerifierApplication"
      SET "status" = 'REJECTED'::"VerifierApplicationStatus",
          "reviewerId" = ${userId},
          "reviewedAt" = ${new Date()},
          "rejectionReason" = ${req.body.reason}
      WHERE "id" = ${req.params.id}
        AND "status" = 'PENDING'::"VerifierApplicationStatus"
      RETURNING "id"
    `;
    if (!updated.length) return next(new HttpError(409, "Only pending applications can be rejected."));
    const application = await prisma.verifierApplication.findUnique({ where: { id: req.params.id }, include: includeApplication });
    res.json({ message: "Verifier application rejected.", application });
  } catch (error) { next(error); }
}

export async function suspendVerifierApplication(req: Request<{ id: string }, unknown, SuspendVerifierApplicationInput>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const updated = await neonSql`
      UPDATE "VerifierApplication"
      SET "status" = 'SUSPENDED'::"VerifierApplicationStatus",
          "suspendedById" = ${userId},
          "suspendedAt" = ${new Date()},
          "suspensionReason" = ${req.body.reason}
      WHERE "id" = ${req.params.id}
        AND "status" = 'APPROVED'::"VerifierApplicationStatus"
      RETURNING "id"
    `;
    if (!updated.length) return next(new HttpError(409, "Only approved verifiers can be suspended."));
    const application = await prisma.verifierApplication.findUnique({ where: { id: req.params.id }, include: includeApplication });
    res.json({ message: "Verifier suspended.", application });
  } catch (error) { next(error); }
}

export async function getLatestVerifierApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    const application = await prisma.verifierApplication.findFirst({
      where: { applicantId: userId }, include: includeApplication, orderBy: { submittedAt: "desc" },
    });
    if (!application) return next(new HttpError(404, "Verifier application not found."));
    res.json({ application });
  } catch (error) { next(error); }
}

export async function acknowledgeVerifierApproval(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    await neonSql`
      UPDATE "VerifierApplication"
      SET "approvalAcknowledgedAt" = COALESCE("approvalAcknowledgedAt", ${new Date()})
      WHERE "id" = ${req.params.id}
        AND "applicantId" = ${userId}
        AND "status" = 'APPROVED'::"VerifierApplicationStatus"
    `;
    const application = await prisma.verifierApplication.findFirst({
      where: { id: req.params.id, applicantId: userId, status: "APPROVED" }, include: includeApplication,
    });
    if (!application) return next(new HttpError(409, "Only an approved application can be acknowledged."));
    res.json({ application });
  } catch (error) { next(error); }
}

export async function createVerifierReapplication(req: Request<unknown, unknown, VerifierReapplicationInput>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    const latest = await prisma.verifierApplication.findFirst({
      where: { applicantId: userId }, orderBy: { submittedAt: "desc" },
    });
    if (!latest || latest.status !== "REJECTED") {
      return next(new HttpError(409, "A new application can only follow a rejected application."));
    }

    const id = randomUUID();
    const submittedAt = new Date();
    const metadata = req.body.identityDocumentMetadata ? JSON.stringify(req.body.identityDocumentMetadata) : null;
    const inserted = await neonSql`
      INSERT INTO "VerifierApplication" (
        "id", "applicantId", "district", "identityType", "identityNumber",
        "identityDocumentReference", "identityDocumentMetadata", "addressInformation",
        "communityReference", "status", "submittedAt"
      )
      SELECT ${id}, ${userId}, ${req.body.district}, ${req.body.identityType}, ${req.body.identityNumber},
        ${req.body.identityDocumentReference || ""}, ${metadata}::jsonb, ${req.body.addressInformation},
        ${req.body.communityReference || null}, 'PENDING'::"VerifierApplicationStatus", ${submittedAt}
      WHERE NOT EXISTS (
        SELECT 1 FROM "VerifierApplication"
        WHERE "applicantId" = ${userId}
          AND "status" = 'PENDING'::"VerifierApplicationStatus"
      )
      RETURNING "id"
    `;
    if (!inserted.length) return next(new HttpError(409, "You already have a pending verifier application."));
    const application = await prisma.verifierApplication.findUnique({ where: { id }, include: includeApplication });
    res.status(201).json({ message: "Verifier re-application submitted.", application });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return next(new HttpError(409, "You already have a pending verifier application."));
    }
    next(error);
  }
}

export async function getLatestReactivationRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    const activeSuspension = await prisma.verifierSuspensionEvent.findFirst({
      where: {
        reactivatedAt: null,
        verifierApplication: { applicantId: userId, status: "SUSPENDED" },
      },
      orderBy: { suspendedAt: "desc" },
      select: { id: true },
    });
    if (!activeSuspension) return res.json({ request: null });
    const request = await prisma.verifierReactivationRequest.findFirst({
      where: { verifierId: userId, suspensionEventId: activeSuspension.id }, orderBy: { createdAt: "desc" },
      include: { reviewer: { select: { id: true, name: true, email: true } } },
    });
    res.json({ request });
  } catch (error) { next(error); }
}

export async function createReactivationRequest(req: Request<unknown, unknown, ReactivationRequestInput>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    const application = await prisma.verifierApplication.findFirst({
      where: { applicantId: userId }, orderBy: { submittedAt: "desc" }, select: { id: true, status: true },
    });
    if (!application || application.status !== "SUSPENDED") {
      return next(new HttpError(409, "Only a suspended verifier can request reactivation."));
    }
    const id = randomUUID();
    const createdAt = new Date();
    const inserted = await neonSql`
      INSERT INTO "VerifierReactivationRequest" (
        "id", "verifierId", "verifierApplicationId", "explanation",
        "attachmentReference", "attachmentMetadata", "status", "createdAt"
      )
      SELECT ${id}, ${userId}, ${application.id}, ${req.body.explanation},
        ${req.body.attachmentReference || null},
        ${req.body.attachmentMetadata ? JSON.stringify(req.body.attachmentMetadata) : null}::jsonb,
        'PENDING'::"VerifierReactivationRequestStatus", ${createdAt}
      WHERE NOT EXISTS (
        SELECT 1 FROM "VerifierReactivationRequest"
        WHERE "verifierId" = ${userId}
          AND "status" = 'PENDING'::"VerifierReactivationRequestStatus"
      )
      RETURNING "id"
    `;
    if (!inserted.length) return next(new HttpError(409, "You already have a pending reactivation request."));
    const request = await prisma.verifierReactivationRequest.findUnique({ where: { id } });
    res.status(201).json({ message: "Reactivation request submitted.", request });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return next(new HttpError(409, "You already have a pending reactivation request."));
    }
    next(error);
  }
}

export async function approveReactivationRequest(req: Request<{ requestId: string }>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const reviewedAt = new Date();
    const [requestResult, applicationResult] = await neonSql.transaction([
      neonSql`
        UPDATE "VerifierReactivationRequest" AS request
        SET "status" = 'APPROVED'::"VerifierReactivationRequestStatus",
            "reviewerId" = ${userId}, "reviewedAt" = ${reviewedAt}, "reviewReason" = NULL
        WHERE request."id" = ${req.params.requestId}
          AND request."status" = 'PENDING'::"VerifierReactivationRequestStatus"
          AND EXISTS (
            SELECT 1 FROM "VerifierApplication" AS application
            WHERE application."id" = request."verifierApplicationId"
              AND application."status" = 'SUSPENDED'::"VerifierApplicationStatus"
          )
        RETURNING request."verifierApplicationId"
      `,
      neonSql`
        UPDATE "VerifierApplication" AS application
        SET "status" = 'APPROVED'::"VerifierApplicationStatus",
            "approvalAcknowledgedAt" = COALESCE(application."approvalAcknowledgedAt", ${reviewedAt})
        WHERE application."status" = 'SUSPENDED'::"VerifierApplicationStatus"
          AND EXISTS (
            SELECT 1 FROM "VerifierReactivationRequest" AS request
            WHERE request."id" = ${req.params.requestId}
              AND request."verifierApplicationId" = application."id"
              AND request."status" = 'APPROVED'::"VerifierReactivationRequestStatus"
              AND request."reviewerId" = ${userId}
              AND request."reviewedAt" = ${reviewedAt}
          )
        RETURNING application."id"
      `,
    ]);
    if (!requestResult.length || !applicationResult.length) {
      return next(new HttpError(409, "Only a pending request for a suspended verifier can be approved."));
    }
    const request = await prisma.verifierReactivationRequest.findUnique({
      where: { id: req.params.requestId }, include: { verifierApplication: { include: includeApplication } },
    });
    res.json({ message: "Verifier reactivated.", request });
  } catch (error) { next(error); }
}

export async function rejectReactivationRequest(req: Request<{ requestId: string }, unknown, RejectReactivationRequestInput>, res: Response, next: NextFunction) {
  try {
    const { userId } = req as unknown as AuthedRequest;
    const updated = await neonSql`
      UPDATE "VerifierReactivationRequest"
      SET "status" = 'REJECTED'::"VerifierReactivationRequestStatus",
          "reviewerId" = ${userId}, "reviewedAt" = ${new Date()}, "reviewReason" = ${req.body.reason}
      WHERE "id" = ${req.params.requestId}
        AND "status" = 'PENDING'::"VerifierReactivationRequestStatus"
      RETURNING "id"
    `;
    if (!updated.length) return next(new HttpError(409, "Only pending reactivation requests can be rejected."));
    const request = await prisma.verifierReactivationRequest.findUnique({ where: { id: req.params.requestId } });
    res.json({ message: "Reactivation request rejected.", request });
  } catch (error) { next(error); }
}
