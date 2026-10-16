import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  review: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
  workHistoryEntry: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("../../src/config/db", () => ({ prisma, neonSql: vi.fn() }));
vi.mock("../../src/services/email.service");
vi.mock("../../src/services/accountStatus.service", async (importOriginal) =>
  (await import("./helpers/accountStatus")).activeAccounts(importOriginal)
);

import { app } from "../../src/app";
import { bearer } from "./helpers/auth";

const auth = bearer("u1");

describe("authentication", () => {
  it.each([
    ["get", "/api/users/u2/reviews"],
    ["get", "/api/users/u2/reputation"],
    ["get", "/api/users/u2/work-history"],
    ["get", "/api/auth/me"],
    ["put", "/api/auth/me"],
  ] as const)("%s %s returns 401 without a token", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/users/:userId/reviews", () => {
  beforeEach(() => {
    prisma.review.findMany.mockResolvedValue([{ id: "r1", rating: 5 }]);
    prisma.review.count.mockResolvedValue(1);
  });

  it("returns the user's published reviews, newest first", async () => {
    const res = await request(app).get("/api/users/u2/reviews").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reviews: [{ id: "r1", rating: 5 }], total: 1, page: 1, limit: 20 });
    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { revieweeId: "u2", status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      })
    );
    expect(prisma.review.count).toHaveBeenCalledWith({ where: { revieweeId: "u2", status: "PUBLISHED" } });
  });

  it("paginates with page and limit", async () => {
    const res = await request(app).get("/api/users/u2/reviews?page=3&limit=10").set(auth);

    expect(res.body).toMatchObject({ page: 3, limit: 10 });
    expect(prisma.review.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
  });

  it.each([
    ["page=0&limit=999", 1, 50],
    ["page=-4&limit=-1", 1, 1],
    ["page=abc&limit=xyz", 1, 20],
  ])("clamps bad pagination (%s)", async (query, page, limit) => {
    const res = await request(app).get(`/api/users/u2/reviews?${query}`).set(auth);

    expect(res.body).toMatchObject({ page, limit });
  });
});

describe("GET /api/users/:userId/reputation", () => {
  it("returns 404 for an unknown user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/users/ghost/reputation").set(auth);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
    expect(prisma.review.aggregate).not.toHaveBeenCalled();
  });

  it("returns the rounded average and the star distribution", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u2" });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.256 }, _count: { rating: 7 } });
    prisma.review.groupBy.mockResolvedValue([
      { rating: 5, _count: { rating: 4 } },
      { rating: 4, _count: { rating: 2 } },
      { rating: 2, _count: { rating: 1 } },
    ]);

    const res = await request(app).get("/api/users/u2/reputation").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      reputation: {
        userId: "u2",
        averageRating: 4.3,
        totalReviews: 7,
        distribution: { "1": 0, "2": 1, "3": 0, "4": 2, "5": 4 },
      },
    });
  });

  it("returns a null average for a user with no reviews", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u2" });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { rating: 0 } });
    prisma.review.groupBy.mockResolvedValue([]);

    const res = await request(app).get("/api/users/u2/reputation").set(auth);

    expect(res.body.reputation).toMatchObject({ averageRating: null, totalReviews: 0 });
  });
});

