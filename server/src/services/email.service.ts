import { sendMail } from "../utils/mailer";
import {
  gigCompletedAndReviewRequestedTemplate,
  reviewReceivedTemplate,
  reviewRemovedTemplate,
  reportResolvedTemplate,
  reportDismissedTemplate,
  accountWarningTemplate,
} from "./email.templates";

export async function sendGigCompletedAndReviewRequestedEmail(
  to: string,
  params: { recipientName: string; counterpartName: string; gigTitle: string }
): Promise<void> {
  const { subject, html, text } = gigCompletedAndReviewRequestedTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendReviewReceivedEmail(
  to: string,
  params: { recipientName: string; raterName: string; rating: number; gigTitle: string }
): Promise<void> {
  const { subject, html, text } = reviewReceivedTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendReviewRemovedEmail(
  to: string,
  params: { recipientName: string; gigTitle: string; reason: string }
): Promise<void> {
  const { subject, html, text } = reviewRemovedTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendReportResolvedEmail(
  to: string,
  params: { recipientName: string; reason: string }
): Promise<void> {
  const { subject, html, text } = reportResolvedTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendReportDismissedEmail(
  to: string,
  params: { recipientName: string; reason: string }
): Promise<void> {
  const { subject, html, text } = reportDismissedTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendAccountWarningEmail(
  to: string,
  params: { recipientName: string; reason: string }
): Promise<void> {
  const { subject, html, text } = accountWarningTemplate(params);
  await sendMail({ to, subject, html, text });
}
