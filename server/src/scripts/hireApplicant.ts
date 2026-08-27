// Throwaway local testing utility — the real "hire an applicant" endpoint is
// out of scope for this feature (belongs to the application/hiring module).
// This just flips an existing Application straight to HIRED via Prisma so
// the review/reputation/notification pipeline can be exercised end-to-end
// locally. Not wired to any HTTP route.
import { prisma } from "../config/db";

async function main() {
  const applicationId = process.argv[2];
  if (!applicationId) {
    console.error("Usage: npm run hire -- <applicationId>");
    process.exit(1);
  }

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { status: "HIRED" },
  });

  console.log(`Application ${application.id} set to HIRED.`);
}

main()
  .catch((err) => {
    console.error("Failed to hire applicant:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
