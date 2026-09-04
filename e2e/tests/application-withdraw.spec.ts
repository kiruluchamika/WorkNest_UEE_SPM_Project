import { test, expect, request as apiRequest } from "@playwright/test";
import { registerUser, loginAsSeededAdmin, getFirstCategoryId, createAndApproveGig } from "./helpers/api";
import { login, byText, click, clickAndConfirm, registerDialogAutoAccept, submitApplication } from "./helpers/ui";

test.describe("Application management — withdraw", () => {
  test("jobseeker can withdraw a pending application", async ({ browser }) => {
    const api = await apiRequest.newContext();
    const jobseeker = await registerUser(api, "jobseeker");
    const shopowner = await registerUser(api, "shopowner");
    const adminToken = await loginAsSeededAdmin(api);
    const categoryId = await getFirstCategoryId(api);
    const gig = await createAndApproveGig(api, shopowner.token, adminToken, categoryId);
    await api.dispose();

    const context = await browser.newContext();
    const page = await context.newPage();
    registerDialogAutoAccept(page);

    await test.step("Jobseeker applies to the gig", async () => {
      await login(page, jobseeker.email, jobseeker.password);
      await page.getByPlaceholder("Find gigs near you...").fill(gig.location);
      await click(page, gig.title);
      await expect(byText(page, "Apply Now")).toBeVisible();
      await click(page, "Apply Now");
      await expect(byText(page, "Submit Application")).toBeVisible();

      await page.getByPlaceholder("Briefly describe any relevant experience...").fill("Two years of retail experience.");
      await page.getByPlaceholder("e.g. I am available for the full job period").fill("Available on all listed dates.");
      await page.getByPlaceholder("e.g. 3500").fill("3500");
      await page.getByPlaceholder("A quick note to the business...").fill("Excited to help out on this gig!");
      await submitApplication(page);
    });

    await test.step("Jobseeker opens the application and withdraws it", async () => {
      await click(page, "Applications");
      await expect(byText(page, gig.title)).toBeVisible();
      await expect(byText(page, "Pending")).toBeVisible();

      await click(page, "View Application");
      await expect(byText(page, "Withdraw Application")).toBeVisible();

      await clickAndConfirm(page, "Withdraw Application");
      await expect(byText(page, "Withdrawn")).toBeVisible();
    });

    await test.step("The withdrawn status is reflected back in the applications list", async () => {
      await click(page, "Gigs");
      await click(page, "Applications");
      await expect(byText(page, "Withdrawn")).toBeVisible();
    });

    await context.close();
  });
});
