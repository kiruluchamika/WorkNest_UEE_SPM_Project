import { http, extractErrorMessage } from "./http";
import type { GigPost, GigPostStatus, GigPaymentType } from "../types";

export interface GigPostFormPayload {
  title: string;
  categoryId: string;
  description: string;
  location: string;
  paymentAmount: number;
  paymentType: GigPaymentType;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  workersNeeded: number;
  requiredSkills: string[];
  contactInfo?: string;
  imageUrl?: string;
}

export async function createGigPost(payload: GigPostFormPayload): Promise<GigPost> {
  try {
    const { data } = await http.post("/gigs", payload);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not create gig. Please try again."));
  }
}

export async function listMyGigPosts(status?: GigPostStatus): Promise<GigPost[]> {
  try {
    const { data } = await http.get("/gigs/my", { params: status ? { status } : undefined });
    return data.gigs;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load your gigs."));
  }
}

export async function listActiveGigPosts(filters?: {
  categoryId?: string;
  location?: string;
}): Promise<GigPost[]> {
  try {
    const { data } = await http.get("/gigs", { params: filters });
    return data.gigs;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load available gigs."));
  }
}

export async function getGigPost(id: string): Promise<GigPost> {
  try {
    const { data } = await http.get(`/gigs/${id}`);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load this gig."));
  }
}

export async function getPublicGigPost(id: string): Promise<GigPost> {
  try {
    const { data } = await http.get(`/gigs/public/${id}`);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load this gig."));
  }
}

export async function updateGigPost(
  id: string,
  payload: Partial<GigPostFormPayload>
): Promise<GigPost> {
  try {
    const { data } = await http.put(`/gigs/${id}`, payload);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not update this gig."));
  }
}

export async function deleteGigPost(id: string): Promise<void> {
  try {
    await http.delete(`/gigs/${id}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not delete this gig."));
  }
}

export async function closeGigPost(id: string): Promise<GigPost> {
  try {
    const { data } = await http.patch(`/gigs/${id}/close`);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not close this gig."));
  }
}

export async function resubmitGigPost(id: string): Promise<GigPost> {
  try {
    const { data } = await http.patch(`/gigs/${id}/resubmit`);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not resubmit this gig."));
  }
}

export async function completeGigPost(id: string): Promise<GigPost> {
  try {
    const { data } = await http.patch(`/gigs/${id}/complete`);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not mark this gig as completed."));
  }
}
