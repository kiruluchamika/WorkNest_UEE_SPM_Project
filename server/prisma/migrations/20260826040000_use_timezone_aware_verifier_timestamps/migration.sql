ALTER TABLE "VerifierApplication"
  ALTER COLUMN "submittedAt" TYPE TIMESTAMPTZ(3) USING "submittedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "reviewedAt" TYPE TIMESTAMPTZ(3) USING "reviewedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "approvalAcknowledgedAt" TYPE TIMESTAMPTZ(3) USING "approvalAcknowledgedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "suspendedAt" TYPE TIMESTAMPTZ(3) USING "suspendedAt" AT TIME ZONE 'UTC';

ALTER TABLE "VerifierReactivationRequest"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "reviewedAt" TYPE TIMESTAMPTZ(3) USING "reviewedAt" AT TIME ZONE 'UTC';

ALTER TABLE "VerifierSuspensionEvent"
  ALTER COLUMN "suspendedAt" TYPE TIMESTAMPTZ(3) USING "suspendedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "reactivatedAt" TYPE TIMESTAMPTZ(3) USING "reactivatedAt" AT TIME ZONE 'UTC';
