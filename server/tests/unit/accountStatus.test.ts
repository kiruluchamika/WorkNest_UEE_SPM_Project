import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  gigPost: { findMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("../../src/config/db", () => ({ prisma, neonSql: vi.fn() }));
vi.mock("../../src/services/notification.service");
vi.mock("../../src/services/email.service");

import { app } from "../../src/app";
import { getUnreadCount } from "../../src/services/notification.service";
import { invalidateAccountStatus } from "../../src/services/accountStatus.service";
import { hashPassword } from "../../src/utils/hash";
import { bearer } from "./helpers/auth";

// The status cache is module-level, so each test signs in as its own user id.
let nextId = 0;
const freshUser = () => `user-${++nextId}`;
const status = (isDisabled: boolean, disabledReason: string | null = null) => ({ isDisabled, disabledReason });

describe("requireAuth account status check", () => {
  it("lets an active account through", async () => {
    const id = freshUser();
    prisma.user.findUnique.mockResolvedValue(status(false));
    vi.mocked(getUnreadCount).mockResolvedValue(2);

    const res = await request(app).get("/api/notifications/unread-count").set(bearer(id));

    expect(res.status).toBe(200);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id },
      select: { isDisabled: true, disabledReason: true },
    });
  });

  it("blocks a still-valid session once the account is disabled", async () => {
    prisma.user.findUnique.mockResolvedValue(status(true, "Repeated no-shows"));

    const res = await request(app).get("/api/notifications/unread-count").set(bearer(freshUser()));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Your account has been disabled by an administrator. Reason: Repeated no-shows",
      code: "ACCOUNT_DISABLED",
    });
    expect(getUnreadCount).not.toHaveBeenCalled();
  });

  it("rejects a token for an account that no longer exists", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/notifications/unread-count").set(bearer(freshUser()));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid or expired session" });
  });

  it("caches the status between requests and refetches after invalidation", async () => {
    const id = freshUser();
    prisma.user.findUnique.mockResolvedValue(status(false));
    vi.mocked(getUnreadCount).mockResolvedValue(0);

    await request(app).get("/api/notifications/unread-count").set(bearer(id));
    await request(app).get("/api/notifications/unread-count").set(bearer(id));
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);

    // An admin disables the account: the next request must see it immediately.
    prisma.user.findUnique.mockResolvedValue(status(true));
    invalidateAccountStatus(id);
    const res = await request(app).get("/api/notifications/unread-count").set(bearer(id));

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Your account has been disabled by an administrator.");
  });

  it("returns 500 rather than letting the request through when the lookup fails", async () => {
    prisma.user.findUnique.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get("/api/notifications/unread-count").set(bearer(freshUser()));

    expect(res.status).toBe(500);
    expect(getUnreadCount).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login", () => {
  let passwordHash: string;
  beforeAll(async () => {
    passwordHash = await hashPassword("Passw0rd!");
  });

  const account = (overrides = {}) => ({
    id: "u1",
    name: "Nimal Perera",
    email: "nimal@example.com",
    role: "jobseeker",
    phone: null,
    bio: null,
    location: null,
    avatarUrl: null,
    trustScore: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    verifierApplications: [],
    passwordHash,
    isDisabled: false,
    disabledReason: null,
    ...overrides,
  });

  it("signs in an active account", async () => {
    prisma.user.findUnique.mockResolvedValue(account());

    const res = await request(app).post("/api/auth/login").send({ email: "nimal@example.com", password: "Passw0rd!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("refuses a disabled account and explains why", async () => {
    prisma.user.findUnique.mockResolvedValue(account({ isDisabled: true, disabledReason: "Fake reviews" }));

    const res = await request(app).post("/api/auth/login").send({ email: "nimal@example.com", password: "Passw0rd!" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Your account has been disabled by an administrator. Reason: Fake reviews",
      code: "ACCOUNT_DISABLED",
    });
  });

  it("does not reveal that an account is disabled to a wrong password", async () => {
    prisma.user.findUnique.mockResolvedValue(account({ isDisabled: true, disabledReason: "Fake reviews" }));

    const res = await request(app).post("/api/auth/login").send({ email: "nimal@example.com", password: "wrong-pass" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
  });
});

describe("disabled shop owners' gigs", () => {
  it("leaves them out of the job seeker gig board", async () => {
    prisma.user.findUnique.mockResolvedValue(status(false));
    prisma.gigPost.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/gigs").set(bearer(freshUser()));

    expect(res.status).toBe(200);
    expect(prisma.gigPost.findMany.mock.calls[0][0].where).toMatchObject({
      status: "ACTIVE",
      isDeleted: false,
      business: { isDisabled: false },
    });
  });

  it("refuses new applications to them", async () => {
    prisma.user.findUnique.mockResolvedValue(status(false));
    prisma.gigPost.findFirst.mockResolvedValue({
      id: "g1",
      status: "ACTIVE",
      workersNeeded: 1,
      business: { name: "Kamala Stores", isDisabled: true },
    });

    const res = await request(app).post("/api/applications").set(bearer(freshUser())).send({ gigId: "g1" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "This gig is not currently accepting applications." });
  });
});
