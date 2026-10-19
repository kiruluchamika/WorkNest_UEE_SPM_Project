import { test, expect, request as apiRequest } from "@playwright/test";
import { registerUser, loginAsSeededAdmin, getFirstCategoryId, createAndApproveGig } from "./helpers/api";
import { login, byText, click, rowWith, openApplyForm, submitApplication } from "./helpers/ui";

test.describe("Application settings — Quick Apply mode", () => {
  test("shop owner sets Quick Apply mode and the jobseeker sees the right required fields", async ({ browser }) => {
    const api = await apiRequest.newContext();
    const jobseeker = await registerUser(api, "jobseeker");
    const shopowner = await registerUser(api, "shopowner");
    const adminToken = await loginAsSeededAdmin(api);
    const categoryId = await getFirstCategoryId(api);
    const gig = await createAndApproveGig(api, shopowner.token, adminToken, categoryId);
    await api.dispose();

    const shopownerContext = await browser.newContext();
    const jobseekerContext = await browser.newContext();
    const shopownerPage = await shopownerContext.newPage();
    const jobseekerPage = await jobseekerContext.newPage();

    await test.step("Shop owner switches the gig's application method to Quick Apply", async () => {
      await login(shopownerPage, shopowner.email, shopowner.password);
      await click(shopownerPage, "My Gigs");
      await click(shopownerPage, gig.title);
      await expect(byText(shopownerPage, "Configure Application Settings")).toBeVisible();
      await click(shopownerPage, "Configure Application Settings");

      await expect(byText(shopownerPage, "Quick Apply")).toBeVisible();
      await click(shopownerPage, "Quick Apply");
      await expect(byText(shopownerPage, "Transportation")).toBeVisible();

      await Promise.all([
        shopownerPage.waitForResponse(
          (res) =>
            (res.request().method() === "POST" || res.request().method() === "PUT") &&
            res.url().includes(`/api/application-settings/${gig.id}`)
        ),
        click(shopownerPage, "Save Application Settings"),
      ]);
    });

    await test.step("Jobseeker's apply form reflects the Quick Apply requirements", async () => {
      await login(jobseekerPage, jobseeker.email, jobseeker.password);
      await openApplyForm(jobseekerPage, gig);

      await expect(byText(jobseekerPage, "Quick Apply Application")).toBeVisible();
      await expect(byText(jobseekerPage, "Reliable Transportation *")).toBeVisible();
      // Quick Apply doesn't require expected pay, unlike the Standard mode
      // used by the other application-workflow tests.
      await expect(jobseekerPage.getByText("Expected Pay / Rate (LKR)", { exact: true })).toHaveCount(0);

      await jobseekerPage
        .getByPlaceholder("Briefly describe any relevant work experience or skills...")
        .fill("Two summers of event staffing.");
      await jobseekerPage
        .getByPlaceholder("e.g., Available all days for the specified gig hours")
        .fill("Available on all listed dates.");
      await click(jobseekerPage, "Yes");
      await jobseekerPage.getByPlaceholder("A brief greeting or introduction...").fill("Ready to start right away!");
      await submitApplication(jobseekerPage);
    });

    await test.step("Jobseeker sees the application as Pending", async () => {
      await click(jobseekerPage, "Applications");
      await expect(rowWith(jobseekerPage, gig.title, "Pending")).toBeVisible();
    });

    await jobseekerContext.close();
    await shopownerContext.close();
  });
});
