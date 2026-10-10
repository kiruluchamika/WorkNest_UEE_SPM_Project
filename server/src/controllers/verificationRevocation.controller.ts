import { randomUUID } from "crypto";
import { RequestHandler } from "express";
import { neonSql, prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth.middleware";
import { HttpError } from "../middleware/error.middleware";

const people = { applicant: { select: { id: true, name: true, email: true } }, assignedVerifier: { select: { id: true, name: true } } } as const;
const auditInclude = { verificationRequest: { include: people }, revokedBy: { select: { id: true, name: true } } } as const;
export const isVerifiedRequest = (request: { status: string; badgeRevocation?: unknown } | null | undefined) => !!request && ["APPROVED", "ADMIN_CONFIRMED"].includes(request.status) && !request.badgeRevocation;

export const myVerificationState: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req as AuthedRequest;
    const latest = await prisma.verificationRequest.findFirst({ where: { applicantId: userId }, orderBy: { submittedAt: "desc" }, include: { badgeRevocation: true } });
    const revocation = await prisma.verificationRevocation.findFirst({ where: { verificationRequest: { applicantId: userId } }, orderBy: { revokedAt: "desc" } });
    res.json({ verified: isVerifiedRequest(latest), revocation, request: latest });
  } catch (e) { next(e); }
};

export const listVerifiedJobSeekers: RequestHandler = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ where: { role: "jobseeker" }, select: { id: true, name: true, submittedVerificationRequests: { take: 1, orderBy: { submittedAt: "desc" }, include: { badgeRevocation: true, ...people } } } });
    const district = typeof req.query.district === "string" ? req.query.district : "";
    res.json({ requests: users.map(user => user.submittedVerificationRequests[0]).filter(request => isVerifiedRequest(request) && (!district || request.district === district)) });
  } catch (e) { next(e); }
};

export const listRevocations: RequestHandler = async (_req, res, next) => {
  try { res.json({ revocations: await prisma.verificationRevocation.findMany({ include: auditInclude, orderBy: { revokedAt: "desc" } }) }); }
  catch (e) { next(e); }
};

export const jobSeekerVerificationDetails: RequestHandler = async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const user = await prisma.user.findFirst({ where: { id: userId, role: "jobseeker" }, select: { id: true, name: true, email: true } });
    if (!user) throw new HttpError(404, "Job Seeker not found.");
    const requests = await prisma.verificationRequest.findMany({ where: { applicantId: userId }, orderBy: { submittedAt: "desc" }, include: { ...people, badgeRevocation: true, revocation: { include: auditInclude }, gateReviewer: { select: { id: true, name: true } } } });
    const revocations = await prisma.verificationRevocation.findMany({ where: { verificationRequest: { applicantId: userId } }, include: auditInclude, orderBy: { revokedAt: "desc" } });
    res.json({ user, requests, revocations, verified: isVerifiedRequest(requests[0]) });
  } catch (e) { next(e); }
};

export const revokeBadge: RequestHandler = async (req, res, next) => {
  try {
    const adminId = (req as AuthedRequest).userId;
    // Lock the applicant so repeated/replayed revocations cannot revoke a different badge.
    const rows = await neonSql`
      WITH owner AS (
        SELECT u."id" FROM "User" u JOIN "VerificationRequest" r ON r."applicantId"=u."id"
        WHERE r."id"=${String(req.params.requestId)} AND u."role"='jobseeker'::"Role" FOR UPDATE OF u
      )
      INSERT INTO "VerificationRevocation" ("id","verificationRequestId","reason","revokedById")
      SELECT ${randomUUID()}, r."id", ${req.body.reason}, ${adminId} FROM "VerificationRequest" r
      WHERE r."id"=${String(req.params.requestId)} AND r."applicantId" IN (SELECT "id" FROM owner)
        AND r."status" IN ('APPROVED'::"VerificationRequestStatus",'ADMIN_CONFIRMED'::"VerificationRequestStatus")
        AND NOT EXISTS (SELECT 1 FROM "VerificationRequest" newer WHERE newer."applicantId"=r."applicantId" AND newer."submittedAt">r."submittedAt")
      ON CONFLICT ("verificationRequestId") DO NOTHING RETURNING "id"
    `;
    if (!rows.length) throw new HttpError(409, "This badge is no longer eligible for revocation. Refresh the record.");
    res.status(201).json({ revocation: await prisma.verificationRevocation.findUnique({ where: { id: rows[0].id as string }, include: auditInclude }) });
  } catch (e) { next(e); }
};

