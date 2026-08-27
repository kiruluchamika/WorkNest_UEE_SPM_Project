import { NotificationType } from "@prisma/client";
import { prisma } from "../config/db";
import * as emailService from "./email.service";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkType?: string;
  linkId?: string;
  emailParams?: Record<string, unknown>;
}

async function sendNotificationEmail(
  type: NotificationType,
  to: string,
  recipientName: string,
  params: Record<string, unknown>
): Promise<void> {
  switch (type) {
    case "GIG_COMPLETED":
      return emailService.sendGigCompletionEmail(to, {
        recipientName,
        gigTitle: params.gigTitle as string,
      });
    case "REVIEW_REQUESTED":
      return emailService.sendReviewRequestEmail(to, {
        recipientName,
        counterpartName: params.counterpartName as string,
        gigTitle: params.gigTitle as string,
      });
    case "REVIEW_RECEIVED":
      return emailService.sendNewReviewReceivedEmail(to, {
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
    case "REPORT_DISMISSED":
      return emailService.sendReportResolvedEmail(to, {
        recipientName,
        reason: params.reason as string,
      });
    case "ACCOUNT_WARNING":
      return emailService.sendAccountWarningEmail(to, {
        recipientName,
        reason: params.reason as string,
      });
    case "REVIEW_REPORTED":
      // In-app only (admin queue) — no email defined for this type.
      return;
  }
}

// Persists the notification first, then attempts email delivery. A failed
// send only flips emailStatus to FAILED — the notification row itself is
// never rolled back or deleted.
export async function createNotification(input: CreateNotificationInput) {
  const [notification, user] = await Promise.all([
    prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        linkType: input.linkType,
        linkId: input.linkId,
      },
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    }),
  ]);

  if (!user) {
    return notification;
  }

  try {
    await sendNotificationEmail(input.type, user.email, user.name, input.emailParams ?? {});
    await prisma.notification.update({ where: { id: notification.id }, data: { emailStatus: "SENT" } });
  } catch (err) {
    console.error(`Failed to send email for notification ${notification.id}:`, err);
    await prisma.notification
      .update({ where: { id: notification.id }, data: { emailStatus: "FAILED" } })
      .catch(() => {});
  }

  return notification;
}
