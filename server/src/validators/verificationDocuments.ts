import { z } from "zod";

// Existing references are still checked for ownership by receiveDocuments.
export function requireDocument(data: Record<string, unknown>, ctx: z.RefinementCtx, field: string, message: string) {
  if (data[`${field}Upload`] == null && !(typeof data[field] === "string" && /worknest-file:[0-9a-f-]{36}/.test(data[field]))) {
    ctx.addIssue({ code: "custom", path: [field], message });
  }
}
