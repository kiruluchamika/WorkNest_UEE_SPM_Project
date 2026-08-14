import { http, extractErrorMessage } from "./http";
import type { GigPost, GigPostStatus } from "../types";

export type AdminGigStatusFilter = GigPostStatus | "ALL";

export async function listAdminGigs(status?: AdminGigStatusFilter): Promise<GigPost[]> {
  try {
    const { data } = await http.get("/admin/gigs", {
      params: status && status !== "ALL" ? { status } : undefined,
    });
    return data.gigs;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load gigs."));
  }
}

export async function getAdminGig(id: string): Promise<GigPost> {
  try {
    const { data } = await http.get(`/admin/gigs/${id}`);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load this gig."));
  }
}

export async function approveGig(id: string): Promise<GigPost> {
  try {
    const { data } = await http.patch(`/admin/gigs/${id}/approve`);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not approve this gig."));
  }
}

export async function rejectGig(id: string, reason: string): Promise<GigPost> {
  try {
    const { data } = await http.patch(`/admin/gigs/${id}/reject`, { reason });
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not reject this gig."));
  }
}
