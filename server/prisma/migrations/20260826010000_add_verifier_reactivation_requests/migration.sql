CREATE TYPE "VerifierReactivationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "VerifierReactivationRequest" (
    "id" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verifierApplicationId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "VerifierReactivationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewReason" TEXT,
    CONSTRAINT "VerifierReactivationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerifierReactivationRequest_verifierId_createdAt_idx"
ON "VerifierReactivationRequest"("verifierId", "createdAt");

CREATE INDEX "VerifierReactivationRequest_verifierApplicationId_createdAt_idx"
ON "VerifierReactivationRequest"("verifierApplicationId", "createdAt");

CREATE INDEX "VerifierReactivationRequest_status_createdAt_idx"
ON "VerifierReactivationRequest"("status", "createdAt");

CREATE UNIQUE INDEX "VerifierReactivationRequest_one_pending_per_verifier_idx"
ON "VerifierReactivationRequest"("verifierId")
WHERE "status" = 'PENDING';

ALTER TABLE "VerifierReactivationRequest"
ADD CONSTRAINT "VerifierReactivationRequest_verifierId_fkey"
FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VerifierReactivationRequest"
ADD CONSTRAINT "VerifierReactivationRequest_verifierApplicationId_fkey"
FOREIGN KEY ("verifierApplicationId") REFERENCES "VerifierApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VerifierReactivationRequest"
ADD CONSTRAINT "VerifierReactivationRequest_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
