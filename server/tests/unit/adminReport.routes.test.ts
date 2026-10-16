import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../src/config/db", () => ({ prisma: {}, neonSql: vi.fn() }));
vi.mock("../../src/services/adminReport.service", async (importOriginal) => ({
  // Keep the real REPORT_RANGES / CUSTOMER_ROLES the controller validates against.
  ...(await importOriginal<typeof import("../../src/services/adminReport.service")>()),
  getAdminReportSummary: vi.fn(),
}));

import { app } from "../../src/app";
import { getAdminReportSummary } from "../../src/services/adminReport.service";
import { bearer } from "./helpers/auth";

const URL = "/api/admin/reports/summary";
const admin = bearer("admin-1", "admin");

beforeEach(() => {
  vi.mocked(getAdminReportSummary).mockResolvedValue({ range: "30d" } as never);
});

describe("GET /api/admin/reports/summary", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  it.each(["jobseeker", "shopowner", "verifier"])("returns 403 for a %s", async (role) => {
    const res = await request(app).get(URL).set(bearer("u1", role));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Forbidden" });
    expect(getAdminReportSummary).not.toHaveBeenCalled();
  });

  it("returns the report for an admin, defaulting to the last 30 days", async () => {
    const res = await request(app).get(URL).set(admin);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ report: { range: "30d" } });
    expect(getAdminReportSummary).toHaveBeenCalledWith({ range: "30d", role: undefined, categoryId: undefined });
  });

  it("passes range, role and category filters through", async () => {
    await request(app).get(`${URL}?range=7d&role=verifier&categoryId=retail`).set(admin);

    expect(getAdminReportSummary).toHaveBeenCalledWith({ range: "7d", role: "verifier", categoryId: "retail" });
  });

  it("treats empty role and category values as no filter", async () => {
    await request(app).get(`${URL}?range=all&role=&categoryId=`).set(admin);

    expect(getAdminReportSummary).toHaveBeenCalledWith({ range: "all", role: undefined, categoryId: undefined });
  });

  it("rejects an unknown range", async () => {
    const res = await request(app).get(`${URL}?range=1y`).set(admin);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "range must be one of: 7d, 30d, 90d, all" });
    expect(getAdminReportSummary).not.toHaveBeenCalled();
  });

  it("rejects admin as a customer role filter", async () => {
    const res = await request(app).get(`${URL}?role=admin`).set(admin);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "role must be one of: jobseeker, shopowner, verifier" });
  });

  it("returns 500 when the report fails to build", async () => {
    vi.mocked(getAdminReportSummary).mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get(URL).set(admin);

    expect(res.status).toBe(500);
  });
});
