CREATE TABLE "VerifierSuspensionEvent" (
    "id" TEXT NOT NULL,
    "verifierApplicationId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedById" TEXT,
    "reactivatedAt" TIMESTAMP(3),
    CONSTRAINT "VerifierSuspensionEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VerifierReactivationRequest" ADD COLUMN "suspensionEventId" TEXT;

INSERT INTO "VerifierSuspensionEvent" (
    "id", "verifierApplicationId", "reason", "suspendedAt", "suspendedById", "reactivatedAt"
)
SELECT
    gen_random_uuid()::text,
    application."id",
    COALESCE(application."suspensionReason", 'Reason unavailable'),
    application."suspendedAt",
    application."suspendedById",
    (
      SELECT MIN(request."reviewedAt")
      FROM "VerifierReactivationRequest" AS request
      WHERE request."verifierApplicationId" = application."id"
        AND request."status" = 'APPROVED'::"VerifierReactivationRequestStatus"
        AND request."reviewedAt" >= application."suspendedAt"
    )
FROM "VerifierApplication" AS application
WHERE application."suspendedAt" IS NOT NULL;

UPDATE "VerifierReactivationRequest" AS request
SET "suspensionEventId" = event."id"
FROM "VerifierSuspensionEvent" AS event
WHERE event."verifierApplicationId" = request."verifierApplicationId"
  AND request."createdAt" >= event."suspendedAt"
  AND (event."reactivatedAt" IS NULL OR request."createdAt" <= event."reactivatedAt");

CREATE INDEX "VerifierSuspensionEvent_verifierApplicationId_suspendedAt_idx"
ON "VerifierSuspensionEvent"("verifierApplicationId", "suspendedAt");
CREATE INDEX "VerifierSuspensionEvent_suspendedById_idx"
ON "VerifierSuspensionEvent"("suspendedById");
CREATE INDEX "VerifierReactivationRequest_suspensionEventId_createdAt_idx"
ON "VerifierReactivationRequest"("suspensionEventId", "createdAt");

ALTER TABLE "VerifierSuspensionEvent"
ADD CONSTRAINT "VerifierSuspensionEvent_verifierApplicationId_fkey"
FOREIGN KEY ("verifierApplicationId") REFERENCES "VerifierApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VerifierSuspensionEvent"
ADD CONSTRAINT "VerifierSuspensionEvent_suspendedById_fkey"
FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerifierReactivationRequest"
ADD CONSTRAINT "VerifierReactivationRequest_suspensionEventId_fkey"
FOREIGN KEY ("suspensionEventId") REFERENCES "VerifierSuspensionEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
