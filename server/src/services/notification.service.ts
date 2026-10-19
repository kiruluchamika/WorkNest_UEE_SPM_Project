import { NotificationType, EmailStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import * as emailService from "./email.service";
import { sendPushNotification } from "./pushNotification.service";

// Notification types that never generate an email: GIG_COMPLETED's email is
// folded into the REVIEW_REQUESTED email sent alongside it (one combined
// email instead of two), and REVIEW_REPORTED is purely an in-app receipt
// for the reporter, per the SMTP rules in the feature spec. Gig moderation
// outcomes (GIG_APPROVED / GIG_REJECTED) are in-app + push only.
const NO_EMAIL_TYPES: NotificationType[] = [
  "GIG_COMPLETED",
  "REVIEW_REPORTED",
  "GIG_APPROVED",
  "GIG_REJECTED",
];

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedEntityId?: string;
  emailParams?: Record<string, unknown>;
}

async function sendNotificationEmail(
  type: NotificationType,
  to: string,
  recipientName: string,
  params: Record<string, unknown>
): Promise<void> {
  switch (type) {
    case "REVIEW_REQUESTED":
      return emailService.sendGigCompletedAndReviewRequestedEmail(to, {
        recipientName,
        counterpartName: params.counterpartName as string,
        gigTitle: params.gigTitle as string,
        paymentAmount: params.paymentAmount as number | undefined,
        paymentType: params.paymentType as string | undefined,
      });
    case "REVIEW_RECEIVED":
      return emailService.sendReviewReceivedEmail(to, {
        recipientName,
        raterName: params.raterName as string,
        rating: params.rating as number,
        gigTitle: params.gigTitle as string,
      });
    case "REVIEW_REMOVED":
      return emailService.sendReviewRemovedEmail(to, {
        recipientName,
        gigTitle: params.gigTitle as string,
        reason: params.reason as string,
      });
    case "REPORT_RESOLVED":
      return emailService.sendReportResolvedEmail(to, {
        recipientName,
        reason: params.reason as string,
      });
    case "REPORT_DISMISSED":
      return emailService.sendReportDismissedEmail(to, {
        recipientName,
        reason: params.reason as string,
      });
    case "ACCOUNT_WARNING":
      return emailService.sendAccountWarningEmail(to, {
        recipientName,
        reason: params.reason as string,
      });
    case "ACCOUNT_DISABLED":
      return emailService.sendAccountDisabledEmail(to, {
        recipientName,
        reason: params.reason as string,
      });
    case "ACCOUNT_ENABLED":
      return emailService.sendAccountEnabledEmail(to, {
        recipientName,
        reason: params.reason as string | undefined,
      });
    case "GIG_POSTED":
      return emailService.sendGigPostedEmail(to, {
        recipientName,
        gigTitle: params.gigTitle as string,
        category: params.category as string,
        paymentAmount: params.paymentAmount as number,
        paymentType: params.paymentType as string,
        location: params.location as string,
      });
    case "APPLICATION_SUBMITTED":
      return emailService.sendApplicationSubmittedEmail(to, {
        recipientName,
        gigTitle: params.gigTitle as string,
        businessName: params.businessName as string,
        appliedDate: params.appliedDate as string,
        details: params.details as string | undefined,
      });
    case "APPLICATION_HIRED":
      return emailService.sendHiredConfirmationEmail(to, {
        recipientName,
        gigTitle: params.gigTitle as string,
        businessName: params.businessName as string,
        businessContact: params.businessContact as string | undefined,
        location: params.location as string,
        startDate: params.startDate as string,
        startTime: params.startTime as string | undefined,
        paymentAmount: params.paymentAmount as number,
        paymentType: params.paymentType as string,
      });
    case "GIG_COMPLETED":
    case "REVIEW_REPORTED":
    case "GIG_APPROVED":
    case "GIG_REJECTED":
      return;
  }
}

export async function updateEmailStatus(notificationId: string, status: EmailStatus) {
  return prisma.notification.update({ where: { id: notificationId }, data: { emailStatus: status } });
}

// Always saves the in-app notification first; email delivery is a
// best-effort side effect afterward. A failed send only flips emailStatus
// to FAILED — the notification row itself is never rolled back or deleted.
export async function createNotification(input: CreateNotificationInput) {
  const requiresEmail = !NO_EMAIL_TYPES.includes(input.type);

  const [notification, user] = await Promise.all([
    prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        relatedEntityId: input.relatedEntityId,
        emailStatus: requiresEmail ? "PENDING" : "NOT_REQUIRED",
      },
    }),
    prisma.user.findUnique({
      where: { id: input.recipientId },
      select: { email: true, name: true },
    }),
  ]);

  void sendPushNotification({
    recipientId: input.recipientId,
    title: input.title,
    body: input.message,
    data: {
      notificationId: notification.id,
      type: input.type,
      link: input.link,
      relatedEntityId: input.relatedEntityId,
    },
  });

  if (!requiresEmail || !user) {
    return notification;
  }

  try {
    await sendNotificationEmail(input.type, user.email, user.name, input.emailParams ?? {});
    await updateEmailStatus(notification.id, "SENT");
  } catch (err) {
    console.error(`Failed to send email for notification ${notification.id}:`, err);
    await updateEmailStatus(notification.id, "FAILED").catch(() => {});
  }

  return notification;
}

export interface ListNotificationsOptions {
  page?: number;
  limit?: number;
  filter?: "all" | "unread" | "read";
}

export async function getNotificationsForUser(recipientId: string, options: ListNotificationsOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));

  const where: Prisma.NotificationWhereInput = { recipientId };
  if (options.filter === "unread") where.isRead = false;
  if (options.filter === "read") where.isRead = true;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { recipientId, isRead: false } }),
  ]);

  return { notifications, total, unreadCount, page, limit };
}

export async function getUnreadCount(recipientId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId, isRead: false } });
}

// Returns null when the notification doesn't exist OR doesn't belong to
// this user — callers turn that into a 404, never revealing which case it was.
export async function markNotificationRead(recipientId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, recipientId },
  });
  if (!existing) return null;
  if (existing.isRead) return existing;

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

// updateMany is avoided here: the Neon HTTP adapter implicitly wraps it in
// an interactive transaction, which isn't supported in HTTP mode — so
// unread rows are fetched and updated individually instead.
export async function markAllNotificationsRead(recipientId: string): Promise<number> {
  const unread = await prisma.notification.findMany({
    where: { recipientId, isRead: false },
    select: { id: true },
  });

  const readAt = new Date();
  await Promise.all(
    unread.map((notification) =>
      prisma.notification.update({
        where: { id: notification.id },
        data: { isRead: true, readAt },
      })
    )
  );

  return unread.length;
}
