import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { VerificationRequestStatus } from "@prisma/client";
import { neonSql, prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth.middleware";
import { HttpError } from "../middleware/error.middleware";

const requestInclude = {
  applicant: { select: { id: true, name: true, email: true, phone: true, bio: true, location: true } },
  assignedVerifier: { select: { id: true, name: true, email: true } },
  adminReviewer: { select: { id: true, name: true, email: true } },
} as const;
const activeStatuses = ["PENDING", "ASSIGNED", "UNDER_REVIEW", "FLAGGED", "RETURNED_FOR_REVIEW"] as VerificationRequestStatus[];

export async function getAdminVerificationOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const requests = await prisma.verificationRequest.findMany({
      select: { status: true, submittedAt: true, decidedAt: true, flaggedAt: true },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    res.json({
      overview: {
        requestsToday: requests.filter((request) => request.submittedAt >= today).length,
        approvedToday: requests.filter((request) => request.status === "APPROVED" && request.decidedAt && request.decidedAt >= today).length,
        rejectedToday: requests.filter((request) => request.status === "REJECTED" && request.decidedAt && request.decidedAt >= today).length,
        flaggedToday: requests.filter((request) => request.flaggedAt && request.flaggedAt >= today).length,
        awaitingReview: requests.filter((request) => request.status === "ASSIGNED").length,
        underReview: requests.filter((request) => request.status === "UNDER_REVIEW").length,
      },
    });
  } catch (error) { next(error); }
}

export async function getAdminVerifierStatistics(req: Request<{ applicationId: string }>, res: Response, next: NextFunction) {
  try {
    const application = await prisma.verifierApplication.findUnique({
      where: { id: req.params.applicationId },
      select: { applicantId: true },
    });
    if (!application) return next(new HttpError(404, "Verifier application not found."));
    const requests = await prisma.verificationRequest.findMany({
      where: { assignedVerifierId: application.applicantId },
      select: { status: true, wasFlagged: true },
    });
    res.json({
      statistics: {
        assigned: requests.length,
        approved: requests.filter((request) => request.status === "APPROVED").length,
        rejected: requests.filter((request) => request.status === "REJECTED").length,
        flagged: requests.filter((request) => request.wasFlagged).length,
      },
    });
  } catch (error) { next(error); }
}

export async function createVerificationRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;
    const existing = await prisma.verificationRequest.findFirst({ where: { applicantId: userId, status: { in: activeStatuses } } });
    if (existing) return next(new HttpError(409, "You already have an active verification request."));
    const id = randomUUID(); const now = new Date();
    const rows = await neonSql`
      WITH eligible AS (
        SELECT application."id" AS "applicationId", application."applicantId" AS "verifierId"
        FROM "VerifierApplication" application
        WHERE application."status" = 'APPROVED'::"VerifierApplicationStatus"
          AND application."isAvailable" = true
          AND LOWER(application."district") = LOWER(${req.body.district})
        ORDER BY application."lastAssignedAt" ASC NULLS FIRST, application."submittedAt" ASC
        LIMIT 1
      ), assigned AS (
        UPDATE "VerifierApplication" application SET "lastAssignedAt" = ${now}
        FROM eligible WHERE application."id" = eligible."applicationId"
        RETURNING application."applicantId" AS "verifierId"
      )
      INSERT INTO "VerificationRequest" (
        "id", "applicantId", "district", "personalInformation", "identityDocument",
        "supportingEvidence", "communityReferences", "status", "assignedVerifierId", "submittedAt", "assignedAt"
      ) VALUES (
        ${id}, ${userId}, ${req.body.district}, ${req.body.personalInformation}, ${req.body.identityDocument || ""},
        ${req.body.supportingEvidence || null}, ${req.body.communityReferences},
        CASE WHEN EXISTS(SELECT 1 FROM assigned) THEN 'ASSIGNED' ELSE 'PENDING' END::"VerificationRequestStatus",
        (SELECT "verifierId" FROM assigned), ${now}, CASE WHEN EXISTS(SELECT 1 FROM assigned) THEN ${now}::timestamptz ELSE NULL::timestamptz END
      ) RETURNING "id"
    `;
    const request = await prisma.verificationRequest.findUnique({ where: { id: rows[0].id as string }, include: requestInclude });
    res.status(201).json({ request });
  } catch (error) { next(error); }
}

