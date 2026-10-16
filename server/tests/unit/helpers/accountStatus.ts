import { vi } from "vitest";
import type * as AccountStatusService from "../../../src/services/accountStatus.service";

/**
 * vi.mock factory for the account-status service: every token belongs to an
 * active account unless a test overrides getAccountStatus. mockReset restores
 * this default before each test.
 *
 *   vi.mock("../../src/services/accountStatus.service", async (importOriginal) =>
 *     (await import("./helpers/accountStatus")).activeAccounts(importOriginal));
 */
export async function activeAccounts(importOriginal: () => Promise<unknown>) {
  const actual = (await importOriginal()) as typeof AccountStatusService;
  return {
    ...actual,
    getAccountStatus: vi.fn(async () => ({ isDisabled: false, disabledReason: null })),
    invalidateAccountStatus: vi.fn(),
  };
}
