import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  gigPost: { findMany: vi.fn(), count: vi.fn() },
  application: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
  review: { findMany: vi.fn(), count: vi.fn() },
  reviewReport: { count: vi.fn() },
  verifierApplication: { count: vi.fn() },
  verificationRequest: { count: vi.fn() },
  verifierReactivationRequest: { count: vi.fn() },
  notification: { count: vi.fn() },
}));

vi.mock("../../src/config/db", () => ({ prisma }));

import { buildTrend, getAdminReportSummary, rangeStart } from "../../src/services/adminReport.service";

// 12:00 on 16 Oct 2026 in Sri Lanka (UTC+5:30).
const NOW = new Date("2026-10-16T06:30:00.000Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

describe("rangeStart", () => {
  it("returns null for all time", () => {
    expect(rangeStart("all", NOW)).toBeNull();
  });

  it.each([
    ["7d", "2026-10-09T18:30:00.000Z"], // local midnight, 10 Oct
    ["30d", "2026-09-16T18:30:00.000Z"], // local midnight, 17 Sep
    ["90d", "2026-07-18T18:30:00.000Z"], // local midnight, 19 Jul
  ] as const)("starts %s at Sri Lankan midnight of its first day", (range, expected) => {
    expect(rangeStart(range, NOW)?.toISOString()).toBe(expected);
  });

  it("uses the Sri Lankan calendar day, not the UTC one", () => {
    // 00:30 on 16 Oct locally, but still 15 Oct in UTC.
    const justAfterLocalMidnight = new Date("2026-10-15T19:00:00.000Z");
    expect(rangeStart("7d", justAfterLocalMidnight)?.toISOString()).toBe("2026-10-09T18:30:00.000Z");
  });
});

describe("buildTrend", () => {
  it("splits 7d into seven daily columns", () => {
    const trend = buildTrend(
      [
        NOW,
        new Date("2026-10-10T00:00:00.000Z"), // 10 Oct 05:30 local: first column
        new Date("2026-10-09T18:00:00.000Z"), // 9 Oct 23:30 local: before the window
      ],
      "7d",
      NOW
    );

    expect(trend.map((p) => p.label)).toEqual(["10 Oct", "11 Oct", "12 Oct", "13 Oct", "14 Oct", "15 Oct", "16 Oct"]);
    expect(trend.map((p) => p.count)).toEqual([1, 0, 0, 0, 0, 0, 1]);
  });

  it("splits 30d into six five-day columns", () => {
    const trend = buildTrend([daysAgo(0), daysAgo(1), daysAgo(29), daysAgo(30)], "30d", NOW);

    expect(trend.map((p) => p.label)).toEqual(["17 Sep", "22 Sep", "27 Sep", "2 Oct", "7 Oct", "12 Oct"]);
    expect(trend.map((p) => p.count)).toEqual([1, 0, 0, 0, 0, 2]);
  });

  it("splits 90d into nine ten-day columns", () => {
    const trend = buildTrend([], "90d", NOW);

    expect(trend).toHaveLength(9);
    expect(trend[0].label).toBe("19 Jul");
    expect(trend.every((p) => p.count === 0)).toBe(true);
  });

  it("shows the last 12 calendar months for all time", () => {
    const trend = buildTrend(
      [
        new Date("2025-11-05T00:00:00.000Z"), // first month
        new Date("2026-10-01T00:00:00.000Z"), // current month
        new Date("2025-10-20T00:00:00.000Z"), // 13 months ago: dropped
      ],
      "all",
      NOW
    );

    expect(trend.map((p) => p.label)).toEqual(["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]);
    expect(trend[0].count).toBe(1);
    expect(trend[11].count).toBe(1);
    expect(trend.reduce((sum, p) => sum + p.count, 0)).toBe(2);
  });
});

describe("getAdminReportSummary", () => {
  const retail = { id: "retail", name: "Retail" };
  const delivery = { id: "delivery", name: "Delivery" };
  const shopA = { id: "shop-a", name: "Kamala Stores" };
  const shopB = { id: "shop-b", name: "Perera Traders" };
  const nimal = { id: "seeker-1", name: "Nimal Perera" };
  const sunil = { id: "seeker-2", name: "Sunil Silva" };

  const gig = (status: string, category: typeof retail, business: typeof shopA, location: string) => ({
    status,
    category,
    business,
    location,
    createdAt: daysAgo(2),
  });

  beforeEach(() => {
    prisma.gigPost.findMany.mockResolvedValue([
      gig("ACTIVE", retail, shopA, "Colombo"),
      gig("PENDING", retail, shopA, "colombo "),
      gig("REJECTED", delivery, shopB, "Kandy"),
      gig("COMPLETED", delivery, shopB, "Kandy"),
      gig("CLOSED", retail, shopA, "Galle"),
    ]);
    prisma.application.findMany.mockResolvedValue([
      { status: "HIRED", applicant: nimal, createdAt: daysAgo(1) },
      { status: "PENDING", applicant: sunil, createdAt: daysAgo(1) },
      { status: "REJECTED", applicant: nimal, createdAt: daysAgo(3) },
      { status: "COMPLETED", applicant: nimal, createdAt: daysAgo(4) },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { role: "jobseeker", createdAt: daysAgo(1) },
      { role: "jobseeker", createdAt: daysAgo(5) },
      { role: "shopowner", createdAt: daysAgo(400) },
    ]);
    prisma.review.findMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }, { rating: 4 }]);

    prisma.gigPost.count.mockResolvedValue(1);
    prisma.reviewReport.count.mockResolvedValue(2);
    prisma.review.count.mockResolvedValue(3);
    prisma.verifierApplication.count.mockImplementation(async ({ where }) => (where.status === "PENDING" ? 4 : 8));
    prisma.verificationRequest.count.mockImplementation(async ({ where }) => (where.status === "PENDING" ? 6 : 5));
    prisma.verifierReactivationRequest.count.mockResolvedValue(7);
    prisma.notification.count.mockResolvedValue(9);
  });

  it("builds the overview figures", async () => {
    const report = await getAdminReportSummary({ range: "30d", now: NOW });

    expect(report.overview).toEqual({
      gigsPosted: 5,
      newCustomers: 2, // the shop owner joined before the window
      applications: 4,
      completedGigs: 1,
      approvalRate: 75, // 3 approved (active/closed/completed) vs 1 rejected; pending is ignored
      hireRate: 50, // hired + completed out of 4
      reviews: 3,
      averageRating: 4.3,
    });
    expect(report.range).toBe("30d");
    expect(report.from).toBe("2026-09-16T18:30:00.000Z");
    expect(report.to).toBe(NOW.toISOString());
    expect(report.filters).toEqual({ categoryId: null, role: null });
  });

  it("returns every gig and application status in a fixed order, including zeros", async () => {
    const report = await getAdminReportSummary({ range: "30d", now: NOW });

    expect(report.gigs.byStatus.map((s) => [s.key, s.count])).toEqual([
      ["PENDING", 1],
      ["ACTIVE", 1],
      ["COMPLETED", 1],
      ["CLOSED", 1],
      ["REJECTED", 1],
    ]);
    expect(report.applications.byStatus.map((s) => [s.key, s.count])).toEqual([
      ["PENDING", 1],
      ["SHORTLISTED", 0],
      ["HIRED", 1],
      ["COMPLETED", 1],
      ["REJECTED", 1],
      ["WITHDRAWN", 0],
    ]);
  });

  it("ranks categories, locations, businesses and applicants", async () => {
    const report = await getAdminReportSummary({ range: "30d", now: NOW });

    expect(report.gigs.byCategory).toEqual([
      { key: "retail", label: "Retail", count: 3 },
      { key: "delivery", label: "Delivery", count: 2 },
    ]);
    // Locations are grouped case- and whitespace-insensitively; ties sort by label.
    expect(report.gigs.topLocations).toEqual([
      { key: "colombo", label: "Colombo", count: 2 },
      { key: "kandy", label: "Kandy", count: 2 },
      { key: "galle", label: "Galle", count: 1 },
    ]);
    expect(report.customers.topBusinesses).toEqual([
      { key: "shop-a", label: "Kamala Stores", count: 3 },
      { key: "shop-b", label: "Perera Traders", count: 2 },
    ]);
    expect(report.customers.topApplicants).toEqual([
      { key: "seeker-1", label: "Nimal Perera", count: 3 },
      { key: "seeker-2", label: "Sunil Silva", count: 1 },
    ]);
  });

  it("breaks customers down by role", async () => {
    const report = await getAdminReportSummary({ range: "30d", now: NOW });

    expect(report.customers.total).toBe(3);
    expect(report.customers.newInRange).toBe(2);
    expect(report.customers.byRole).toEqual([
      { key: "jobseeker", label: "Job seekers", count: 2 },
      { key: "shopowner", label: "Shop owners", count: 1 },
      { key: "verifier", label: "Verifiers", count: 0 },
    ]);
  });

  it("reports the moderation backlog counts", async () => {
    const report = await getAdminReportSummary({ range: "30d", now: NOW });

    expect(Object.fromEntries(report.monitoring.map((m) => [m.key, m.count]))).toEqual({
      pendingGigs: 1,
      pendingReports: 2,
      flaggedReviews: 3,
      pendingVerifierApplications: 4,
      verificationCasesForAdmin: 5,
      unassignedVerificationRequests: 6,
      pendingReactivationRequests: 7,
      suspendedVerifiers: 8,
      failedEmails: 9,
    });
    expect(prisma.gigPost.count).toHaveBeenCalledWith({ where: { isDeleted: false, status: "PENDING" } });
  });

  it("queries only non-deleted gigs within the range", async () => {
    await getAdminReportSummary({ range: "7d", now: NOW });

    expect(prisma.gigPost.findMany.mock.calls[0][0].where).toEqual({
      isDeleted: false,
      createdAt: { gte: new Date("2026-10-09T18:30:00.000Z") },
      categoryId: undefined,
    });
  });

  it("applies the category filter to gigs and applications", async () => {
    const report = await getAdminReportSummary({ range: "30d", categoryId: "retail", now: NOW });

    expect(prisma.gigPost.findMany.mock.calls[0][0].where.categoryId).toBe("retail");
    expect(prisma.application.findMany.mock.calls[0][0].where.gigPost).toEqual({ categoryId: "retail" });
    expect(report.filters.categoryId).toBe("retail");
  });

  it("limits customers to the chosen role", async () => {
    prisma.user.findMany.mockResolvedValue([{ role: "verifier", createdAt: daysAgo(1) }]);

    const report = await getAdminReportSummary({ range: "30d", role: "verifier", now: NOW });

    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: { in: ["verifier"] } });
    expect(report.customers.byRole).toEqual([{ key: "verifier", label: "Verifiers", count: 1 }]);
    expect(report.filters.role).toBe("verifier");
  });

  it("counts every customer as new and drops the date filter for all time", async () => {
    const report = await getAdminReportSummary({ range: "all", now: NOW });

    expect(report.from).toBeNull();
    expect(report.overview.newCustomers).toBe(3);
    expect(prisma.gigPost.findMany.mock.calls[0][0].where.createdAt).toBeUndefined();
    expect(report.gigs.trend).toHaveLength(12);
  });

  it("returns null rates instead of dividing by zero when there is no data", async () => {
    prisma.gigPost.findMany.mockResolvedValue([]);
    prisma.application.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.review.findMany.mockResolvedValue([]);

    const report = await getAdminReportSummary({ range: "30d", now: NOW });

    expect(report.overview.approvalRate).toBeNull();
    expect(report.overview.hireRate).toBeNull();
    expect(report.overview.averageRating).toBeNull();
    expect(report.gigs.byCategory).toEqual([]);
  });
});
