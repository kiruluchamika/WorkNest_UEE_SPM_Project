import { http, extractErrorMessage } from "./http";

export type ReportRange = "7d" | "30d" | "90d" | "all";
export type ReportCustomerRole = "jobseeker" | "shopowner" | "verifier";

export interface ReportCountItem {
  key: string;
  label: string;
  count: number;
}

export interface ReportTrendPoint {
  label: string;
  count: number;
}

export interface ReportMonitoringItem extends ReportCountItem {
  hint: string;
}

export interface AdminReport {
  range: ReportRange;
  from: string | null;
  to: string;
  filters: { categoryId: string | null; role: ReportCustomerRole | null };
  overview: {
    gigsPosted: number;
    newCustomers: number;
    applications: number;
    completedGigs: number;
    approvalRate: number | null;
    hireRate: number | null;
    reviews: number;
    averageRating: number | null;
  };
  gigs: {
    total: number;
    byStatus: ReportCountItem[];
    byCategory: ReportCountItem[];
    topLocations: ReportCountItem[];
    trend: ReportTrendPoint[];
  };
  applications: {
    total: number;
    byStatus: ReportCountItem[];
  };
  customers: {
    total: number;
    newInRange: number;
    byRole: ReportCountItem[];
    trend: ReportTrendPoint[];
    topBusinesses: ReportCountItem[];
    topApplicants: ReportCountItem[];
  };
  monitoring: ReportMonitoringItem[];
}

export interface AdminReportFilters {
  range: ReportRange;
  categoryId?: string;
  role?: ReportCustomerRole;
}

export async function getAdminReport(filters: AdminReportFilters): Promise<AdminReport> {
  try {
    const { data } = await http.get("/admin/reports/summary", {
      params: { range: filters.range, categoryId: filters.categoryId, role: filters.role },
    });
    return data.report;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load the report."));
  }
}
