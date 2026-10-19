import { ApplicationStatus, GigStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "../config/db";

export const REPORT_RANGES = ["7d", "30d", "90d", "all"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

// Admins run the platform; everyone else is a customer of it.
export const CUSTOMER_ROLES = ["jobseeker", "shopowner", "verifier"] as const;
export type CustomerRole = (typeof CUSTOMER_ROLES)[number];

export interface ReportOptions {
  range: ReportRange;
  categoryId?: string;
  role?: CustomerRole;
  now?: Date;
}

export interface CountItem {
  key: string;
  label: string;
  count: number;
}

export interface TrendPoint {
  label: string;
  count: number;
}

const DAY_MS = 86_400_000;
// Sri Lanka is a fixed UTC+5:30 with no daylight saving, so local calendar
// days can be derived arithmetically instead of through Intl.
const LOCAL_OFFSET_MS = 5.5 * 3_600_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// How each range is split into trend columns: `buckets` columns of `days` days.
const TREND_SHAPE: Record<Exclude<ReportRange, "all">, { buckets: number; days: number }> = {
  "7d": { buckets: 7, days: 1 },
  "30d": { buckets: 6, days: 5 },
  "90d": { buckets: 9, days: 10 },
};

const GIG_STATUS_LABELS: Record<GigStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  SHORTLISTED: "Shortlisted",
  HIRED: "Hired",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const ROLE_LABELS: Record<CustomerRole, string> = {
  jobseeker: "Job seekers",
  shopowner: "Shop owners",
  verifier: "Verifiers",
};

function localDayIndex(date: Date): number {
  return Math.floor((date.getTime() + LOCAL_OFFSET_MS) / DAY_MS);
}

function localMonthIndex(date: Date): number {
  const local = new Date(date.getTime() + LOCAL_OFFSET_MS);
  return local.getUTCFullYear() * 12 + local.getUTCMonth();
}

function dayLabel(dayIndex: number): string {
  const date = new Date(dayIndex * DAY_MS);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** Start of the reporting window (local midnight of its first day), or null for all time. */
export function rangeStart(range: ReportRange, now: Date): Date | null {
  if (range === "all") return null;
  const { buckets, days } = TREND_SHAPE[range];
  return new Date((localDayIndex(now) - buckets * days + 1) * DAY_MS - LOCAL_OFFSET_MS);
}

/** Counts `dates` into the trend columns for `range`. "all" shows the last 12 calendar months. */
export function buildTrend(dates: Date[], range: ReportRange, now: Date): TrendPoint[] {
  if (range === "all") {
    const firstMonth = localMonthIndex(now) - 11;
    const points = Array.from({ length: 12 }, (_, i) => ({ label: MONTHS[(firstMonth + i) % 12], count: 0 }));
    for (const date of dates) {
      const index = localMonthIndex(date) - firstMonth;
      if (index >= 0 && index < points.length) points[index].count += 1;
    }
    return points;
  }

  const { buckets, days } = TREND_SHAPE[range];
  const firstDay = localDayIndex(now) - buckets * days + 1;
  const points = Array.from({ length: buckets }, (_, i) => ({ label: dayLabel(firstDay + i * days), count: 0 }));
  for (const date of dates) {
    const index = Math.floor((localDayIndex(date) - firstDay) / days);
    if (index >= 0 && index < points.length) points[index].count += 1;
  }
  return points;
}

function countBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// Every status is returned, including zeros, in a fixed order so the app can
// give each one a stable colour regardless of the active filters.
function byFixedKeys<K extends string>(counts: Map<string, number>, labels: Record<K, string>, keys: readonly K[]): CountItem[] {
  return keys.map((key) => ({ key, label: labels[key], count: counts.get(key) ?? 0 }));
}

function topRanked<T>(rows: T[], keyOf: (row: T) => string, labelOf: (row: T) => string, limit: number): CountItem[] {
  const labels = new Map<string, string>();
  for (const row of rows) {
    if (!labels.has(keyOf(row))) labels.set(keyOf(row), labelOf(row));
  }
  return [...countBy(rows, keyOf)]
    .map(([key, count]) => ({ key, label: labels.get(key) ?? key, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function percent(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((part / whole) * 100);
}

export async function getAdminReportSummary(options: ReportOptions) {
  const now = options.now ?? new Date();
  const from = rangeStart(options.range, now);
  const inRange = from ? { gte: from } : undefined;
  const roles: CustomerRole[] = options.role ? [options.role] : [...CUSTOMER_ROLES];

  const gigWhere: Prisma.GigPostWhereInput = { isDeleted: false, createdAt: inRange, categoryId: options.categoryId };
  const applicationWhere: Prisma.ApplicationWhereInput = {
    createdAt: inRange,
    gigPost: options.categoryId ? { categoryId: options.categoryId } : undefined,
  };

  const [
    gigs,
    applications,
    customers,
    reviews,
    pendingGigs,
    pendingReports,
    flaggedReviews,
    pendingVerifierApplications,
    verificationCasesForAdmin,
    unassignedVerificationRequests,
    pendingReactivationRequests,
    suspendedVerifiers,
    failedEmails,
  ] = await Promise.all([
    prisma.gigPost.findMany({
      where: gigWhere,
      select: {
        status: true,
        location: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        business: { select: { id: true, name: true } },
      },
    }),
    prisma.application.findMany({
      where: applicationWhere,
      select: { status: true, createdAt: true, applicant: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: roles as Role[] } },
      select: { role: true, createdAt: true },
    }),
    prisma.review.findMany({ where: { createdAt: inRange }, select: { rating: true } }),
    // The monitoring counts below are the current backlog, so they ignore the date range.
    prisma.gigPost.count({ where: { isDeleted: false, status: "PENDING" } }),
    prisma.reviewReport.count({ where: { status: "PENDING" } }),
    prisma.review.count({ where: { status: "FLAGGED" } }),
    prisma.verifierApplication.count({ where: { status: "PENDING" } }),
    prisma.verificationRequest.count({ where: { status: { in: ["ADMIN_REVIEW", "FLAGGED"] } } }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.verifierReactivationRequest.count({ where: { status: "PENDING" } }),
    prisma.verifierApplication.count({ where: { status: "SUSPENDED" } }),
    prisma.notification.count({ where: { emailStatus: "FAILED" } }),
  ]);

  const gigStatusCounts = countBy(gigs, (gig) => gig.status);
  const gigCount = (status: GigStatus) => gigStatusCounts.get(status) ?? 0;
  const approvedGigs = gigCount("ACTIVE") + gigCount("CLOSED") + gigCount("COMPLETED");

  const applicationStatusCounts = countBy(applications, (application) => application.status);
  const applicationCount = (status: ApplicationStatus) => applicationStatusCounts.get(status) ?? 0;

  const newCustomers = from ? customers.filter((customer) => customer.createdAt >= from) : customers;
  const ratingTotal = reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    range: options.range,
    from: from ? from.toISOString() : null,
    to: now.toISOString(),
    filters: { categoryId: options.categoryId ?? null, role: options.role ?? null },
    overview: {
      gigsPosted: gigs.length,
      newCustomers: newCustomers.length,
      applications: applications.length,
      completedGigs: gigCount("COMPLETED"),
      // Share of reviewed gigs that were approved; pending gigs are not counted either way.
      approvalRate: percent(approvedGigs, approvedGigs + gigCount("REJECTED")),
      hireRate: percent(applicationCount("HIRED") + applicationCount("COMPLETED"), applications.length),
      reviews: reviews.length,
      averageRating: reviews.length === 0 ? null : Math.round((ratingTotal / reviews.length) * 10) / 10,
    },
    gigs: {
      total: gigs.length,
      byStatus: byFixedKeys(gigStatusCounts, GIG_STATUS_LABELS, ["PENDING", "ACTIVE", "COMPLETED", "CLOSED", "REJECTED"]),
      byCategory: topRanked(gigs, (gig) => gig.category.id, (gig) => gig.category.name, 6),
      topLocations: topRanked(gigs, (gig) => gig.location.trim().toLowerCase(), (gig) => gig.location.trim(), 5),
      trend: buildTrend(gigs.map((gig) => gig.createdAt), options.range, now),
    },
    applications: {
      total: applications.length,
      byStatus: byFixedKeys(applicationStatusCounts, APPLICATION_STATUS_LABELS, [
        "PENDING",
        "SHORTLISTED",
        "HIRED",
        "COMPLETED",
        "REJECTED",
        "WITHDRAWN",
      ]),
    },
    customers: {
      total: customers.length,
      newInRange: newCustomers.length,
      byRole: byFixedKeys(countBy(customers, (customer) => customer.role), ROLE_LABELS, roles),
      trend: buildTrend(newCustomers.map((customer) => customer.createdAt), options.range, now),
      topBusinesses: topRanked(gigs, (gig) => gig.business.id, (gig) => gig.business.name, 5),
      topApplicants: topRanked(applications, (a) => a.applicant.id, (a) => a.applicant.name, 5),
    },
    monitoring: [
      { key: "pendingGigs", label: "Gigs waiting for approval", hint: "New posts are hidden from job seekers until reviewed.", count: pendingGigs },
      { key: "pendingReports", label: "Review reports to resolve", hint: "Users reported these reviews and are waiting for a decision.", count: pendingReports },
      { key: "flaggedReviews", label: "Flagged reviews", hint: "Reviews currently flagged for moderation.", count: flaggedReviews },
      { key: "pendingVerifierApplications", label: "Verifier applications to review", hint: "People who applied to become community verifiers.", count: pendingVerifierApplications },
      { key: "verificationCasesForAdmin", label: "Verification cases needing an admin", hint: "Flagged by a verifier or held for admin review.", count: verificationCasesForAdmin },
      { key: "unassignedVerificationRequests", label: "Verification requests not yet assigned", hint: "No verifier has picked these up yet.", count: unassignedVerificationRequests },
      { key: "pendingReactivationRequests", label: "Verifier reactivation requests", hint: "Suspended verifiers asking to be reinstated.", count: pendingReactivationRequests },
      { key: "suspendedVerifiers", label: "Suspended verifiers", hint: "Verifiers who currently cannot review requests.", count: suspendedVerifiers },
      { key: "failedEmails", label: "Emails that failed to send", hint: "Notification emails the mail server rejected.", count: failedEmails },
    ],
  };
}

export type AdminReportSummary = Awaited<ReturnType<typeof getAdminReportSummary>>;
