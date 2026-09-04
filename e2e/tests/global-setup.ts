import { execSync } from "child_process";
import path from "path";

/**
 * The hiring workflow needs an admin account to approve the test gig, and
 * admins can't self-register through the public API. server/prisma/seed.ts
 * upserts the demo admin (admin@worknest.dev / "password") plus the gig
 * categories the test needs, so running it here guarantees both exist
 * regardless of what's already in the connected dev database.
 *
 * The dev DB is a Neon serverless Postgres instance that suspends itself
 * when idle, so the very first connection after a while can fail while it
 * wakes back up — retry a couple of times before giving up.
 */
export default function globalSetup() {
  const serverDir = path.resolve(__dirname, "../../server");
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      execSync("npm run prisma:seed", { cwd: serverDir, stdio: "inherit" });
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      console.warn(`prisma:seed failed (attempt ${attempt}/${attempts}), retrying in 5s — likely the dev DB waking up...`);
      execSync("node -e \"setTimeout(() => {}, 5000)\"");
    }
  }
}
