import { defineConfig, devices } from "@playwright/test";

// The app is React Native/Expo, not a web app by default — Playwright can only
// drive it through the Expo Web build (react-native-web), so these ports
// point at `expo start --web` and the Express API it talks to.
const WEB_PORT = process.env.E2E_WEB_PORT || "8081";
const SERVER_PORT = process.env.E2E_SERVER_PORT || "4000";
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "./tests",
  globalSetup: require.resolve("./tests/global-setup"),
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // A little above Playwright's 30s default to absorb an occasional slow
  // first Metro compile or a cold-started dev database, without masking a
  // genuine hang for minutes on end.
  timeout: 90_000,
  // Several assertions follow a screen that shows a full-screen loading spinner
  // until its own data fetch resolves (e.g. Browse Gigs), and status-change actions
  // (Hire/Reject) do a write then a full refetch — two real network round trips
  // against a Neon-backed dev DB, measured to legitimately take ~6s under load
  // with two concurrent browser contexts open. 10s cut it close; 20s gives headroom.
  expect: { timeout: 20_000 },
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev",
      cwd: "../server",
      url: `http://localhost:${SERVER_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx expo start --web --port ${WEB_PORT}`,
      cwd: "../app",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Keeps the Expo CLI non-interactive and stops it auto-opening a browser tab.
      env: { CI: "1" },
    },
  ],
});
