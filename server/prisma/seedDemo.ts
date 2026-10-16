// Demo data for the reviews, notifications and profile features, built around one
// existing job seeker account so every screen has something to show.
//
//   npm run prisma:seed-demo                     (uses 123@gmail.com)
//   npm run prisma:seed-demo -- someone@mail.com
//
// Safe to run again: everything it creates has an id starting with `demo-<user>-`,
// and each run first removes those rows and recreates them, which also resets the
// demo after a practice run. It never changes the target account itself (password,
// name, profile) and never touches data it did not create.
import { NotificationType, PaymentType, PrismaClient, ReportStatus, ReviewStatus } from "@prisma/client";
import { hashPassword } from "../src/utils/hash";

const prisma = new PrismaClient();

const TARGET_EMAIL = process.argv[2] ?? "123@gmail.com";
const ADMIN_EMAIL = "admin@worknest.dev";

const DAY_MS = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

const SHOP_OWNERS = {
  savi: {
    email: "savi@example.com",
    name: "Savithri Silva",
    phone: "0712345678",
    bio: "Owner of Savi's Café & Bakeshop.",
    location: "Colombo 05",
    trustScore: 88,
  },
  ruwan: {
    email: "ruwan@example.com",
    name: "Ruwan Fernando",
    phone: "0723456789",
    bio: "Runs Ruwan's Mini Mart and a small delivery service.",
    location: "Nugegoda",
    trustScore: 72,
  },
  dilini: {
    email: "dilini@example.com",
    name: "Dilini Jayasuriya",
    phone: "0754567890",
    bio: "Event planner at Lanka Events Co.",
    location: "Colombo 07",
    trustScore: 84,
  },
} as const;

type OwnerKey = keyof typeof SHOP_OWNERS;

interface ReviewSpec {
  rating: number;
  comment: string;
  daysAgo: number;
  status?: ReviewStatus;
}

interface GigSpec {
  key: string;
  owner: OwnerKey;
  category: string;
  title: string;
  description: string;
  location: string;
  pay: number;
  payType: PaymentType;
  /** Days since the gig was posted. */
  postedDaysAgo: number;
  /** Set for finished work: days since the job seeker's work was marked completed. */
  completedDaysAgo?: number;
  /** Status of the job seeker's application on a gig that is still open. */
  openApplication?: "HIRED" | "PENDING";
  ownerReview?: ReviewSpec;
  seekerReview?: ReviewSpec;
}

