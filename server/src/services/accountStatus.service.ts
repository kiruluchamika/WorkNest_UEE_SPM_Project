import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";

export const ACCOUNT_DISABLED_CODE = "ACCOUNT_DISABLED";

export interface AccountStatus {
  isDisabled: boolean;
  disabledReason: string | null;
}

// Every authenticated request checks whether its account was disabled, so a
// session issued before the admin acted stops working without waiting for the
// 7-day token to expire. A short cache keeps that from adding a database
// round trip to every request; disabling/enabling clears the entry at once.
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { status: AccountStatus | null; expiresAt: number }>();

/** Null when the account no longer exists. */
export async function getAccountStatus(userId: string): Promise<AccountStatus | null> {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.status;

  const status = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDisabled: true, disabledReason: true },
  });
  cache.set(userId, { status, expiresAt: Date.now() + CACHE_TTL_MS });
  return status;
}

export function invalidateAccountStatus(userId: string): void {
  cache.delete(userId);
}

export function accountDisabledError(reason: string | null): HttpError {
  const message = reason
    ? `Your account has been disabled by an administrator. Reason: ${reason}`
    : "Your account has been disabled by an administrator.";
  return new HttpError(403, message, ACCOUNT_DISABLED_CODE);
}
