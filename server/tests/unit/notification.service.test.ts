import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  notification: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  user: { findUnique: vi.fn() },
}));

vi.mock("../../src/config/db", () => ({ prisma }));
vi.mock("../../src/services/email.service");
vi.mock("../../src/services/pushNotification.service", () => ({ sendPushNotification: vi.fn() }));

import * as emailService from "../../src/services/email.service";
import { sendPushNotification } from "../../src/services/pushNotification.service";
import {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../src/services/notification.service";

const recipient = { email: "nimal@example.com", name: "Nimal Perera" };

describe("createNotification", () => {
  beforeEach(() => {
    prisma.notification.create.mockImplementation(async ({ data }) => ({ id: "n1", ...data }));
    prisma.notification.update.mockResolvedValue({});
    prisma.user.findUnique.mockResolvedValue(recipient);
  });

  it.each(["GIG_COMPLETED", "REVIEW_REPORTED", "GIG_APPROVED", "GIG_REJECTED"] as const)(
    "saves %s as NOT_REQUIRED and sends no email",
    async (type) => {
      const notification = await createNotification({ recipientId: "u1", type, title: "T", message: "M" });

      expect(notification.emailStatus).toBe("NOT_REQUIRED");
      expect(prisma.notification.update).not.toHaveBeenCalled();
      for (const send of Object.values(emailService)) {
        if (vi.isMockFunction(send)) expect(send).not.toHaveBeenCalled();
      }
    }
  );

  it("saves an email-bearing type as PENDING, sends the matching email and marks it SENT", async () => {
    await createNotification({
      recipientId: "u1",
      type: "REVIEW_RECEIVED",
      title: "New review",
      message: "You got a review",
      emailParams: { raterName: "Kamala Stores", rating: 5, gigTitle: "Shelf stacking" },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ recipientId: "u1", type: "REVIEW_RECEIVED", emailStatus: "PENDING" }),
    });
    expect(emailService.sendReviewReceivedEmail).toHaveBeenCalledWith("nimal@example.com", {
      recipientName: "Nimal Perera",
      raterName: "Kamala Stores",
      rating: 5,
      gigTitle: "Shelf stacking",
    });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: "n1" }, data: { emailStatus: "SENT" } });
  });

  it("routes REVIEW_REQUESTED to the combined gig-completed email", async () => {
    await createNotification({
      recipientId: "u1",
      type: "REVIEW_REQUESTED",
      title: "T",
      message: "M",
      emailParams: { counterpartName: "Kamala Stores", gigTitle: "Cashier", paymentAmount: 2500, paymentType: "DAILY" },
    });

    expect(emailService.sendGigCompletedAndReviewRequestedEmail).toHaveBeenCalledWith("nimal@example.com", {
      recipientName: "Nimal Perera",
      counterpartName: "Kamala Stores",
      gigTitle: "Cashier",
      paymentAmount: 2500,
      paymentType: "DAILY",
    });
  });

  it.each([
    ["REVIEW_REMOVED", "sendReviewRemovedEmail"],
    ["REPORT_RESOLVED", "sendReportResolvedEmail"],
    ["REPORT_DISMISSED", "sendReportDismissedEmail"],
    ["ACCOUNT_WARNING", "sendAccountWarningEmail"],
    ["GIG_POSTED", "sendGigPostedEmail"],
    ["APPLICATION_SUBMITTED", "sendApplicationSubmittedEmail"],
    ["APPLICATION_HIRED", "sendHiredConfirmationEmail"],
  ] as const)("routes %s to %s", async (type, sender) => {
    await createNotification({ recipientId: "u1", type, title: "T", message: "M", emailParams: { gigTitle: "Cashier" } });

    expect(emailService[sender]).toHaveBeenCalledTimes(1);
    expect(vi.mocked(emailService[sender]).mock.calls[0][0]).toBe("nimal@example.com");
    expect(vi.mocked(emailService[sender]).mock.calls[0][1]).toMatchObject({ recipientName: "Nimal Perera" });
  });

  it("keeps the notification and marks emailStatus FAILED when the email send throws", async () => {
    vi.mocked(emailService.sendAccountWarningEmail).mockRejectedValueOnce(new Error("SMTP down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const notification = await createNotification({
      recipientId: "u1",
      type: "ACCOUNT_WARNING",
      title: "Warning",
      message: "Be nice",
      emailParams: { reason: "Abuse" },
    });

    expect(notification.id).toBe("n1");
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: "n1" }, data: { emailStatus: "FAILED" } });
  });

  it("does not try to email when the recipient no longer exists", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await createNotification({ recipientId: "ghost", type: "ACCOUNT_WARNING", title: "T", message: "M" });

    expect(emailService.sendAccountWarningEmail).not.toHaveBeenCalled();
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it("always sends a push notification with the notification id and link", async () => {
    await createNotification({
      recipientId: "u1",
      type: "GIG_APPROVED",
      title: "Approved",
      message: "Your gig is live",
      link: "/gigs/g1",
      relatedEntityId: "g1",
    });

    expect(sendPushNotification).toHaveBeenCalledWith({
      recipientId: "u1",
      title: "Approved",
      body: "Your gig is live",
      data: { notificationId: "n1", type: "GIG_APPROVED", link: "/gigs/g1", relatedEntityId: "g1" },
    });
  });
});