const GIGS: GigSpec[] = [
  {
    key: "night-market",
    owner: "savi",
    category: "Food & Beverage",
    title: "Night Market Stall Assistant",
    description: "Help run the bakery stall at the Friday night market: serving, packing and cash handling.",
    location: "Colombo 05",
    pay: 2500,
    payType: "DAILY",
    postedDaysAgo: 52,
    completedDaysAgo: 45,
    ownerReview: { rating: 5, comment: "Friendly with customers and stayed until everything was packed away.", daysAgo: 44 },
    // Removed by an admin after the shop owner reported it; see REPORTS below.
    seekerReview: { rating: 1, comment: "Worst place ever, the owner is a cheat.", daysAgo: 44, status: "REMOVED" },
  },
  {
    key: "weekend-cashier",
    owner: "savi",
    category: "Retail",
    title: "Weekend Cashier",
    description: "Operate the till on Saturday and Sunday, balance the cash drawer and help restock shelves.",
    location: "Colombo 05",
    pay: 3000,
    payType: "DAILY",
    postedDaysAgo: 36,
    completedDaysAgo: 30,
    ownerReview: { rating: 5, comment: "Accurate with cash and always on time. Would hire again.", daysAgo: 29 },
    seekerReview: { rating: 5, comment: "Clear instructions and paid on the same day.", daysAgo: 29 },
  },
  {
    key: "cafe-service",
    owner: "savi",
    category: "Food & Beverage",
    title: "Café Service Assistant",
    description: "Take orders, serve tables and keep the counter tidy during the lunch rush.",
    location: "Colombo 05",
    pay: 450,
    payType: "HOURLY",
    postedDaysAgo: 27,
    completedDaysAgo: 21,
    // The job seeker reported this one and the admin dismissed the report; see REPORTS below.
    ownerReview: { rating: 3, comment: "Good with customers but arrived late on the second day.", daysAgo: 20 },
    seekerReview: { rating: 4, comment: "Busy shifts but a supportive team.", daysAgo: 20 },
  },
  {
    key: "event-setup",
    owner: "dilini",
    category: "Event Staff",
    title: "Event Setup Crew",
    description: "Set up chairs, tables and signage for a corporate event, then help pack down afterwards.",
    location: "Colombo 07",
    pay: 4000,
    payType: "FIXED",
    postedDaysAgo: 20,
    completedDaysAgo: 14,
    ownerReview: { rating: 5, comment: "Worked fast and helped the rest of the crew. Excellent.", daysAgo: 13 },
    // No review from the job seeker yet: Work History shows "Leave a review" for this one.
  },
  {
    key: "stock-room",
    owner: "ruwan",
    category: "Warehouse",
    title: "Stock Room Helper",
    description: "Unload the weekly delivery, label stock and organise the store room shelves.",
    location: "Nugegoda",
    pay: 2200,
    payType: "DAILY",
    postedDaysAgo: 16,
    completedDaysAgo: 10,
    // Unfair review, reported by the job seeker and waiting for the admin; see REPORTS below.
    ownerReview: { rating: 1, comment: "Never showed up and did not answer calls.", daysAgo: 9, status: "FLAGGED" },
    seekerReview: { rating: 3, comment: "The work was fine but the instructions kept changing.", daysAgo: 9 },
  },
  {
    key: "wedding-usher",
    owner: "dilini",
    category: "Event Staff",
    title: "Wedding Hall Usher",
    description: "Welcome guests, guide them to their tables and assist the coordinator during the ceremony.",
    location: "Colombo 07",
    pay: 3500,
    payType: "FIXED",
    postedDaysAgo: 14,
    completedDaysAgo: 8,
    ownerReview: { rating: 4, comment: "Polite with guests and well presented.", daysAgo: 8 },
    // Harsh review, reported by the shop owner and waiting for the admin; see REPORTS below.
    seekerReview: { rating: 2, comment: "Disorganised event and the manager was rude to staff.", daysAgo: 7, status: "FLAGGED" },
  },
  {
    key: "delivery-rider",
    owner: "ruwan",
    category: "Delivery",
    title: "Delivery Rider (Half Day)",
    description: "Deliver grocery orders around Nugegoda on a provided bicycle between 8am and 1pm.",
    location: "Nugegoda",
    pay: 1800,
    payType: "FIXED",
    postedDaysAgo: 7,
    completedDaysAgo: 3,
    // Neither side has reviewed yet: a second "Leave a review" entry.
  },
  {
    key: "bakery-counter",
    owner: "savi",
    category: "Food & Beverage",
    title: "Bakery Counter Staff",
    description: "Serve customers at the bakery counter, box up orders and keep the display stocked.",
    location: "Colombo 05",
    pay: 2800,
    payType: "DAILY",
    postedDaysAgo: 5,
    openApplication: "HIRED",
  },
  {
    key: "exhibition-booth",
    owner: "dilini",
    category: "Event Staff",
    title: "Exhibition Booth Helper",
    description: "Hand out brochures, register visitors and keep the booth tidy at a two-day trade exhibition.",
    location: "Colombo 07",
    pay: 3200,
    payType: "DAILY",
    postedDaysAgo: 2,
    openApplication: "PENDING",
  },
];

interface ReportSpec {
  gig: string;
  /** Whose review is being reported. */
  reviewBy: "owner" | "seeker";
  reason: string;
  status: ReportStatus;
  daysAgo: number;
  /** For reports an admin has already handled. */
  audit?: { action: "REMOVE_REVIEW" | "DISMISS_REPORT"; reason: string; daysAgo: number };
}

// A report is always filed by the person the review is about.
const REPORTS: ReportSpec[] = [
  {
    gig: "night-market",
    reviewBy: "seeker",
    reason: "This is an insult, not a review of the work.",
    status: "RESOLVED",
    daysAgo: 43,
    audit: { action: "REMOVE_REVIEW", reason: "Abusive language with no detail about the job.", daysAgo: 40 },
  },
  {
    gig: "cafe-service",
    reviewBy: "owner",
    reason: "I was only five minutes late once, this rating feels unfair.",
    status: "DISMISSED",
    daysAgo: 19,
    audit: { action: "DISMISS_REPORT", reason: "The review describes the work honestly and breaks no rules.", daysAgo: 18 },
  },
  {
    gig: "stock-room",
    reviewBy: "owner",
    reason: "This is false. I worked the full day and the gig was marked completed.",
    status: "PENDING",
    daysAgo: 6,
  },
  {
    gig: "wedding-usher",
    reviewBy: "seeker",
    reason: "Untrue and damaging to my business. The event ran on schedule.",
    status: "PENDING",
    daysAgo: 6,
  },
];

