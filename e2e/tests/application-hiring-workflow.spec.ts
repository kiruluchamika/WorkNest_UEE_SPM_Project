import { test, expect, request as apiRequest } from "@playwright/test";
import {
  registerUser,
  loginAsSeededAdmin,
  getFirstCategoryId,
  createAndApproveGig,
  hireApplication,
} from "./helpers/api";
import {
  login,
  byText,
  click,
  goBack,
  rowWith,
  openApplyForm,
  fillStandardApplication,
  submitApplication,
} from "./helpers/ui";

test.describe("Application & hiring workflow", () => {
  test("jobseeker applies, shop owner shortlists and hires, jobseeker sees the Hired status", async ({ browser }) => {
    const api = await apiRequest.newContext();
    const jobseeker = await registerUser(api, "jobseeker");
    const shopowner = await registerUser(api, "shopowner");
    const adminToken = await loginAsSeededAdmin(api);
    const categoryId = await getFirstCategoryId(api);
    const gig = await createAndApproveGig(api, shopowner.token, adminToken, categoryId);

    const jobseekerContext = await browser.newContext();
    const shopownerContext = await browser.newContext();
    const jobseekerPage = await jobseekerContext.newPage();
    const shopownerPage = await shopownerContext.newPage();

    await test.step("Jobseeker logs in", async () => {
      await login(jobseekerPage, jobseeker.email, jobseeker.password);
      await expect(byText(jobseekerPage, "Find gig work near you")).toBeVisible();
    });

    await test.step("Jobseeker finds the gig and applies", async () => {
      await openApplyForm(jobseekerPage, gig);
      await expect(byText(jobseekerPage, "Submit Application")).toBeVisible();

      await fillStandardApplication(jobseekerPage, {
        experience: "Two years of retail experience.",
        availability: "Available on all listed dates.",
        expectedPay: "3500",
        message: "Excited to help out on this gig!",
      });
      await submitApplication(jobseekerPage);
    });

    await test.step("Jobseeker sees the application as Pending", async () => {
      await click(jobseekerPage, "Applications");
      await expect(rowWith(jobseekerPage, gig.title, "Pending")).toBeVisible();
    });

    let applicationId = "";

    await test.step("Shop owner opens the applicant's details", async () => {
      await login(shopownerPage, shopowner.email, shopowner.password);
      await click(shopownerPage, "My Gigs");
      await click(shopownerPage, gig.title);
      await expect(byText(shopownerPage, "View Applicants (1)")).toBeVisible();
      await click(shopownerPage, "View Applicants (1)");

      await expect(byText(shopownerPage, jobseeker.name)).toBeVisible();
      const [detailsRes] = await Promise.all([
        shopownerPage.waitForResponse(
          (res) => res.request().method() === "GET" && /\/api\/applications\/[^/]+$/.test(new URL(res.url()).pathname)
        ),
        click(shopownerPage, "Review Application"),
      ]);
      applicationId = new URL(detailsRes.url()).pathname.split("/").pop()!;
      await expect(byText(shopownerPage, jobseeker.email)).toBeVisible();
    });

    await test.step("Shop owner shortlists then hires the applicant", async () => {
      await click(shopownerPage, "Shortlist Candidate");
      // The "Shortlisted" badge only appears once the shortlist write + refetch
      // have both finished.
      await expect(rowWith(shopownerPage, jobseeker.name, "Shortlisted")).toBeVisible();

      // "Hire Applicant" confirms through Alert.alert, a no-op on react-native-web,
      // so hire through the API and check the screen picks it up on its next load.
      await expect(byText(shopownerPage, "Hire Applicant")).toBeVisible();
      await hireApplication(api, shopowner.token, applicationId);

      await goBack(shopownerPage);
      await expect(rowWith(shopownerPage, jobseeker.name, "Hired")).toBeVisible();
      await click(shopownerPage, "Review Application");
      await expect(byText(shopownerPage, "Mark Work Completed")).toBeVisible();
    });

    await test.step("Jobseeker sees the application move to Hired", async () => {
      await click(jobseekerPage, "Gigs");
      await click(jobseekerPage, "Applications");
      await expect(rowWith(jobseekerPage, gig.title, "Hired")).toBeVisible();
    });

    await api.dispose();
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

    await test.step("Jobseeker applies", async () => {
      await login(jobseekerPage, jobseeker.email, jobseeker.password);
      await openApplyForm(jobseekerPage, gig);
      await expect(byText(jobseekerPage, "Submit Application")).toBeVisible();

      await fillStandardApplication(jobseekerPage, {
        experience: "Some experience.",
        availability: "Flexible.",
        expectedPay: "2500",
        message: "Please consider me.",
      });
      await submitApplication(jobseekerPage);
    });

    await test.step("Shop owner rejects the applicant", async () => {
      await login(shopownerPage, shopowner.email, shopowner.password);
      await click(shopownerPage, "My Gigs");
      await click(shopownerPage, gig.title);
      await expect(byText(shopownerPage, "View Applicants (1)")).toBeVisible();
      await click(shopownerPage, "View Applicants (1)");
      await expect(byText(shopownerPage, jobseeker.name)).toBeVisible();
      await click(shopownerPage, "Review Application");
      await expect(byText(shopownerPage, "Shortlist Candidate")).toBeVisible();

      await click(shopownerPage, "Reject Application");
      await shopownerPage
        .getByPlaceholder("e.g., Looking for more experience in commercial cleaning...")
        .fill("Looking for someone with more experience.");
      await click(shopownerPage, "Confirm Rejection");
      await expect(rowWith(shopownerPage, jobseeker.name, "Rejected")).toBeVisible();
    });

    await test.step("Jobseeker sees the application as Rejected", async () => {
      await click(jobseekerPage, "Gigs");
      await click(jobseekerPage, "Applications");
      await expect(rowWith(jobseekerPage, gig.title, "Rejected")).toBeVisible();
    });

    await jobseekerContext.close();
    await shopownerContext.close();
  });
});
