import { z } from "zod";

export const USER_STATUS_FILTERS = ["all", "active", "disabled"] as const;
export const USER_ROLE_FILTERS = ["all", "jobseeker", "shopowner", "verifier", "admin"] as const;

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100, "Search must be 100 characters or fewer.").optional(),
  role: z.enum(USER_ROLE_FILTERS).default("all"),
  status: z.enum(USER_STATUS_FILTERS).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const disableUserSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Please give a reason for disabling this account.")
    .max(500, "Reason must be 500 characters or fewer."),
});
export type DisableUserInput = z.infer<typeof disableUserSchema>;

export const enableUserSchema = z.object({
  reason: z.string().trim().max(500, "Note must be 500 characters or fewer.").optional(),
});
export type EnableUserInput = z.infer<typeof enableUserSchema>;
