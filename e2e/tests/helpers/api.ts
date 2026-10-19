import type { APIRequestContext } from "@playwright/test";

const SERVER_PORT = process.env.E2E_SERVER_PORT || "4000";
export const API_BASE_URL = process.env.E2E_API_URL || `http://localhost:${SERVER_PORT}/api`;

export interface TestUser {
  name: string;
  email: string;
  password: string;
  token: string;
  id: string;
}

async function asJson(res: Awaited<ReturnType<APIRequestContext["post"]>>) {
  if (!res.ok()) {
    throw new Error(`${res.url()} -> ${res.status()}: ${await res.text()}`);
  }
  return res.json();
}

/** Registers a fresh jobseeker/shopowner so each test run is isolated from any existing data. */
export async function registerUser(
  request: APIRequestContext,
  role: "jobseeker" | "shopowner",
  overrides: Partial<{ name: string; email: string; password: string }> = {}
): Promise<TestUser> {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const name = overrides.name ?? (role === "jobseeker" ? `E2E Jobseeker ${suffix}` : `E2E Shop Owner ${suffix}`);
  const email = overrides.email ?? `e2e-${role}-${suffix}@worknest.test`;
  const password = overrides.password ?? "Passw0rd!";

  const res = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { name, email, password, role },
  });
  const body = await asJson(res);
  return { name, email, password, token: body.token, id: body.user.id };
}

/**
 * Admin accounts can't self-register (the public register endpoint only
 * accepts jobseeker/shopowner/verifier), so this relies on the demo admin
 * seeded by server/prisma/seed.ts. Running the seed script is idempotent
 * (it upserts by email), so it's safe to run it before the suite every time.
 */
export async function loginAsSeededAdmin(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: "admin@worknest.dev", password: "password" },
  });
  if (!res.ok()) {
    throw new Error(
      `Could not log in as the seeded admin (admin@worknest.dev). ` +
        `Run "npm run prisma:seed" in server/ before running the e2e suite. ` +
        `(${res.status()}: ${await res.text()})`
    );
  }
  const body = await res.json();
  return body.token as string;
}

export async function getFirstCategoryId(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${API_BASE_URL}/categories`);
  const body = await asJson(res);
  const categories = body.categories ?? body;
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error(
      "No categories available to create a test gig. Run \"npm run prisma:seed\" in server/ first."
    );
  }
  return categories[0].id as string;
}

/**
 * ApplicantDetailsScreen gates Hire behind a multi-button Alert.alert, which
 * react-native-web stubs as a no-op, so the Hire button can't be driven from a
 * browser. The test hires through the same endpoint the button calls instead.
 */
export async function hireApplication(request: APIRequestContext, shopownerToken: string, applicationId: string) {
  const res = await request.patch(`${API_BASE_URL}/applications/${applicationId}/hire`, {
    headers: { Authorization: `Bearer ${shopownerToken}` },
  });
  await asJson(res);
}

export interface CreatedGig {
  id: string;
  title: string;
  location: string;
}

/**
 * Creates a gig as the shop owner and immediately approves it as admin, since
 * a gig only accepts applications once its status moves PENDING -> ACTIVE.
 * The location is tagged with a unique suffix so the jobseeker can find this
 * exact gig in the (potentially long, virtualized) Browse Gigs list.
 */
export async function createAndApproveGig(
  request: APIRequestContext,
  shopownerToken: string,
  adminToken: string,
  categoryId: string
): Promise<CreatedGig> {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const title = `E2E Test Gig ${suffix}`;
  const location = `E2E-Location-${suffix}`;
  const startDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const createRes = await request.post(`${API_BASE_URL}/gigs`, {
    headers: { Authorization: `Bearer ${shopownerToken}` },
    data: {
      title,
      categoryId,
      description: "Playwright end-to-end test gig covering the application and hiring workflow.",
      location,
      paymentAmount: 3000,
      paymentType: "FIXED",
      startDate,
      workersNeeded: 1,
      requiredSkills: ["Reliability"],
    },
  });
  const { gig } = await asJson(createRes);

  const approveRes = await request.patch(`${API_BASE_URL}/admin/gigs/${gig.id}/approve`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await asJson(approveRes);

  return { id: gig.id, title, location };
}
