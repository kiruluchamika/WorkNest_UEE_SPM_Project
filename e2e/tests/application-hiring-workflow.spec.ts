import { test, expect, request as apiRequest } from "@playwright/test";
import { registerUser, loginAsSeededAdmin, getFirstCategoryId, createAndApproveGig } from "./helpers/api";
import { login, byText, click, clickAndConfirm, registerDialogAutoAccept, submitApplication } from "./helpers/ui";

test.describe("Application & hiring workflow", () => {
  test("jobseeker applies, shop owner shortlists and hires, jobseeker sees the Hired status", async ({ browser }) => {
    const api = await apiRequest.newContext();
    const jobseeker = await registerUser(api, "jobseeker");
    const shopowner = await registerUser(api, "shopowner");
    const adminToken = await loginAsSeededAdmin(api);
    const categoryId = await getFirstCategoryId(api);
    const gig = await createAndApproveGig(api, shopowner.token, adminToken, categoryId);
    await api.dispose();

    const jobseekerContext = await browser.newContext();
    const shopownerContext = await browser.newContext();
    const jobseekerPage = await jobseekerContext.newPage();
    const shopownerPage = await shopownerContext.newPage();
    registerDialogAutoAccept(shopownerPage);

    await test.step("Jobseeker logs in", async () => {
      await login(jobseekerPage, jobseeker.email, jobseeker.password);
      await expect(byText(jobseekerPage, "Browse Gigs")).toBeVisible();
    });

    await test.step("Jobseeker finds the gig and applies", async () => {
      await jobseekerPage.getByPlaceholder("Find gigs near you...").fill(gig.location);
      await click(jobseekerPage, gig.title);
      await expect(byText(jobseekerPage, "Apply Now")).toBeVisible();
      await click(jobseekerPage, "Apply Now");
      await expect(byText(jobseekerPage, "Submit Application")).toBeVisible();

      await jobseekerPage.getByPlaceholder("Briefly describe any relevant experience...").fill("Two years of retail experience.");
      await jobseekerPage.getByPlaceholder("e.g. I am available for the full job period").fill("Available on all listed dates.");
      await jobseekerPage.getByPlaceholder("e.g. 3500").fill("3500");
      await jobseekerPage.getByPlaceholder("A quick note to the business...").fill("Excited to help out on this gig!");
      await submitApplication(jobseekerPage);
    });

    await test.step("Jobseeker sees the application as Pending", async () => {
      await click(jobseekerPage, "Applications");
      await expect(byText(jobseekerPage, gig.title)).toBeVisible();
      await expect(byText(jobseekerPage, "Pending")).toBeVisible();
    });

    await test.step("Shop owner opens the applicant's details", async () => {
      await login(shopownerPage, shopowner.email, shopowner.password);
      await click(shopownerPage, "My Gigs");
      await click(shopownerPage, gig.title);
      await expect(byText(shopownerPage, "View Applicants")).toBeVisible();
      await click(shopownerPage, "View Applicants");

      await expect(byText(shopownerPage, jobseeker.name)).toBeVisible();
      await click(shopownerPage, "View Application");
      await expect(shopownerPage.getByText(jobseeker.email)).toBeVisible();
    });

    await test.step("Shop owner shortlists then hires the applicant", async () => {
      await click(shopownerPage, "Shortlist");
      // "Hire"/"Reject" are always rendered (even pre-shortlist) and stay disabled
      // while the Shortlist action is in flight — waiting for "Hire" to be visible
      // proves nothing. The "Shortlisted" status badge only appears once the
      // shortlist write + refetch have both finished and the button is re-enabled.
      await expect(byText(shopownerPage, "Shortlisted")).toBeVisible();

      await clickAndConfirm(shopownerPage, "Hire");
      await expect(byText(shopownerPage, "Mark Work Completed")).toBeVisible();
    });

    await test.step("Jobseeker sees the application move to Hired", async () => {
      await click(jobseekerPage, "Gigs");
      await click(jobseekerPage, "Applications");
      await expect(byText(jobseekerPage, "Hired")).toBeVisible();
    });

    await jobseekerContext.close();
    await shopownerContext.close();
  });

  test("shop owner can reject an applicant", async ({ browser }) => {
    const api = await apiRequest.newContext();
    const jobseeker = await registerUser(api, "jobseeker");
    const shopowner = await registerUser(api, "shopowner");
    const adminToken = await loginAsSeededAdmin(api);
    const categoryId = await getFirstCategoryId(api);
    const gig = await createAndApproveGig(api, shopowner.token, adminToken, categoryId);
    await api.dispose();

    const jobseekerContext = await browser.newContext();
    const shopownerContext = await browser.newContext();
    const jobseekerPage = await jobseekerContext.newPage();
    const shopownerPage = await shopownerContext.newPage();
    registerDialogAutoAccept(shopownerPage);

    await test.step("Jobseeker applies", async () => {
      await login(jobseekerPage, jobseeker.email, jobseeker.password);
      await jobseekerPage.getByPlaceholder("Find gigs near you...").fill(gig.location);
      await click(jobseekerPage, gig.title);
      await expect(byText(jobseekerPage, "Apply Now")).toBeVisible();
      await click(jobseekerPage, "Apply Now");
      await expect(byText(jobseekerPage, "Submit Application")).toBeVisible();

      await jobseekerPage.getByPlaceholder("Briefly describe any relevant experience...").fill("Some experience.");
      await jobseekerPage.getByPlaceholder("e.g. I am available for the full job period").fill("Flexible.");
      await jobseekerPage.getByPlaceholder("e.g. 3500").fill("2500");
      await jobseekerPage.getByPlaceholder("A quick note to the business...").fill("Please consider me.");
      await submitApplication(jobseekerPage);
    });

    await test.step("Shop owner rejects the applicant", async () => {
      await login(shopownerPage, shopowner.email, shopowner.password);
      await click(shopownerPage, "My Gigs");
      await click(shopownerPage, gig.title);
      await expect(byText(shopownerPage, "View Applicants")).toBeVisible();
      await click(shopownerPage, "View Applicants");
      await expect(byText(shopownerPage, jobseeker.name)).toBeVisible();
      await click(shopownerPage, "View Application");
      await expect(byText(shopownerPage, "Shortlist")).toBeVisible();

      await clickAndConfirm(shopownerPage, "Reject");
      await expect(shopownerPage.getByText("Rejected").first()).toBeVisible();
    });

    await test.step("Jobseeker sees the application as Rejected", async () => {
      await click(jobseekerPage, "Gigs");
      await click(jobseekerPage, "Applications");
      await expect(byText(jobseekerPage, "Rejected")).toBeVisible();
    });

    await jobseekerContext.close();
    await shopownerContext.close();
  });
});
