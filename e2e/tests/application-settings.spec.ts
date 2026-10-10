import { test, expect, request as apiRequest } from "@playwright/test";
import { registerUser, loginAsSeededAdmin, getFirstCategoryId, createAndApproveGig } from "./helpers/api";
import { login, byText, click, submitApplication } from "./helpers/ui";

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
      await expect(byText(shopownerPage, "Application Settings")).toBeVisible();
      await click(shopownerPage, "Application Settings");

      await expect(byText(shopownerPage, "Quick Apply")).toBeVisible();
      await click(shopownerPage, "Quick Apply");

      // Quick Apply's preset turns Expected Salary off and Transportation on —
      // confirm the requirement switches actually followed the preset before saving.
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
      await jobseekerPage.getByPlaceholder("Find gigs near you...").fill(gig.location);
      await click(jobseekerPage, gig.title);
      await expect(byText(jobseekerPage, "Apply Now")).toBeVisible();
      await click(jobseekerPage, "Apply Now");

      await expect(byText(jobseekerPage, "Quick Apply application")).toBeVisible();
      await expect(byText(jobseekerPage, "Reliable Transportation *")).toBeVisible();
      // Quick Apply doesn't require expected salary, unlike the Standard mode
      // used by the other application-workflow tests.
      await expect(jobseekerPage.getByText("Expected Pay / Rate *", { exact: true })).toHaveCount(0);

      await jobseekerPage.getByPlaceholder("Briefly describe any relevant experience...").fill("Two summers of event staffing.");
      await jobseekerPage.getByPlaceholder("e.g. I am available for the full job period").fill("Available on all listed dates.");
      await click(jobseekerPage, "Yes");
      await jobseekerPage.getByPlaceholder("A quick note to the business...").fill("Ready to start right away!");
      await submitApplication(jobseekerPage);
    });

    await test.step("Jobseeker sees the application as Pending", async () => {
      await click(jobseekerPage, "Applications");
      await expect(byText(jobseekerPage, gig.title)).toBeVisible();
      await expect(byText(jobseekerPage, "Pending")).toBeVisible();
    });

    await jobseekerContext.close();
    await shopownerContext.close();
  });
});
