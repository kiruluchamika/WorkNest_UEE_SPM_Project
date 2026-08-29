CREATE TYPE "VerificationRequestStatus" AS ENUM (
  'PENDING', 'ASSIGNED', 'UNDER_REVIEW', 'FLAGGED', 'RETURNED_FOR_REVIEW',
  'APPROVED', 'REJECTED', 'ADMIN_CONFIRMED'
);

ALTER TABLE "VerifierApplication"
  ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastAssignedAt" TIMESTAMPTZ(3);

CREATE TABLE "VerificationRequest" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "personalInformation" TEXT NOT NULL,
  "identityDocument" TEXT NOT NULL,
  "supportingEvidence" TEXT,
  "communityReferences" TEXT NOT NULL,
  "status" "VerificationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "assignedVerifierId" TEXT,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedAt" TIMESTAMPTZ(3),
  "reviewStartedAt" TIMESTAMPTZ(3),
  "decidedAt" TIMESTAMPTZ(3),
  "verifierNote" TEXT,
  "rejectionReason" TEXT,
  "flagReason" TEXT,
  "flaggedAt" TIMESTAMPTZ(3),
  "wasFlagged" BOOLEAN NOT NULL DEFAULT false,
  "adminResponse" TEXT,
  "adminReviewedAt" TIMESTAMPTZ(3),
  "adminReviewerId" TEXT,
  CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationRequest_applicantId_submittedAt_idx" ON "VerificationRequest"("applicantId", "submittedAt");
CREATE INDEX "VerificationRequest_assignedVerifierId_status_submittedAt_idx" ON "VerificationRequest"("assignedVerifierId", "status", "submittedAt");
CREATE INDEX "VerificationRequest_status_submittedAt_idx" ON "VerificationRequest"("status", "submittedAt");
CREATE INDEX "VerificationRequest_district_status_submittedAt_idx" ON "VerificationRequest"("district", "status", "submittedAt");
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_assignedVerifierId_fkey" FOREIGN KEY ("assignedVerifierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_adminReviewerId_fkey" FOREIGN KEY ("adminReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
