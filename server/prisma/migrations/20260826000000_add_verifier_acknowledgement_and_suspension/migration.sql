ALTER TYPE "VerifierApplicationStatus" ADD VALUE 'SUSPENDED';

ALTER TABLE "VerifierApplication"
ADD COLUMN "approvalAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN "suspendedAt" TIMESTAMP(3),
ADD COLUMN "suspensionReason" TEXT,
ADD COLUMN "suspendedById" TEXT;

ALTER TABLE "VerifierApplication"
ADD CONSTRAINT "VerifierApplication_suspendedById_fkey"
FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "VerifierApplication_suspendedById_idx"
ON "VerifierApplication"("suspendedById");

CREATE UNIQUE INDEX "VerifierApplication_one_pending_per_applicant_idx"
ON "VerifierApplication"("applicantId")
WHERE "status" = 'PENDING';
