import { describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../../src/config/db", () => ({ prisma: {}, neonSql: vi.fn() }));
vi.mock("../../src/services/notification.service");
vi.mock("../../src/services/pushNotification.service");
vi.mock("../../src/services/accountStatus.service", async (importOriginal) =>
  (await import("./helpers/accountStatus")).activeAccounts(importOriginal)
);

import { app } from "../../src/app";
import * as notificationService from "../../src/services/notification.service";
import * as pushService from "../../src/services/pushNotification.service";
import { bearer } from "./helpers/auth";

const auth = bearer("u1");

describe("authentication", () => {
  it.each([
    ["get", "/api/notifications"],
    ["get", "/api/notifications/unread-count"],
    ["patch", "/api/notifications/read-all"],
    ["patch", "/api/notifications/n1/read"],
    ["post", "/api/notifications/push-token"],
    ["delete", "/api/notifications/push-token"],
  ] as const)("%s %s returns 401 without a token", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });

  it("returns 401 for a tampered token", async () => {
    const res = await request(app).get("/api/notifications").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid or expired session" });
  });
});

describe("GET /api/notifications", () => {
  it("lists the signed-in user's notifications", async () => {
    vi.mocked(notificationService.getNotificationsForUser).mockResolvedValue({
      notifications: [{ id: "n1", title: "Hello" }],
      total: 1,
      unreadCount: 1,
      page: 1,
      limit: 20,
    } as never);

    const res = await request(app).get("/api/notifications").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, unreadCount: 1, total: 1, notifications: [{ id: "n1", title: "Hello" }] });
    expect(notificationService.getNotificationsForUser).toHaveBeenCalledWith("u1", {
      page: undefined,
      limit: undefined,
      filter: "all",
    });
  });

  it("passes page, limit and a valid filter through", async () => {
    vi.mocked(notificationService.getNotificationsForUser).mockResolvedValue({ notifications: [] } as never);

    await request(app).get("/api/notifications?page=2&limit=5&filter=unread").set(auth);

    expect(notificationService.getNotificationsForUser).toHaveBeenCalledWith("u1", { page: 2, limit: 5, filter: "unread" });
  });

  it("falls back to 'all' for an unknown filter", async () => {
    vi.mocked(notificationService.getNotificationsForUser).mockResolvedValue({ notifications: [] } as never);

    await request(app).get("/api/notifications?filter=bogus").set(auth);

    expect(vi.mocked(notificationService.getNotificationsForUser).mock.calls[0][1]?.filter).toBe("all");
  });

  it("returns 500 when the service fails", async () => {
    vi.mocked(notificationService.getNotificationsForUser).mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get("/api/notifications").set(auth);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});

describe("GET /api/notifications/unread-count", () => {
  it("returns the unread count", async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(7);

    const res = await request(app).get("/api/notifications/unread-count").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, unreadCount: 7 });
    expect(notificationService.getUnreadCount).toHaveBeenCalledWith("u1");
  });
});

describe("PATCH /api/notifications/:notificationId/read", () => {
  it("marks the notification read", async () => {
    vi.mocked(notificationService.markNotificationRead).mockResolvedValue({ id: "n1", isRead: true } as never);

    const res = await request(app).patch("/api/notifications/n1/read").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, notification: { id: "n1", isRead: true } });
    expect(notificationService.markNotificationRead).toHaveBeenCalledWith("u1", "n1");
  });

  it("returns 404 when the notification is not the user's", async () => {
    vi.mocked(notificationService.markNotificationRead).mockResolvedValue(null);

    const res = await request(app).patch("/api/notifications/other/read").set(auth);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Notification not found" });
  });
});

describe("PATCH /api/notifications/read-all", () => {
  it("marks everything read for the signed-in user", async () => {
    vi.mocked(notificationService.markAllNotificationsRead).mockResolvedValue(3);

    const res = await request(app).patch("/api/notifications/read-all").set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(notificationService.markAllNotificationsRead).toHaveBeenCalledWith("u1");
  });
});

describe("POST /api/notifications/push-token", () => {
  it("registers a push token and returns 204", async () => {
    vi.mocked(pushService.registerPushToken).mockResolvedValue(undefined as never);

    const res = await request(app)
      .post("/api/notifications/push-token")
      .set(auth)
      .send({ token: "ExponentPushToken[abc]", platform: "android" });

    expect(res.status).toBe(204);
    expect(pushService.registerPushToken).toHaveBeenCalledWith({
      userId: "u1",
      token: "ExponentPushToken[abc]",
      platform: "android",
    });
  });

  it("returns 400 when the token is missing", async () => {
    const res = await request(app).post("/api/notifications/push-token").set(auth).send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Push token is required" });
    expect(pushService.registerPushToken).not.toHaveBeenCalled();
  });

  it("returns 400 when the service rejects the token", async () => {
    vi.mocked(pushService.registerPushToken).mockRejectedValue(new Error("bad token"));

    const res = await request(app).post("/api/notifications/push-token").set(auth).send({ token: "garbage" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid Expo push token" });
  });
});

describe("DELETE /api/notifications/push-token", () => {
  it("unregisters a push token and returns 204", async () => {
    const res = await request(app)
      .delete("/api/notifications/push-token")
      .set(auth)
      .send({ token: "ExponentPushToken[abc]" });

    expect(res.status).toBe(204);
    expect(pushService.unregisterPushToken).toHaveBeenCalledWith("u1", "ExponentPushToken[abc]");
  });

  it("returns 400 when the token is missing", async () => {
    const res = await request(app).delete("/api/notifications/push-token").set(auth).send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Push token is required" });
  });
});
