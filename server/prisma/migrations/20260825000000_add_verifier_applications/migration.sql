CREATE TYPE "VerifierApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "VerifierApplication" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "identityType" TEXT NOT NULL,
    "identityNumber" TEXT NOT NULL,
    "identityDocumentReference" TEXT NOT NULL,
    "identityDocumentMetadata" JSONB,
    "addressInformation" TEXT NOT NULL,
    "communityReference" TEXT,
    "status" "VerifierApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewerId" TEXT,
    CONSTRAINT "VerifierApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerifierApplication_applicantId_submittedAt_idx" ON "VerifierApplication"("applicantId", "submittedAt");
CREATE INDEX "VerifierApplication_status_submittedAt_idx" ON "VerifierApplication"("status", "submittedAt");
ALTER TABLE "VerifierApplication" ADD CONSTRAINT "VerifierApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VerifierApplication" ADD CONSTRAINT "VerifierApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
