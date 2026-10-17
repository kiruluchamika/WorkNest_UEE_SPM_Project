import type { APIRequestContext, APIResponse } from "@playwright/test";
import { API_BASE_URL } from "./api";

/** A unique suffix so every run creates its own categories and gigs. */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/** "YYYY-MM-DD" for a date `days` from today (positive = future). */
export function dateFromToday(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** The specific validation message the server returned (first zod issue, else `error`). */
export async function errorMessage(res: APIResponse): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body?.issues?.[0]?.message ?? body?.error ?? "";
}

export interface GigInput {
  title: string;
  categoryId: string;
  description: string;
  location: string;
  paymentAmount: number;
  paymentType: "HOURLY" | "DAILY" | "FIXED";
  startDate: string;
  workersNeeded: number;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  requiredSkills?: string[];
  contactInfo?: string;
}

/** A valid gig body; override any field to test one rule at a time. */
export function validGig(categoryId: string, overrides: Partial<GigInput> = {}): GigInput {
  const suffix = uniqueSuffix();
  return {
    title: `E2E Gig ${suffix}`,
    categoryId,
    description: "Help serve customers and keep the café tidy during weekend rush hours.",
    location: `E2E-Location-${suffix}`,
    paymentAmount: 2500,
    paymentType: "DAILY",
    startDate: dateFromToday(3),
    workersNeeded: 2,
    requiredSkills: ["Customer service"],
    ...overrides,
  };
}

/**
 * Records everything a test creates so it can be removed afterwards, keeping
 * the shared dev database (and the job seeker gig list) clean.
 */
export class Cleanup {
  private gigs: { id: string; ownerToken: string }[] = [];
  private categoryIds: string[] = [];

  trackGig(id: string, ownerToken: string) {
    this.gigs.push({ id, ownerToken });
  }

  trackCategory(id: string) {
    this.categoryIds.push(id);
  }

  async run(request: APIRequestContext, adminToken: string) {
    for (const gig of this.gigs) {
      await request.delete(`${API_BASE_URL}/gigs/${gig.id}`, { headers: auth(gig.ownerToken) }).catch(() => {});
    }
    // A category that was ever used by a gig cannot be deleted, only deactivated.
    for (const id of this.categoryIds) {
      const res = await request
        .delete(`${API_BASE_URL}/admin/categories/${id}`, { headers: auth(adminToken) })
        .catch(() => null);
      if (res && res.status() === 409) {
        await request
          .patch(`${API_BASE_URL}/admin/categories/${id}/status`, {
            headers: auth(adminToken),
            data: { isActive: false },
          })
          .catch(() => {});
      }
    }
    this.gigs = [];
    this.categoryIds = [];
  }
}

export async function createCategory(
  request: APIRequestContext,
  adminToken: string,
  cleanup: Cleanup,
  name = `E2E Category ${uniqueSuffix()}`
): Promise<{ id: string; name: string }> {
  const res = await request.post(`${API_BASE_URL}/admin/categories`, {
    headers: auth(adminToken),
    data: { name, description: "Created by the gig posting e2e tests." },
  });
  if (!res.ok()) throw new Error(`Could not create category: ${res.status()} ${await res.text()}`);
  const { category } = await res.json();
  cleanup.trackCategory(category.id);
  return { id: category.id, name: category.name };
}

export async function createGig(
  request: APIRequestContext,
  ownerToken: string,
  cleanup: Cleanup,
  body: GigInput
): Promise<{ id: string; title: string; location: string; status: string }> {
  const res = await request.post(`${API_BASE_URL}/gigs`, { headers: auth(ownerToken), data: body });
  if (!res.ok()) throw new Error(`Could not create gig: ${res.status()} ${await res.text()}`);
  const { gig } = await res.json();
  cleanup.trackGig(gig.id, ownerToken);
  return gig;
}

export async function approveGig(request: APIRequestContext, adminToken: string, gigId: string) {
  return request.patch(`${API_BASE_URL}/admin/gigs/${gigId}/approve`, { headers: auth(adminToken) });
}

export async function rejectGig(request: APIRequestContext, adminToken: string, gigId: string, reason: string) {
  return request.patch(`${API_BASE_URL}/admin/gigs/${gigId}/reject`, {
    headers: auth(adminToken),
    data: { reason },
  });
}

/** Ids of the gigs a job seeker can currently browse. */
export async function browsableGigIds(request: APIRequestContext, token: string, query = ""): Promise<string[]> {
  const res = await request.get(`${API_BASE_URL}/gigs${query}`, { headers: auth(token) });
  if (!res.ok()) throw new Error(`Could not list gigs: ${res.status()} ${await res.text()}`);
  const { gigs } = await res.json();
  return (gigs as { id: string }[]).map((g) => g.id);
}

export async function notificationTitles(
  request: APIRequestContext,
  token: string,
  gigId: string
): Promise<string[]> {
  const res = await request.get(`${API_BASE_URL}/notifications?limit=50`, { headers: auth(token) });
  if (!res.ok()) throw new Error(`Could not list notifications: ${res.status()} ${await res.text()}`);
  const { notifications } = await res.json();
  return (notifications as { title: string; relatedEntityId?: string }[])
    .filter((n) => n.relatedEntityId === gigId)
    .map((n) => n.title);
}
