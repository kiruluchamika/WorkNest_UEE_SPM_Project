import { test, expect, request as apiRequest } from "@playwright/test";
import { registerUser, loginAsSeededAdmin, getFirstCategoryId, createAndApproveGig } from "./helpers/api";
import {
  login,
  byText,
  click,
  clickAndConfirm,
  registerDialogAutoAccept,
  rowWith,
  openApplyForm,
  fillStandardApplication,
  submitApplication,
} from "./helpers/ui";

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
      await openApplyForm(page, gig);
      await expect(byText(page, "Submit Application")).toBeVisible();

      await fillStandardApplication(page, {
        experience: "Two years of retail experience.",
        availability: "Available on all listed dates.",
        expectedPay: "3500",
        message: "Excited to help out on this gig!",
      });
      await submitApplication(page);
    });

    await test.step("Jobseeker opens the application and withdraws it", async () => {
      await click(page, "Applications");
      await expect(rowWith(page, gig.title, "Pending")).toBeVisible();

      // The gig title is also still mounted on the Browse and Apply screens, so
      // open the card through its "Details" link, which only exists here.
      await click(page, "Details");
      await expect(byText(page, "Withdraw Application")).toBeVisible();

      await clickAndConfirm(page, "Withdraw Application");
      await expect(byText(page, "Application Withdrawn")).toBeVisible();
    });

    await test.step("The withdrawn status is reflected back in the applications list", async () => {
      await click(page, "Gigs");
      await click(page, "Applications");
      await expect(rowWith(page, gig.title, "Withdrawn")).toBeVisible();
    });

    await context.close();
  });
});
