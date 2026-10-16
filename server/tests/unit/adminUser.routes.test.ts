import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  user: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
  userStatusEvent: { create: vi.fn(), findMany: vi.fn() },
  gigPost: { count: vi.fn() },
  application: { count: vi.fn() },
  workHistoryEntry: { count: vi.fn() },
  notification: { count: vi.fn(), findMany: vi.fn() },
  verificationRequest: { findFirst: vi.fn() },
  verifierApplication: { findFirst: vi.fn() },
  review: { aggregate: vi.fn(), groupBy: vi.fn() },
}));

vi.mock("../../src/config/db", () => ({ prisma, neonSql: vi.fn() }));
vi.mock("../../src/services/notification.service");
vi.mock("../../src/services/accountStatus.service", async (importOriginal) =>
  (await import("./helpers/accountStatus")).activeAccounts(importOriginal)
);

import { app } from "../../src/app";
import { createNotification } from "../../src/services/notification.service";
import { invalidateAccountStatus } from "../../src/services/accountStatus.service";
import { bearer } from "./helpers/auth";

const admin = bearer("admin-1", "admin");

describe("access control", () => {
  it.each([
    ["get", "/api/admin/users"],
    ["get", "/api/admin/users/u1"],
    ["patch", "/api/admin/users/u1/disable"],
    ["patch", "/api/admin/users/u1/enable"],
  ] as const)("%s %s returns 401 without a token", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it.each(["jobseeker", "shopowner", "verifier"])("returns 403 for a %s", async (role) => {
    const res = await request(app).get("/api/admin/users").set(bearer("u1", role));

    expect(res.status).toBe(403);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    prisma.user.findMany.mockResolvedValue([{ id: "u1", name: "Nimal Perera" }]);
    prisma.user.count
      .mockResolvedValueOnce(1) // matching the status filter
      .mockResolvedValueOnce(8) // active
      .mockResolvedValueOnce(2); // disabled
  });

  it("lists everyone, newest first, with status counts", async () => {
    const res = await request(app).get("/api/admin/users").set(admin);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      users: [{ id: "u1", name: "Nimal Perera" }],
      total: 1,
      page: 1,
      limit: 20,
      counts: { all: 10, active: 8, disabled: 2 },
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { createdAt: "desc" }, skip: 0, take: 20 })
    );
  });

  it("searches name, email and phone and filters by role", async () => {
    await request(app).get("/api/admin/users?search=%20nimal%20&role=jobseeker").set(admin);

    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({
      role: "jobseeker",
      OR: [
        { name: { contains: "nimal", mode: "insensitive" } },
        { email: { contains: "nimal", mode: "insensitive" } },
        { phone: { contains: "nimal" } },
      ],
    });
  });

  it("filters by status while counting across the role", async () => {
    await request(app).get("/api/admin/users?role=shopowner&status=disabled&page=2&limit=5").set(admin);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: "shopowner", isDisabled: true }, skip: 5, take: 5 })
    );
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: "shopowner", isDisabled: false } });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { role: "shopowner", isDisabled: true } });
  });

  it.each([
    ["role=superuser"],
    ["status=banned"],
    ["limit=500"],
  ])("rejects an invalid filter (%s)", async (query) => {
    const res = await request(app).get(`/api/admin/users?${query}`).set(admin);

    expect(res.status).toBe(400);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/users/:id", () => {
  it("returns 404 for an unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/admin/users/ghost").set(admin);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });

  it("returns the profile, activity, reputation, warnings, verification and status history", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", name: "Nimal Perera", isDisabled: false });
    prisma.gigPost.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.application.count.mockResolvedValueOnce(6).mockResolvedValueOnce(3);
    prisma.workHistoryEntry.count.mockResolvedValue(2);
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 2 } });
    prisma.review.groupBy.mockResolvedValue([{ rating: 4, _count: { rating: 1 } }, { rating: 5, _count: { rating: 1 } }]);
    prisma.notification.count.mockResolvedValue(1);
    prisma.notification.findMany.mockResolvedValue([{ id: "n1", message: "Be respectful", createdAt: "2026-10-01T00:00:00.000Z" }]);
    prisma.userStatusEvent.findMany.mockResolvedValue([
      { id: "e1", action: "ENABLED", reason: null, createdAt: "2026-10-02T00:00:00.000Z", admin: { id: "admin-1", name: "Admin" } },
    ]);
    prisma.verificationRequest.findFirst.mockResolvedValue({ status: "APPROVED", submittedAt: "2026-09-01T00:00:00.000Z" });
    prisma.verifierApplication.findFirst.mockResolvedValue(null);

    const res = await request(app).get("/api/admin/users/u1").set(admin);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: { id: "u1", name: "Nimal Perera", isDisabled: false },
      stats: { gigsPosted: 0, activeGigs: 0, applications: 6, hiredApplications: 3, completedJobs: 2 },
      reputation: {
        userId: "u1",
        averageRating: 4.5,
        totalReviews: 2,
        distribution: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 },
      },
      warnings: { total: 1, recent: [{ id: "n1", message: "Be respectful", createdAt: "2026-10-01T00:00:00.000Z" }] },
      verification: {
        jobSeekerRequest: { status: "APPROVED", submittedAt: "2026-09-01T00:00:00.000Z" },
        verifierApplication: null,
      },
      statusHistory: [
        { id: "e1", action: "ENABLED", reason: null, createdAt: "2026-10-02T00:00:00.000Z", admin: { id: "admin-1", name: "Admin" } },
      ],
    });
  });
});

