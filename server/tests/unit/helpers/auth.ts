import { signToken } from "../../../src/utils/jwt";

/** Authorization header for a request made as the given user. */
export function bearer(userId: string, role = "jobseeker") {
  return { Authorization: `Bearer ${signToken({ userId, role })}` };
}