export async function getMyJobSeekerRequests(req: Request, res: Response, next: NextFunction) {
  try { const { userId } = req as AuthedRequest; res.json({ requests: await prisma.verificationRequest.findMany({ where: { applicantId: userId }, include: requestInclude, orderBy: { submittedAt: "desc" } }) }); } catch (e) { next(e); }
}
export async function setAvailability(req: Request, res: Response, next: NextFunction) {
  try { const { userId } = req as AuthedRequest; const rows = await neonSql`UPDATE "VerifierApplication" SET "isAvailable"=${req.body.isAvailable} WHERE "applicantId"=${userId} AND "status"='APPROVED'::"VerifierApplicationStatus" RETURNING "id","isAvailable"`; if(!rows.length)return next(new HttpError(409,"Only active verifiers can change availability.")); res.json({ availability: rows[0] }); } catch(e){next(e);}
}
export async function getVerifierDashboard(req: Request, res: Response, next: NextFunction) {
  try { const { userId }=req as AuthedRequest; const application=await prisma.verifierApplication.findFirst({where:{applicantId:userId},orderBy:{submittedAt:"desc"},select:{district:true,isAvailable:true,status:true}}); const requests=await prisma.verificationRequest.findMany({where:{assignedVerifierId:userId},select:{status:true,submittedAt:true,decidedAt:true,wasFlagged:true,flaggedAt:true}}); const today=new Date();today.setHours(0,0,0,0); const count=(status:VerificationRequestStatus)=>requests.filter(r=>r.status===status).length; const decidedToday=(status:VerificationRequestStatus)=>requests.filter(r=>r.status===status&&r.decidedAt&&r.decidedAt>=today).length; res.json({dashboard:{application,queues:{awaiting:count("ASSIGNED"),underReview:count("UNDER_REVIEW"),returned:count("RETURNED_FOR_REVIEW")},today:{assigned:requests.filter(r=>r.submittedAt>=today).length,approved:decidedToday("APPROVED"),rejected:decidedToday("REJECTED"),flagged:requests.filter(r=>r.flaggedAt&&r.flaggedAt>=today).length},allTime:{assigned:requests.length,approved:count("APPROVED"),rejected:count("REJECTED"),flagged:requests.filter(r=>r.wasFlagged).length}}}); }catch(e){next(e);}
}
export async function listVerifierRequests(req: Request,res:Response,next:NextFunction){try{const{userId,userRole}=req as AuthedRequest;const status=String(req.query.status);if(!Object.values(VerificationRequestStatus).includes(status as VerificationRequestStatus))return next(new HttpError(400,"Invalid verification status."));res.json({requests:await prisma.verificationRequest.findMany({where:{...(userRole==="admin"?{}:{assignedVerifierId:userId}),status:status as VerificationRequestStatus},include:requestInclude,orderBy:{submittedAt:req.query.sort==="newest"?"desc":"asc"}})});}catch(e){next(e);}}
export async function getVerificationRequest(req:Request<{id:string}>,res:Response,next:NextFunction){try{const{userId,userRole}=req as unknown as AuthedRequest;const where=userRole==="admin"?{id:req.params.id}:{id:req.params.id,assignedVerifierId:userId};const request=await prisma.verificationRequest.findFirst({where,include:requestInclude});if(!request)return next(new HttpError(404,"Verification request not found."));res.json({request});}catch(e){next(e);}}
export async function startReview(req:Request<{id:string}>,res:Response,next:NextFunction){try{const{userId}=req as unknown as AuthedRequest;const rows=await neonSql`UPDATE "VerificationRequest" SET "status"='UNDER_REVIEW'::"VerificationRequestStatus","reviewStartedAt"=${new Date()} WHERE "id"=${req.params.id} AND "assignedVerifierId"=${userId} AND "status"='ASSIGNED'::"VerificationRequestStatus" RETURNING "id"`;if(!rows.length)return next(new HttpError(409,"Only assigned requests can be started."));return getVerificationRequest(req,res,next);}catch(e){next(e);}}
async function decide(req:Request<{id:string}>,res:Response,next:NextFunction,status:"APPROVED"|"REJECTED"){try{const{userId}=req as unknown as AuthedRequest;const allowed=status==="APPROVED"?["UNDER_REVIEW","RETURNED_FOR_REVIEW"]:["UNDER_REVIEW","RETURNED_FOR_REVIEW"];const rows=await neonSql`UPDATE "VerificationRequest" SET "status"=${status}::"VerificationRequestStatus","verifierNote"=${req.body.verifierNote},"rejectionReason"=${status==="REJECTED"?req.body.rejectionReason:null},"decidedAt"=${new Date()} WHERE "id"=${req.params.id} AND "assignedVerifierId"=${userId} AND "status"=ANY(${allowed}::"VerificationRequestStatus"[]) RETURNING "id"`;if(!rows.length)return next(new HttpError(409,"This request is not ready for a decision."));return getVerificationRequest(req,res,next);}catch(e){next(e);}}
export const approveVerification=(req:Request<{id:string}>,res:Response,next:NextFunction)=>decide(req,res,next,"APPROVED");
export const rejectVerification=(req:Request<{id:string}>,res:Response,next:NextFunction)=>decide(req,res,next,"REJECTED");
export async function flagVerification(req:Request<{id:string}>,res:Response,next:NextFunction){try{const{userId}=req as unknown as AuthedRequest;const rows=await neonSql`UPDATE "VerificationRequest" SET "status"='FLAGGED'::"VerificationRequestStatus","verifierNote"=${req.body.verifierNote},"flagReason"=${req.body.flagReason},"flaggedAt"=${new Date()},"wasFlagged"=true WHERE "id"=${req.params.id} AND "assignedVerifierId"=${userId} AND "status"='UNDER_REVIEW'::"VerificationRequestStatus" RETURNING "id"`;if(!rows.length)return next(new HttpError(409,"Only requests under review can be flagged."));return getVerificationRequest(req,res,next);}catch(e){next(e);}}
export async function listHistory(req:Request,res:Response,next:NextFunction){try{const{userId,userRole}=req as AuthedRequest;const tab=String(req.query.tab||"APPROVED");if(userRole==="admin"&&!["APPROVED","REJECTED","FLAGGED"].includes(tab))return next(new HttpError(400,"Invalid history category."));const scope=userRole==="admin"?{}:{assignedVerifierId:userId};const where=tab==="FLAGGED"?{...scope,wasFlagged:true}:{...scope,status:tab as VerificationRequestStatus};res.json({requests:await prisma.verificationRequest.findMany({where,include:requestInclude,orderBy:{submittedAt:"desc"}})});}catch(e){next(e);}}
export async function listFlagged(req:Request,res:Response,next:NextFunction){try{res.json({requests:await prisma.verificationRequest.findMany({where:{status:"FLAGGED"},include:requestInclude,orderBy:{flaggedAt:"asc"}})});}catch(e){next(e);}}
export async function resolveFlag(req:Request<{id:string}>,res:Response,next:NextFunction,returned:boolean){try{const{userId}=req as unknown as AuthedRequest;const rows=await neonSql`UPDATE "VerificationRequest" SET "status"=${returned?"RETURNED_FOR_REVIEW":"ADMIN_CONFIRMED"}::"VerificationRequestStatus","adminResponse"=${req.body.response},"adminReviewedAt"=${new Date()},"adminReviewerId"=${userId},"decidedAt"=${returned?null:new Date()} WHERE "id"=${req.params.id} AND "status"='FLAGGED'::"VerificationRequestStatus" RETURNING "id"`;if(!rows.length)return next(new HttpError(409,"Only flagged requests can be resolved."));return getVerificationRequest(req,res,next);}catch(e){next(e);}}
export const returnFlaggedVerification=(req:Request<{id:string}>,res:Response,next:NextFunction)=>resolveFlag(req,res,next,true);
export const confirmFlaggedVerification=(req:Request<{id:string}>,res:Response,next:NextFunction)=>resolveFlag(req,res,next,false);
