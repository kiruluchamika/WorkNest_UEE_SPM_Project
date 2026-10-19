import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The legacy node:test suites (tests/*.test.cjs) run against dist/ via `npm test`;
    // Vitest only picks up the TypeScript unit suites.
    include: ["tests/unit/**/*.test.ts"],
    // src/config/env.ts validates these on import and exits if any are missing.
    // Values here win over .env because dotenv never overrides existing variables.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost/test",
      JWT_SECRET: "vitest-unit-test-secret-key",
      JWT_EXPIRES_IN: "1h",
      SMTP_HOST: "localhost",
      SMTP_USER: "test",
      SMTP_PASS: "test",
      SMTP_FROM: "test@example.com",
    },
    // Wipe mock calls and canned return values between tests so cases can't leak into each other.
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/services/notification.service.ts",
        "src/controllers/notification.controller.ts",
        "src/services/adminReport.service.ts",
        "src/controllers/admin-report.controller.ts",
        "src/controllers/user.controller.ts",
        "src/services/reputation.service.ts",
        "src/controllers/adminUser.controller.ts",
        "src/services/accountStatus.service.ts",
        "src/middleware/auth.middleware.ts",
      ],
    },
  },
});