async function main() {
  const seeker = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!seeker) {
    throw new Error(`No account found for ${TARGET_EMAIL}. Register it in the app first, then run this again.`);
  }
  if (seeker.role !== "jobseeker") {
    throw new Error(`${TARGET_EMAIL} is a ${seeker.role} account. This demo data is designed for a job seeker account.`);
  }

  const prefix = `demo-${seeker.id.slice(0, 8)}-`;
  const id = (...parts: string[]) => prefix + parts.join("-");

  // ---- Remove what a previous run (and any practice demo on top of it) left behind ----
  const oldGigIds = (await prisma.gigPost.findMany({ where: { id: { startsWith: prefix } }, select: { id: true } })).map((g) => g.id);
  const oldReviewIds = (await prisma.review.findMany({ where: { gigId: { in: oldGigIds } }, select: { id: true } })).map((r) => r.id);
  const oldApplicationIds = (await prisma.application.findMany({ where: { gigPostId: { in: oldGigIds } }, select: { id: true } })).map((a) => a.id);
  await prisma.moderationAudit.deleteMany({ where: { reviewId: { in: oldReviewIds } } });
  await prisma.reviewReport.deleteMany({ where: { reviewId: { in: oldReviewIds } } });
  await prisma.notification.deleteMany({
    where: {
      OR: [{ id: { startsWith: prefix } }, { relatedEntityId: { in: [...oldGigIds, ...oldReviewIds, ...oldApplicationIds] } }],
    },
  });
  await prisma.review.deleteMany({ where: { id: { in: oldReviewIds } } });
  await prisma.workHistoryEntry.deleteMany({ where: { gigId: { in: oldGigIds } } });
  await prisma.application.deleteMany({ where: { id: { in: oldApplicationIds } } });
  await prisma.applicationSettings.deleteMany({ where: { gigPostId: { in: oldGigIds } } });
  await prisma.gigPost.deleteMany({ where: { id: { in: oldGigIds } } });

  // ---- People and categories the demo needs (existing ones are left exactly as they are) ----
  const passwordHash = await hashPassword("password");
  const owners = {} as Record<OwnerKey, { id: string; name: string }>;
  for (const key of Object.keys(SHOP_OWNERS) as OwnerKey[]) {
    owners[key] = await prisma.user.upsert({
      where: { email: SHOP_OWNERS[key].email },
      update: {},
      create: { ...SHOP_OWNERS[key], role: "shopowner", passwordHash },
      select: { id: true, name: true },
    });
  }
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!admin) {
    throw new Error(`The demo admin (${ADMIN_EMAIL}) is missing. Run "npm run prisma:seed" first.`);
  }

  const categoryIds: Record<string, string> = {};
  for (const name of new Set(GIGS.map((gig) => gig.category))) {
    const category = await prisma.category.upsert({ where: { name }, update: {}, create: { name }, select: { id: true } });
    categoryIds[name] = category.id;
  }

  // ---- Gigs, applications, work history and reviews ----
  const reviewIds: Record<string, string> = {};
  for (const gig of GIGS) {
    const owner = owners[gig.owner];
    const completedAt = gig.completedDaysAgo === undefined ? null : daysAgo(gig.completedDaysAgo);
    const gigId = id("gig", gig.key);
    const applicationId = id("app", gig.key);

    await prisma.gigPost.create({
      data: {
        id: gigId,
        title: gig.title,
        description: gig.description,
        categoryId: categoryIds[gig.category],
        businessId: owner.id,
        location: gig.location,
        paymentAmount: gig.pay,
        paymentType: gig.payType,
        startDate: completedAt ?? new Date(Date.now() + 4 * DAY_MS),
        workersNeeded: 1,
        requiredSkills: ["Reliability", "Customer service"],
        status: completedAt ? "COMPLETED" : "ACTIVE",
        createdAt: daysAgo(gig.postedDaysAgo),
      },
    });

    await prisma.application.create({
      data: {
        id: applicationId,
        gigPostId: gigId,
        applicantId: seeker.id,
        applicationMode: "STANDARD",
        status: completedAt ? "COMPLETED" : gig.openApplication!,
        experience: "Part-time retail and event work over the past year.",
        availability: "Available on all listed dates.",
        shortMessage: "I can start straight away and I live nearby.",
        expectedSalary: gig.pay,
        completedAt,
        createdAt: daysAgo(gig.postedDaysAgo - 1),
      },
    });

    if (completedAt) {
      await prisma.workHistoryEntry.createMany({
        data: [
          { id: id("history", gig.key, "youth"), applicationId, gigId, userId: seeker.id, role: "YOUTH", completedAt, gigStatus: "COMPLETED" },
          { id: id("history", gig.key, "business"), applicationId, gigId, userId: owner.id, role: "BUSINESS", completedAt, gigStatus: "COMPLETED" },
        ],
      });
    }

    for (const by of ["owner", "seeker"] as const) {
      const review = by === "owner" ? gig.ownerReview : gig.seekerReview;
      if (!review) continue;
      const reviewId = id("review", gig.key, by);
      reviewIds[`${gig.key}:${by}`] = reviewId;
      await prisma.review.create({
        data: {
          id: reviewId,
          gigId,
          reviewerId: by === "owner" ? owner.id : seeker.id,
          revieweeId: by === "owner" ? seeker.id : owner.id,
          rating: review.rating,
          comment: review.comment,
          status: review.status ?? "PUBLISHED",
          createdAt: daysAgo(review.daysAgo),
        },
      });
    }
  }

  // ---- Review reports and the moderation history behind the handled ones ----
  for (const report of REPORTS) {
    const gig = GIGS.find((g) => g.key === report.gig)!;
    const reviewId = reviewIds[`${report.gig}:${report.reviewBy}`];
    const reporterId = report.reviewBy === "owner" ? seeker.id : owners[gig.owner].id;
    await prisma.reviewReport.create({
      data: { id: id("report", report.gig), reviewId, reporterId, reason: report.reason, status: report.status, createdAt: daysAgo(report.daysAgo) },
    });
    if (report.audit) {
      await prisma.moderationAudit.create({
        data: {
          id: id("audit", report.gig),
          reviewId,
          adminId: admin.id,
          action: report.audit.action,
          previousStatus: "FLAGGED",
          newStatus: report.audit.action === "REMOVE_REVIEW" ? "REMOVED" : "PUBLISHED",
          reason: report.audit.reason,
          createdAt: daysAgo(report.audit.daysAgo),
        },
      });
    }
  }

  // ---- Notifications: the same titles and messages the server writes for each event ----
  const gigTitle = (key: string) => GIGS.find((g) => g.key === key)!.title;
  const gigLink = (key: string) => ({ link: `/gigs/${id("gig", key)}`, relatedEntityId: id("gig", key) });
  const applicationLink = (key: string) => ({ link: `/applications/${id("app", key)}`, relatedEntityId: id("app", key) });
  const reviewLink = (key: string, by: "owner" | "seeker") => ({
    link: `/reviews/${reviewIds[`${key}:${by}`]}`,
    relatedEntityId: reviewIds[`${key}:${by}`],
  });
  const completed = { title: "Gig Completed", message: "Your gig has been completed successfully." };
  const reviewRequested = { title: "Submit Your Review", message: "You can now review the person or business you worked with." };
  const reviewReceived = (key: string) => ({
    title: "New Review Received",
    message: `You received a new ${GIGS.find((g) => g.key === key)!.ownerReview!.rating}-star review for "${gigTitle(key)}".`,
  });

  interface NotificationSpec {
    type: NotificationType;
    title: string;
    message: string;
    link: string;
    relatedEntityId: string;
    daysAgo: number;
    unread?: boolean;
  }

  // Newest first. The top five are unread, so the bell opens with a badge of 5.
  const seekerNotifications: NotificationSpec[] = [
    { type: "APPLICATION_SUBMITTED", title: "Application Submitted", message: `Your application for "${gigTitle("exhibition-booth")}" has been submitted.`, ...applicationLink("exhibition-booth"), daysAgo: 1, unread: true },
    { type: "APPLICATION_HIRED", title: "You're Hired!", message: `Congratulations! You've been hired for "${gigTitle("bakery-counter")}".`, ...applicationLink("bakery-counter"), daysAgo: 2, unread: true },
    { type: "REVIEW_REQUESTED", ...reviewRequested, ...gigLink("delivery-rider"), daysAgo: 3, unread: true },
    { type: "GIG_COMPLETED", ...completed, ...gigLink("delivery-rider"), daysAgo: 3.01, unread: true },
    { type: "REVIEW_REPORTED", title: "Report Submitted", message: "Your review report was submitted successfully.", ...reviewLink("stock-room", "owner"), daysAgo: 6, unread: true },
    { type: "REVIEW_RECEIVED", ...reviewReceived("wedding-usher"), ...reviewLink("wedding-usher", "owner"), daysAgo: 8 },
    { type: "GIG_COMPLETED", ...completed, ...gigLink("wedding-usher"), daysAgo: 8.01 },
    { type: "REVIEW_RECEIVED", ...reviewReceived("event-setup"), ...reviewLink("event-setup", "owner"), daysAgo: 13 },
    { type: "REVIEW_REQUESTED", ...reviewRequested, ...gigLink("event-setup"), daysAgo: 14 },
    { type: "REPORT_DISMISSED", title: "Report Dismissed", message: "Your review report was dismissed by an administrator.", ...reviewLink("cafe-service", "owner"), daysAgo: 18 },
    { type: "REVIEW_RECEIVED", ...reviewReceived("cafe-service"), ...reviewLink("cafe-service", "owner"), daysAgo: 20 },
    { type: "REVIEW_RECEIVED", ...reviewReceived("weekend-cashier"), ...reviewLink("weekend-cashier", "owner"), daysAgo: 29 },
    { type: "GIG_COMPLETED", ...completed, ...gigLink("weekend-cashier"), daysAgo: 30 },
    { type: "REVIEW_REMOVED", title: "Review Removed", message: "Your review was removed by an administrator.", ...reviewLink("night-market", "seeker"), daysAgo: 40 },
  ];

  // A few for the shop owner side, so logging in as Savi also shows a populated list.
  const saviNotifications: NotificationSpec[] = [
    { type: "REVIEW_RECEIVED", title: "New Review Received", message: `You received a new 4-star review for "${gigTitle("cafe-service")}".`, ...reviewLink("cafe-service", "seeker"), daysAgo: 20, unread: true },
    { type: "REVIEW_RECEIVED", title: "New Review Received", message: `You received a new 5-star review for "${gigTitle("weekend-cashier")}".`, ...reviewLink("weekend-cashier", "seeker"), daysAgo: 29 },
    { type: "REPORT_RESOLVED", title: "Report Resolved", message: "An administrator reviewed your reported review.", ...reviewLink("night-market", "seeker"), daysAgo: 40 },
  ];

  const toRows = (recipientId: string, tag: string, specs: NotificationSpec[]) =>
    specs.map((spec, index) => ({
      id: id("note", tag, String(index + 1).padStart(2, "0")),
      recipientId,
      type: spec.type,
      title: spec.title,
      message: spec.message,
      link: spec.link,
      relatedEntityId: spec.relatedEntityId,
      isRead: !spec.unread,
      readAt: spec.unread ? null : daysAgo(Math.max(0, spec.daysAgo - 0.5)),
      // No email was sent for these seeded rows, so they are not marked as sent.
      emailStatus: "NOT_REQUIRED" as const,
      createdAt: daysAgo(spec.daysAgo),
    }));

  await prisma.notification.createMany({
    data: [...toRows(seeker.id, "seeker", seekerNotifications), ...toRows(owners.savi.id, "savi", saviNotifications)],
  });

  const published = GIGS.filter((gig) => gig.ownerReview && (gig.ownerReview.status ?? "PUBLISHED") === "PUBLISHED");
  const average = published.reduce((sum, gig) => sum + gig.ownerReview!.rating, 0) / published.length;

  console.log(`\nDemo data ready for ${seeker.name} (${TARGET_EMAIL}).\n`);
  const completedCount = GIGS.filter((gig) => gig.completedDaysAgo !== undefined).length;
  const openCount = (status: "HIRED" | "PENDING") => GIGS.filter((gig) => gig.openApplication === status).length;
  console.log(`  Gigs and applications : ${GIGS.length} (${completedCount} completed, ${openCount("HIRED")} hired, ${openCount("PENDING")} pending)`);
  console.log(`  Reviews about you     : ${published.length} published, average ${average.toFixed(1)}, plus 1 flagged`);
  console.log(`  Reviews still to write: 2 (Event Setup Crew, Delivery Rider)`);
  console.log(`  Notifications         : ${seekerNotifications.length}, ${seekerNotifications.filter((n) => n.unread).length} unread`);
  console.log(`  Waiting for the admin : 2 flagged reviews\n`);
  console.log(`  Other logins (password "password"): ${ADMIN_EMAIL}, ${Object.values(SHOP_OWNERS).map((o) => o.email).join(", ")}\n`);
}

main()
  .catch((err) => {
    console.error("Demo seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
