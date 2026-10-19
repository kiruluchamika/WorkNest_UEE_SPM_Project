# WorkNest E2E — Application & Hiring Workflow

Playwright suite covering the jobseeker-applies / shop-owner-hires workflow.

## Why this runs against Expo Web

WorkNest's `app/` is a React Native (Expo) app, not a website — Playwright can only
drive it as a browser, so these tests run against the Expo Web build
(`expo start --web`, powered by `react-native-web`), not the iOS/Android app.
Anything that only exists on native (camera, push notifications, etc.) is out of
scope here.

## First-time setup

```bash
cd e2e
npm install
npx playwright install chromium
```

Make sure `server/.env` has a working `DATABASE_URL` (same one you use for local dev).

## Running

```bash
npm test          # headless
npm run test:headed
npm run test:ui    # interactive UI mode, great for debugging locators
npm run report     # open the last HTML report
```

Playwright's `webServer` config starts both the backend (`npm run dev` in `server/`)
and the Expo web build (`npx expo start --web` in `app/`) automatically and waits for
them to be ready. If you already have them running locally, Playwright reuses them
instead of starting new ones.

Before the suite runs, `tests/global-setup.ts` runs `npm run prisma:seed` in `server/`
so the demo admin (`admin@worknest.dev`) and gig categories exist — needed because a
gig only accepts applications once an admin approves it, and admin accounts can't
self-register. This is idempotent (upserts by email), safe to run repeatedly against
your dev database.

## How test data is set up

Each test registers a fresh jobseeker + shop owner via the real `/api/auth/register`
endpoint, creates a gig as that shop owner, and approves it as admin — all via direct
API calls (see `tests/helpers/api.ts`), so every run is isolated and doesn't depend on
what's already in the database. The actual apply/shortlist/hire/reject steps are then
driven through the real UI in a browser.

## Cleanup after a run

When the suite finishes (pass or fail), `tests/global-teardown.ts` runs
`npm run prisma:cleanup-e2e -- --confirm` in `server/`, which deletes every
`e2e-*@worknest.test` user, every `E2E ...` gig and all rows hanging off them
(applications, notifications, settings...). Real accounts are never deleted.

```bash
E2E_KEEP_DATA=1 npm test                   # keep the test data to inspect it
cd ../server && npm run prisma:cleanup-e2e # dry run: list leftover e2e data
```

## A note on `Alert.alert` on web

`react-native-web` stubs `Alert.alert()` as a no-op, so any flow gated behind a native
confirm dialog does nothing when clicked in a browser. Screens that use
`app/src/utils/confirm.ts` (e.g. Withdraw Application) fall back to `window.confirm`
on web, so the tests click those for real. `ApplicantDetailsScreen`'s Hire button still
confirms through `Alert.alert`, so the hiring test hires through the API
(`hireApplication` in `tests/helpers/api.ts`) and then checks the UI reflects it.
Reject uses an in-app modal and is driven through the UI.

## Ports

Override if 4000/8081 are taken locally:

```bash
E2E_SERVER_PORT=4001 E2E_WEB_PORT=8082 npm test
```
