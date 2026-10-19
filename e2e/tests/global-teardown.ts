import { execSync } from "child_process";
import path from "path";

/**
 * Every test registers fresh users and gigs against the shared dev database,
 * so once the suite finishes, server/prisma/cleanupE2E.ts deletes everything
 * it left behind (e2e-*@worknest.test users, "E2E ..." gigs and every row
 * hanging off them). Real accounts are never touched.
 *
 * Set E2E_KEEP_DATA=1 to skip this and inspect the test data after a run.
 */
export default function globalTeardown() {
  if (process.env.E2E_KEEP_DATA) {
    console.log("E2E_KEEP_DATA is set, leaving e2e test data in the database.");
    return;
  }

  const serverDir = path.resolve(__dirname, "../../server");
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      execSync("npm run prisma:cleanup-e2e -- --confirm", { cwd: serverDir, stdio: "inherit" });
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      console.warn(`prisma:cleanup-e2e failed (attempt ${attempt}/${attempts}), retrying in 5s...`);
      execSync("node -e \"setTimeout(() => {}, 5000)\"");
    }
  }
}