export const listGateRequests: RequestHandler = async (_req, res, next) => {
  try { res.json({ requests: await prisma.verificationRequest.findMany({ where: { status: "ADMIN_REVIEW", gateStatus: "PENDING" }, include: { ...people, revocation: { include: auditInclude } }, orderBy: { submittedAt: "asc" } }) }); }
  catch (e) { next(e); }
};

export const denyGate: RequestHandler = async (req, res, next) => {
  try {
    // Prisma updateMany requires a transaction unsupported by PrismaNeonHTTP.
    // One conditional statement preserves the gate/replay guards atomically.
    const rows = await neonSql`
      UPDATE "VerificationRequest" SET
        "status"='ADMIN_DENIED'::"VerificationRequestStatus", "gateStatus"='DENIED'::"VerificationGateStatus",
        "gateReason"=${req.body.reason}, "gateReviewerId"=${(req as AuthedRequest).userId}, "gateReviewedAt"=${new Date()}
      WHERE "id"=${String(req.params.requestId)} AND "status"='ADMIN_REVIEW'::"VerificationRequestStatus"
        AND "gateStatus"='PENDING'::"VerificationGateStatus" AND "assignedVerifierId" IS NULL
      RETURNING "id"
    `;
    if (!rows.length) throw new HttpError(409, "This request has already been reviewed.");
    res.json({ message: "Re-verification denied." });
  } catch (e) { next(e); }
};

export const allowGate: RequestHandler = async (req, res, next) => {
  try {
    const now = new Date();
    // Same eligibility and round-robin ordering as ordinary submission. Lock the gate
    // first so concurrent allow/deny decisions cannot assign or advance rotation twice.
    const rows = await neonSql`
      WITH gate AS (
        SELECT * FROM "VerificationRequest" WHERE "id"=${String(req.params.requestId)}
          AND "status"='ADMIN_REVIEW'::"VerificationRequestStatus" AND "gateStatus"='PENDING'::"VerificationGateStatus"
          AND "assignedVerifierId" IS NULL FOR UPDATE
      ), eligible AS (
        SELECT application."id" AS "applicationId", application."applicantId" AS "verifierId"
        FROM "VerifierApplication" application, gate
        WHERE application."status"='APPROVED'::"VerifierApplicationStatus" AND application."isAvailable"=true
          AND LOWER(application."district")=LOWER(gate."district")
        ORDER BY application."lastAssignedAt" ASC NULLS FIRST, application."submittedAt" ASC LIMIT 1
      ), assigned AS (
        UPDATE "VerifierApplication" application SET "lastAssignedAt"=${now} FROM eligible
        WHERE application."id"=eligible."applicationId" RETURNING application."applicantId" AS "verifierId"
      )
      UPDATE "VerificationRequest" request SET
        "status"=CASE WHEN EXISTS(SELECT 1 FROM assigned) THEN 'ASSIGNED' ELSE 'PENDING' END::"VerificationRequestStatus",
        "assignedVerifierId"=(SELECT "verifierId" FROM assigned),
        "assignedAt"=CASE WHEN EXISTS(SELECT 1 FROM assigned) THEN ${now}::timestamptz ELSE NULL::timestamptz END,
        "gateStatus"='ALLOWED'::"VerificationGateStatus", "gateReviewerId"=${(req as AuthedRequest).userId}, "gateReviewedAt"=${now}
      WHERE request."id" IN (SELECT "id" FROM gate) RETURNING request."id",request."status"
    `;
    if (!rows.length) throw new HttpError(409, "This request has already been reviewed.");
    res.json({ request: rows[0] });
  } catch (e) { next(e); }
};
