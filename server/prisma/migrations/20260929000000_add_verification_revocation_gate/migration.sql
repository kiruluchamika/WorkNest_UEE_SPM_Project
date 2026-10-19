ALTER TYPE "VerificationRequestStatus" ADD VALUE 'ADMIN_REVIEW';
ALTER TYPE "VerificationRequestStatus" ADD VALUE 'ADMIN_DENIED';
CREATE TYPE "VerificationGateStatus" AS ENUM ('PENDING', 'ALLOWED', 'DENIED');

CREATE TABLE "VerificationRevocation" (
  "id" TEXT NOT NULL,
  "verificationRequestId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "revokedById" TEXT NOT NULL,
  "revokedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationRevocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerificationRevocation_verificationRequestId_fkey" FOREIGN KEY ("verificationRequestId") REFERENCES "VerificationRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VerificationRevocation_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VerificationRevocation_verificationRequestId_key" ON "VerificationRevocation"("verificationRequestId");
ALTER TABLE "VerificationRequest"
  ADD COLUMN "revocationId" TEXT,
  ADD COLUMN "gateStatus" "VerificationGateStatus",
  ADD COLUMN "gateExplanation" TEXT,
  ADD COLUMN "gateReason" TEXT,
  ADD COLUMN "gateReviewedAt" TIMESTAMPTZ(3),
  ADD COLUMN "gateReviewerId" TEXT,
  ADD CONSTRAINT "VerificationRequest_revocationId_fkey" FOREIGN KEY ("revocationId") REFERENCES "VerificationRevocation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "VerificationRequest_gateReviewerId_fkey" FOREIGN KEY ("gateReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "VerificationRequest_one_pending_gate_per_applicant" ON "VerificationRequest"("applicantId") WHERE "gateStatus" = 'PENDING'::"VerificationGateStatus";