describe("getNotificationsForUser", () => {
  beforeEach(() => {
    prisma.notification.findMany.mockResolvedValue([{ id: "n1" }]);
    prisma.notification.count.mockResolvedValueOnce(12).mockResolvedValueOnce(3);
  });

  it("defaults to page 1, 20 per page, newest first, all notifications", async () => {
    const result = await getNotificationsForUser("u1");

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { recipientId: "u1" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
    expect(result).toEqual({ notifications: [{ id: "n1" }], total: 12, unreadCount: 3, page: 1, limit: 20 });
  });

  it("filters unread and read notifications", async () => {
    await getNotificationsForUser("u1", { filter: "unread" });
    expect(prisma.notification.findMany.mock.calls[0][0].where).toEqual({ recipientId: "u1", isRead: false });

    await getNotificationsForUser("u1", { filter: "read" });
    expect(prisma.notification.findMany.mock.calls[1][0].where).toEqual({ recipientId: "u1", isRead: true });
  });

  it("clamps page and limit to safe bounds", async () => {
    const result = await getNotificationsForUser("u1", { page: 0, limit: 500 });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);

    await getNotificationsForUser("u1", { page: 3, limit: 0 });
    expect(prisma.notification.findMany.mock.calls[1][0]).toMatchObject({ skip: 2, take: 1 });
  });
});

describe("getUnreadCount", () => {
  it("counts only this user's unread notifications", async () => {
    prisma.notification.count.mockResolvedValue(4);

    await expect(getUnreadCount("u1")).resolves.toBe(4);
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { recipientId: "u1", isRead: false } });
  });
});

describe("markNotificationRead", () => {
  it("returns null when the notification is missing or belongs to someone else", async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(markNotificationRead("u1", "someone-elses")).resolves.toBeNull();
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: "someone-elses", recipientId: "u1" } });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it("returns an already-read notification without updating it", async () => {
    const existing = { id: "n1", isRead: true };
    prisma.notification.findFirst.mockResolvedValue(existing);

    await expect(markNotificationRead("u1", "n1")).resolves.toBe(existing);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it("marks an unread notification as read with a timestamp", async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: "n1", isRead: false });
    prisma.notification.update.mockResolvedValue({ id: "n1", isRead: true });

    await markNotificationRead("u1", "n1");

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });
});

describe("markAllNotificationsRead", () => {
  it("updates each unread notification individually and returns how many changed", async () => {
    prisma.notification.findMany.mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    prisma.notification.update.mockResolvedValue({});

    await expect(markAllNotificationsRead("u1")).resolves.toBe(2);
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { recipientId: "u1", isRead: false },
      select: { id: true },
    });
    expect(prisma.notification.update).toHaveBeenCalledTimes(2);
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: "n2" },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });

  it("returns 0 when there is nothing unread", async () => {
    prisma.notification.findMany.mockResolvedValue([]);

    await expect(markAllNotificationsRead("u1")).resolves.toBe(0);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});