describe("GET /api/users/:userId/work-history", () => {
  const business = { id: "shop-a", name: "Kamala Stores" };
  const applicant = { id: "u1", name: "Nimal Perera" };
  const entry = (id: string, gigId: string, role: string) => ({
    id,
    gigId,
    role,
    completedAt: "2026-10-01T00:00:00.000Z",
    gigStatus: "COMPLETED",
    gig: { id: gigId, title: `Gig ${gigId}`, business },
    application: { applicant },
  });

  beforeEach(() => {
    prisma.workHistoryEntry.findMany.mockResolvedValue([entry("w1", "g1", "YOUTH"), entry("w2", "g2", "YOUTH")]);
    prisma.workHistoryEntry.count.mockResolvedValue(2);
    prisma.review.findMany.mockResolvedValue([{ gigId: "g1", revieweeId: "shop-a" }]);
  });

  it("shows the business as counterpart for a youth's entries", async () => {
    const res = await request(app).get("/api/users/u2/work-history").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.workHistory[0]).toEqual({
      id: "w1",
      gigId: "g1",
      gigTitle: "Gig g1",
      role: "YOUTH",
      completedAt: "2026-10-01T00:00:00.000Z",
      gigStatus: "COMPLETED",
      counterpartId: "shop-a",
      counterpartName: "Kamala Stores",
    });
  });

  it("shows the applicant as counterpart for a business's entries", async () => {
    prisma.workHistoryEntry.findMany.mockResolvedValue([entry("w1", "g1", "BUSINESS")]);

    const res = await request(app).get("/api/users/shop-a/work-history").set(auth);

    expect(res.body.workHistory[0]).toMatchObject({ counterpartId: "u1", counterpartName: "Nimal Perera" });
  });

  it("hides review status when viewing someone else's history", async () => {
    const res = await request(app).get("/api/users/u2/work-history").set(auth);

    expect(res.body.workHistory[0]).not.toHaveProperty("hasReviewed");
    expect(prisma.review.findMany).not.toHaveBeenCalled();
  });

  it("flags which entries the user has already reviewed on their own history", async () => {
    const res = await request(app).get("/api/users/u1/work-history").set(auth);

    expect(prisma.review.findMany).toHaveBeenCalledWith({
      where: { reviewerId: "u1", gigId: { in: ["g1", "g2"] } },
      select: { gigId: true, revieweeId: true },
    });
    expect(res.body.workHistory.map((w: { hasReviewed: boolean }) => w.hasReviewed)).toEqual([true, false]);
  });

  it("skips the review lookup when the user's history is empty", async () => {
    prisma.workHistoryEntry.findMany.mockResolvedValue([]);
    prisma.workHistoryEntry.count.mockResolvedValue(0);

    const res = await request(app).get("/api/users/u1/work-history").set(auth);

    expect(res.body).toEqual({ workHistory: [], total: 0, page: 1, limit: 20 });
    expect(prisma.review.findMany).not.toHaveBeenCalled();
  });
});

describe("profile (/api/auth/me)", () => {
  const dbUser = {
    id: "u1",
    name: "Nimal Perera",
    email: "nimal@example.com",
    role: "jobseeker",
    phone: null,
    bio: "Hard worker",
    location: "Colombo",
    avatarUrl: null,
    trustScore: 80,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    passwordHash: "secret-hash",
  };

  it("returns the signed-in user without private fields", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...dbUser, verifierApplications: [] });

    const res = await request(app).get("/api/auth/me").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: "u1",
      name: "Nimal Perera",
      email: "nimal@example.com",
      role: "jobseeker",
      bio: "Hard worker",
      location: "Colombo",
      trustScore: 80,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("returns 401 when the account no longer exists", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/auth/me").set(auth);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid or expired session" });
  });

  it("prefers a pending verifier application over older approved ones", async () => {
    const application = (id: string, status: string) => ({
      id,
      status,
      submittedAt: new Date("2026-05-01T00:00:00.000Z"),
      reviewedAt: null,
      rejectionReason: null,
      approvalAcknowledgedAt: null,
      suspendedAt: null,
      suspensionReason: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      ...dbUser,
      verifierApplications: [application("a1", "APPROVED"), application("a2", "PENDING")],
    });

    const res = await request(app).get("/api/auth/me").set(auth);

    expect(res.body.user.verifierApplication).toMatchObject({ id: "a2", status: "PENDING" });
  });

  it("updates only the signed-in user's profile with trimmed values", async () => {
    prisma.user.update.mockResolvedValue({ ...dbUser, name: "Nimal P", location: "Kandy" });

    const res = await request(app)
      .put("/api/auth/me")
      .set(auth)
      .send({ name: "  Nimal P  ", location: "Kandy", role: "admin" });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: "Nimal P", location: "Kandy", role: "jobseeker" });
    // `role` is not in the schema, so it can never reach the database.
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Nimal P", location: "Kandy", phone: undefined, bio: undefined, avatarUrl: undefined },
    });
  });

  it.each([
    [{ name: "A" }, "name", "Name must be at least 2 characters"],
    [{ avatarUrl: "not-an-image" }, "avatarUrl", "Please attach a valid image."],
  ])("rejects an invalid profile update (%o)", async (body, path, message) => {
    const res = await request(app).put("/api/auth/me").set(auth).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.issues).toContainEqual({ path, message });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("accepts an https or data-URI avatar", async () => {
    prisma.user.update.mockResolvedValue({ ...dbUser, avatarUrl: "https://cdn.example.com/a.png" });

    const res = await request(app).put("/api/auth/me").set(auth).send({ avatarUrl: "https://cdn.example.com/a.png" });

    expect(res.status).toBe(200);
    expect(res.body.user.avatarUrl).toBe("https://cdn.example.com/a.png");
  });
});
