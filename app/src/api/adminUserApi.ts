import { http, extractErrorMessage } from "./http";
import type { AdminUserDetail, AdminUserList, AdminUserSummary, UserRoleFilter, UserStatusFilter } from "../types";

export interface ListUsersParams {
  search?: string;
  role?: UserRoleFilter;
  status?: UserStatusFilter;
  page?: number;
  limit?: number;
}

export async function listUsers(params: ListUsersParams = {}): Promise<AdminUserList> {
  try {
    const { data } = await http.get("/admin/users", {
      params: { ...params, search: params.search?.trim() || undefined },
    });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load users."));
  }
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  try {
    const { data } = await http.get(`/admin/users/${userId}`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load this user."));
  }
}

export async function disableUser(userId: string, reason: string): Promise<AdminUserSummary> {
  try {
    const { data } = await http.patch(`/admin/users/${userId}/disable`, { reason });
    return data.user;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not disable this account."));
  }
}

export async function enableUser(userId: string, reason?: string): Promise<AdminUserSummary> {
  try {
    const { data } = await http.patch(`/admin/users/${userId}/enable`, { reason });
    return data.user;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not re-enable this account."));
  }
}
