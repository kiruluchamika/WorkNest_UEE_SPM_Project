import { test, expect, request as apiRequest, type Page } from "@playwright/test";
import { API_BASE_URL, loginAsSeededAdmin, registerUser } from "./helpers/api";
import { login, byText, click, clickAndConfirm, registerDialogAutoAccept } from "./helpers/ui";
import { Cleanup, auth, createCategory, createGig, dateFromToday, uniqueSuffix, validGig } from "./helpers/gigPosting";

const ADMIN = { email: "admin@worknest.dev", password: "password" };

async function newPage(browser: import("@playwright/test").Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Approve / Deactivate ask for confirmation through window.confirm on web.
  registerDialogAutoAccept(page);
  return page;
}

/**
 * The full gig posting workflow, driven through the real screens (Expo Web):
 * admin creates a category -> shop owner posts a gig with it -> admin
 * approves (or rejects) it -> the job seeker can (or cannot) find it.
 */
test.describe("Gig posting workflow (UI)", () => {
  test("TC-E2E-01 category -> post gig -> admin approves -> job seeker sees the gig", async ({ browser }) => {
    const api = await apiRequest.newContext();
    const cleanup = new Cleanup();
    const adminToken = await loginAsSeededAdmin(api);
    const owner = await registerUser(api, "shopowner");
    const jobseeker = await registerUser(api, "jobseeker");

    const suffix = uniqueSuffix();
    const categoryName = `E2E UI Category ${suffix}`;
    const gigTitle = `E2E UI Gig ${suffix}`;
    const gigLocation = `E2E-UI-Location-${suffix}`;

    const adminPage = await newPage(browser);
    const ownerPage = await newPage(browser);
    const jobseekerPage = await newPage(browser);

    try {
      await test.step("1. Admin creates a category", async () => {
        await login(adminPage, ADMIN.email, ADMIN.password);
        await click(adminPage, "Categories");
        await click(adminPage, "+ Add Category");
        await adminPage.getByPlaceholder("e.g. Retail").fill(categoryName);
        await adminPage.getByPlaceholder("Briefly describe this category...").fill("Created by the UI e2e test.");

        const [response] = await Promise.all([
          adminPage.waitForResponse(
            (res) => res.request().method() === "POST" && res.url().endsWith("/api/admin/categories")
          ),
          click(adminPage, "Create category"),
        ]);
        expect(response.status()).toBe(201);
        cleanup.trackCategory((await response.json()).category.id);

        await expect(byText(adminPage, categoryName)).toBeVisible();
      });

      await test.step("2. Shop owner posts a gig in that category", async () => {
        await login(ownerPage, owner.email, owner.password);
        await click(ownerPage, "Post Gig");

        await ownerPage.getByPlaceholder("e.g. Weekend Café Assistant").fill(gigTitle);
        await click(ownerPage, "Select a category");
        await click(ownerPage, categoryName);
        await ownerPage
          .getByPlaceholder("Describe the role, tasks, and expectations...")
          .fill("Help serve customers and keep the café tidy during weekend rush hours.");
        await ownerPage.getByPlaceholder("e.g. Colombo 05").fill(gigLocation);
        await ownerPage.getByPlaceholder("Customer service, Cash handling").fill("Customer service, Cash handling");
        await ownerPage.getByPlaceholder("2500").fill("2500");
        await ownerPage.getByLabel("Start Date").fill(dateFromToday(3));

        const [response] = await Promise.all([
          ownerPage.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/api/gigs")),
          click(ownerPage, "Submit for approval"),
        ]);
        expect(response.status()).toBe(201);
        const { gig } = await response.json();
        cleanup.trackGig(gig.id, owner.token);
        expect(gig.status).toBe("PENDING");

        await expect(byText(ownerPage, "Gig submitted successfully.")).toBeVisible();
      });

      await test.step("3. Admin approves the gig", async () => {
        // The Gigs tab reloads its Pending list (the default tab) whenever it gains focus.
        await click(adminPage, "Gigs");
        await click(adminPage, gigTitle);

        await expect(byText(adminPage, gigLocation)).toBeVisible();
        await Promise.all([
          adminPage.waitForResponse(
            (res) => res.request().method() === "PATCH" && res.url().includes("/approve") && res.ok()
          ),
          clickAndConfirm(adminPage, "Approve"),
        ]);
      });

      await test.step("4. Job seeker finds and opens the approved gig", async () => {
        await login(jobseekerPage, jobseeker.email, jobseeker.password);
        await jobseekerPage.getByPlaceholder("Search by title, skills, location...").fill(gigLocation);
        await expect(byText(jobseekerPage, gigTitle)).toBeVisible();

        await click(jobseekerPage, gigTitle);
        await expect(byText(jobseekerPage, "Gig Details")).toBeVisible();
        await expect(byText(jobseekerPage, gigLocation)).toBeVisible();
        await expect(byText(jobseekerPage, "Apply for this Gig")).toBeVisible();
      });
    } finally {
      await cleanup.run(api, adminToken);
      await api.dispose();
      await adminPage.context().close();
      await ownerPage.context().close();
      await jobseekerPage.context().close();
    }
  });

  test("TC-E2E-02 admin rejects a gig -> owner sees the reason -> job seeker cannot see it", async ({ browser }) => {
    const api = await apiRequest.newContext();
    const cleanup = new Cleanup();
    const adminToken = await loginAsSeededAdmin(api);
    const owner = await registerUser(api, "shopowner");
    const jobseeker = await registerUser(api, "jobseeker");
    const category = await createCategory(api, adminToken, cleanup);
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    const reason = "Please add the exact shop address.";

    const adminPage = await newPage(browser);
    const ownerPage = await newPage(browser);

    try {
      await test.step("Admin rejects the gig with a reason", async () => {
        await login(adminPage, ADMIN.email, ADMIN.password);
        await click(adminPage, gig.title);

        await click(adminPage, "Reject");
        await adminPage.getByPlaceholder("Rejection reason...").fill(reason);
        await Promise.all([
          adminPage.waitForResponse(
            (res) => res.request().method() === "PATCH" && res.url().includes("/reject") && res.ok()
          ),
          // The modal's title is also "Reject Gig"; the submit button is the last match.
          adminPage
            .getByText("Reject Gig", { exact: true })
            .last()
            .evaluate((el) => (el as HTMLElement).click()),
        ]);
      });

      await test.step("Shop owner sees the rejection reason", async () => {
        await login(ownerPage, owner.email, owner.password);
        await click(ownerPage, "My Gigs");
        await click(ownerPage, gig.title);
        await expect(byText(ownerPage, "Gig Needs Changes")).toBeVisible();
        await expect(byText(ownerPage, reason)).toBeVisible();
        await expect(byText(ownerPage, "Resubmit for Review")).toBeVisible();
      });

      await test.step("The rejected gig is not offered to job seekers", async () => {
        const res = await api.get(`${API_BASE_URL}/gigs`, { headers: auth(jobseeker.token) });
        const { gigs } = await res.json();
        expect(gigs.map((g: { id: string }) => g.id)).not.toContain(gig.id);
      });
    } finally {
      await cleanup.run(api, adminToken);
      await api.dispose();
      await adminPage.context().close();
      await ownerPage.context().close();
    }
  });
});
