import type { Page } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  // A fresh browser context (no localStorage yet) always lands on the onboarding
  // carousel first, then a role-select screen, before Login is reachable.
  await page.getByText("Skip", { exact: true }).click();
  await page.getByText("Log in", { exact: true }).click();
  await page.getByPlaceholder("Enter your email").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByText("Sign in", { exact: true }).click();
}

/**
 * react-native-web renders these as plain divs with no ARIA role, so text is the
 * reliable locator. react-native-web's `numberOfLines`-truncated <Text> (e.g. gig
 * titles) renders a second DOM node with identical text content (sometimes hidden,
 * sometimes visible-but-overlapping, depending on the screen) — `:visible` drops
 * a genuinely hidden duplicate where there is one, and `.first()` on top of that
 * deterministically picks one of two visible, co-located duplicates.
 */
export function byText(page: Page, text: string) {
  return page.getByText(text, { exact: true }).and(page.locator(":visible")).first();
}

/**
 * List screens wrapped in a pull-to-refresh ScrollView have an overlapping scroll
 * content container that sits on top of list items in real screen coordinates, so
 * Playwright's coordinate-based click() — even with force:true — actually lands on
 * that wrapper instead of the item, silently doing nothing. Dispatching a native
 * `element.click()` targets the resolved element directly regardless of what's
 * visually stacked on top, which bubbles normally to the real press handler.
 */
export async function click(page: Page, text: string) {
  await byText(page, text).evaluate((el) => (el as HTMLElement).click());
}

/**
 * Buttons gated behind a window.confirm() (see app/src/utils/confirm.ts) need a
 * normal mouse-simulated click() — the well-supported pairing with Playwright's
 * dialog handling — rather than the evaluate-based native click above, which
 * interacts badly with that synchronous blocking dialog. Only safe on screens with
 * no pull-to-refresh ScrollView overlay to intercept a normal click (e.g.
 * ApplicantDetailsScreen, ApplicationDetailsScreen — plain ScrollViews, no
 * RefreshControl).
 */
export async function clickAndConfirm(page: Page, text: string) {
  await byText(page, text).click();
}

/**
 * Registers a persistent confirm-dialog auto-accepter for the page's whole lifetime.
 * Register once right after creating the page, not per click — a fresh `.once()`
 * before each click leaves a race window where a stray duplicate press (react-native-web
 * sometimes fires more than one press event for a single real click) can pop a second,
 * unhandled dialog that Playwright's default behavior then auto-dismisses, silently
 * cancelling the action.
 */
export function registerDialogAutoAccept(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
}

/** Waits for the actual POST /api/applications round trip, not just the click event. */
export async function submitApplication(page: Page) {
  await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST" && res.url().endsWith("/api/applications")),
    click(page, "Submit Application"),
  ]);
}