describe("PATCH /api/admin/users/:id/disable", () => {
  const disable = (id: string, body: object = { reason: "Repeated no-shows" }) =>
    request(app).patch(`/api/admin/users/${id}/disable`).set(admin).send(body);

  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "jobseeker", isDisabled: false });
    prisma.user.update.mockResolvedValue({ id: "u1", isDisabled: true, disabledReason: "Repeated no-shows" });
  });

  it("disables the account, records who did it and notifies the user", async () => {
    const res = await disable("u1");

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: "u1", isDisabled: true, disabledReason: "Repeated no-shows" });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { isDisabled: true, disabledAt: expect.any(Date), disabledReason: "Repeated no-shows" },
      })
    );
    expect(prisma.userStatusEvent.create).toHaveBeenCalledWith({
      data: { userId: "u1", adminId: "admin-1", action: "DISABLED", reason: "Repeated no-shows" },
    });
    expect(invalidateAccountStatus).toHaveBeenCalledWith("u1");
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "u1", type: "ACCOUNT_DISABLED", emailParams: { reason: "Repeated no-shows" } })
    );
  });

  it("still succeeds when the notification can't be sent", async () => {
    vi.mocked(createNotification).mockRejectedValue(new Error("SMTP down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await disable("u1");

    expect(res.status).toBe(200);
    expect(prisma.userStatusEvent.create).toHaveBeenCalled();
  });

  it.each([
    [{}, "Invalid input: expected string, received undefined"],
    [{ reason: "  bad " }, "Please give a reason for disabling this account."],
  ])("requires a meaningful reason (%o)", async (body, message) => {
    const res = await disable("u1", body);

    expect(res.status).toBe(400);
    expect(res.body.issues[0].message).toBe(message);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("won't let an admin disable themselves", async () => {
    const res = await disable("admin-1");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "You can't change the status of your own account." });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("won't disable another admin", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "admin-2", role: "admin", isDisabled: false });

    const res = await disable("admin-2");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Admin accounts can't be disabled or enabled here." });
  });

  it("returns 404 for an unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await disable("ghost");

    expect(res.status).toBe(404);
  });

  it("returns 409 when the account is already disabled", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "jobseeker", isDisabled: true });

    const res = await disable("u1");

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "This account is already disabled." });
    expect(prisma.userStatusEvent.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/users/:id/enable", () => {
  const enable = (id: string, body: object = {}) =>
    request(app).patch(`/api/admin/users/${id}/enable`).set(admin).send(body);

  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "shopowner", isDisabled: true });
    prisma.user.update.mockResolvedValue({ id: "u1", isDisabled: false });
  });

  it("re-enables the account and clears the disable details", async () => {
    const res = await enable("u1", { reason: "Appeal accepted" });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDisabled: false, disabledAt: null, disabledReason: null } })
    );
    expect(prisma.userStatusEvent.create).toHaveBeenCalledWith({
      data: { userId: "u1", adminId: "admin-1", action: "ENABLED", reason: "Appeal accepted" },
    });
    expect(invalidateAccountStatus).toHaveBeenCalledWith("u1");
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "ACCOUNT_ENABLED" }));
  });

  it("does not need a note", async () => {
    const res = await enable("u1");

    expect(res.status).toBe(200);
    expect(prisma.userStatusEvent.create.mock.calls[0][0].data.reason).toBeUndefined();
  });

  it("returns 409 when the account is already active", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", role: "shopowner", isDisabled: false });

    const res = await enable("u1");

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "This account is already active." });
  });
});
