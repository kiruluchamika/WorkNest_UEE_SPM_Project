// Removes the data the Playwright e2e suite (e2e/) leaves behind in the dev database:
// users registered as `e2e-<role>-<suffix>@worknest.test`, gigs titled "E2E ..." or
// located at "E2E-Location-...", categories named "E2E Category ...", and every row
// that hangs off them (applications, reviews, notifications, verification records...).
//
//   npm run prisma:cleanup-e2e              (dry run: only prints what would be removed)
//   npm run prisma:cleanup-e2e -- --confirm (actually deletes, in one transaction)
//
// Real accounts are never deleted. If a real user applied to an e2e gig, that
// application goes with the gig, and the dry run lists it so you can check first.
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");

const isTestUser: Prisma.UserWhereInput = {
  OR: [{ email: { startsWith: "e2e-", mode: "insensitive" } }, { email: { endsWith: "@worknest.test", mode: "insensitive" } }],
};

async function main() {
  const users = await prisma.user.findMany({ where: isTestUser, select: { id: true, email: true, role: true } });
  const userIds = users.map((u) => u.id);

  const categories = await prisma.category.findMany({
    where: { name: { startsWith: "E2E ", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const categoryIds = categories.map((c) => c.id);

  const gigs = await prisma.gigPost.findMany({
    where: {
      OR: [
        { businessId: { in: userIds } },
        { categoryId: { in: categoryIds } },
        { title: { startsWith: "E2E ", mode: "insensitive" } },
        { location: { startsWith: "E2E-Location-", mode: "insensitive" } },
      ],
    },
    select: { id: true, title: true },
  });
  const gigIds = gigs.map((g) => g.id);

  const applications = await prisma.application.findMany({
    where: { OR: [{ gigPostId: { in: gigIds } }, { applicantId: { in: userIds } }] },
    select: { id: true, applicantId: true, applicant: { select: { email: true } } },
  });
  const applicationIds = applications.map((a) => a.id);

  const reviews = await prisma.review.findMany({
    where: { OR: [{ gigId: { in: gigIds } }, { reviewerId: { in: userIds } }, { revieweeId: { in: userIds } }] },
    select: { id: true },
  });
  const reviewIds = reviews.map((r) => r.id);

  const verifierApplicationIds = (
    await prisma.verifierApplication.findMany({ where: { applicantId: { in: userIds } }, select: { id: true } })
  ).map((v) => v.id);
  const verificationRequestIds = (
    await prisma.verificationRequest.findMany({ where: { applicantId: { in: userIds } }, select: { id: true } })
  ).map((v) => v.id);
  const revocationIds = (
    await prisma.verificationRevocation.findMany({
      where: { verificationRequestId: { in: verificationRequestIds } },
      select: { id: true },
    })
  ).map((r) => r.id);

  const where = {
    moderationAudit: { reviewId: { in: reviewIds } },
    reviewReport: { OR: [{ reviewId: { in: reviewIds } }, { reporterId: { in: userIds } }] },
    notification: {
      OR: [{ recipientId: { in: userIds } }, { relatedEntityId: { in: [...gigIds, ...applicationIds, ...reviewIds] } }],
    },
    workHistoryEntry: {
      OR: [{ gigId: { in: gigIds } }, { applicationId: { in: applicationIds } }, { userId: { in: userIds } }],
    },
    reputationAudit: { userId: { in: userIds } },
    userStatusEvent: { userId: { in: userIds } },
    reactivationRequest: {
      OR: [{ verifierId: { in: userIds } }, { verifierApplicationId: { in: verifierApplicationIds } }],
    },
    suspensionEvent: { verifierApplicationId: { in: verifierApplicationIds } },
  } satisfies Record<string, unknown>;

  // Real rows that merely point at a test user in an optional column; these are unlinked, not deleted.
  const unlinkCounts = {
    verificationAssignedToTestUser: await prisma.verificationRequest.count({
      where: { assignedVerifierId: { in: userIds }, applicantId: { notIn: userIds } },
    }),
    gatedByTestRevocation: await prisma.verificationRequest.count({
      where: { revocationId: { in: revocationIds }, applicantId: { notIn: userIds } },
    }),
  };

  const realApplicants = applications.filter((a) => !userIds.includes(a.applicantId));

  const counts = {
    users: users.length,
    categories: categories.length,
    gigs: gigs.length,
    applicationSettings: await prisma.applicationSettings.count({ where: { gigPostId: { in: gigIds } } }),
    applications: applications.length,
    reviews: reviews.length,
    reviewReports: await prisma.reviewReport.count({ where: where.reviewReport }),
    moderationAudits: await prisma.moderationAudit.count({ where: where.moderationAudit }),
    workHistoryEntries: await prisma.workHistoryEntry.count({ where: where.workHistoryEntry }),
    notifications: await prisma.notification.count({ where: where.notification }),
    devicePushTokens: await prisma.devicePushToken.count({ where: { userId: { in: userIds } } }),
    reputationAudits: await prisma.reputationAudit.count({ where: where.reputationAudit }),
    userStatusEvents: await prisma.userStatusEvent.count({ where: where.userStatusEvent }),
    verifierApplications: verifierApplicationIds.length,
    verifierReactivationRequests: await prisma.verifierReactivationRequest.count({ where: where.reactivationRequest }),
    verifierSuspensionEvents: await prisma.verifierSuspensionEvent.count({ where: where.suspensionEvent }),
    verificationRequests: verificationRequestIds.length,
    verificationRevocations: revocationIds.length,
  };

  console.log("\nE2E test data found:\n");
  for (const [table, count] of Object.entries(counts)) console.log(`  ${table.padEnd(30)} ${count}`);
  for (const [what, count] of Object.entries(unlinkCounts)) {
    if (count > 0) console.log(`  (unlink) ${what.padEnd(21)} ${count}`);
  }

  const roles = users.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + 1 }), {});
  console.log(`\n  Test users by role: ${JSON.stringify(roles)}`);
  if (users.length) console.log(`  e.g. ${users.slice(0, 3).map((u) => u.email).join(", ")}`);
  if (categories.length) console.log(`  Categories: ${categories.slice(0, 5).map((c) => c.name).join(", ")}${categories.length > 5 ? ", ..." : ""}`);
  if (realApplicants.length) {
    const emails = [...new Set(realApplicants.map((a) => a.applicant.email))];
    console.log(`\n  Note: ${realApplicants.length} application(s) by real accounts on e2e gigs will also be removed: ${emails.join(", ")}`);
  }

  if (!CONFIRM) {
    console.log("\nDry run only, nothing was deleted. Re-run with --confirm to delete.\n");
    return;
  }

  // Children before parents: only DevicePushToken cascades in the schema.
  await prisma.$transaction([
    prisma.verificationRequest.updateMany({
      where: { assignedVerifierId: { in: userIds }, applicantId: { notIn: userIds } },
      data: { assignedVerifierId: null },
    }),
    prisma.verificationRequest.updateMany({ where: { revocationId: { in: revocationIds } }, data: { revocationId: null } }),
    prisma.verificationRevocation.deleteMany({ where: { id: { in: revocationIds } } }),
    prisma.verificationRequest.deleteMany({ where: { id: { in: verificationRequestIds } } }),
    prisma.verifierReactivationRequest.deleteMany({ where: where.reactivationRequest }),
    prisma.verifierSuspensionEvent.deleteMany({ where: where.suspensionEvent }),
    prisma.verifierApplication.deleteMany({ where: { id: { in: verifierApplicationIds } } }),
    prisma.moderationAudit.deleteMany({ where: where.moderationAudit }),
    prisma.reviewReport.deleteMany({ where: where.reviewReport }),
    prisma.notification.deleteMany({ where: where.notification }),
    prisma.review.deleteMany({ where: { id: { in: reviewIds } } }),
    prisma.workHistoryEntry.deleteMany({ where: where.workHistoryEntry }),
    prisma.application.deleteMany({ where: { id: { in: applicationIds } } }),
    prisma.applicationSettings.deleteMany({ where: { gigPostId: { in: gigIds } } }),
    prisma.gigPost.deleteMany({ where: { id: { in: gigIds } } }),
    prisma.category.deleteMany({ where: { id: { in: categoryIds } } }),
    prisma.reputationAudit.deleteMany({ where: where.reputationAudit }),
    prisma.userStatusEvent.deleteMany({ where: where.userStatusEvent }),
    prisma.devicePushToken.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);

  console.log("\nDeleted all e2e test data listed above.\n");
}

main()
  .catch((err) => {
    console.error("E2E cleanup failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
