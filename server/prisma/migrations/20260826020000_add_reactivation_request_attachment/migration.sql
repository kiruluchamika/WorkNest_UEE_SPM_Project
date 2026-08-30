ALTER TABLE "VerifierReactivationRequest"
ADD COLUMN "attachmentReference" TEXT,
ADD COLUMN "attachmentMetadata" JSONB;
