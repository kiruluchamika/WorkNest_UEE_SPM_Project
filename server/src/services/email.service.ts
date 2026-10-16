import { sendMail } from "../utils/mailer";
import {
  gigCompletedAndReviewRequestedTemplate,
  reviewReceivedTemplate,
  reviewRemovedTemplate,
  reportResolvedTemplate,
  reportDismissedTemplate,
  accountWarningTemplate,
  accountDisabledTemplate,
  accountEnabledTemplate,
  gigPostedTemplate,
  applicationSubmittedTemplate,
  hiredConfirmationTemplate,
  welcomeTemplate,
} from "./email.templates";

export async function sendWelcomeEmail(
  to: string,
  params: { recipientName: string; role: string }
): Promise<void> {
  const { subject, html, text } = welcomeTemplate({ ...params, email: to });
  await sendMail({ to, subject, html, text });
}

export async function sendGigCompletedAndReviewRequestedEmail(
  to: string,
  params: {
    recipientName: string;
    counterpartName: string;
    gigTitle: string;
    paymentAmount?: number;
    paymentType?: string;
  }
): Promise<void> {
  const { subject, html, text } = gigCompletedAndReviewRequestedTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendGigPostedEmail(
  to: string,
  params: {
    recipientName: string;
    gigTitle: string;
    category: string;
    paymentAmount: number;
    paymentType: string;
    location: string;
  }
): Promise<void> {
  const { subject, html, text } = gigPostedTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendApplicationSubmittedEmail(
  to: string,
  params: {
    recipientName: string;
    gigTitle: string;
    businessName: string;
    appliedDate: string;
    details?: string;
  }
): Promise<void> {
  const { subject, html, text } = applicationSubmittedTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendHiredConfirmationEmail(
  to: string,
  params: {
    recipientName: string;
    gigTitle: string;
    businessName: string;
    businessContact?: string;
    location: string;
    startDate: string;
    startTime?: string;
    paymentAmount: number;
    paymentType: string;
  }
): Promise<void> {
  const { subject, html, text } = hiredConfirmationTemplate(params);
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

export async function sendAccountDisabledEmail(
  to: string,
  params: { recipientName: string; reason: string }
): Promise<void> {
  const { subject, html, text } = accountDisabledTemplate(params);
  await sendMail({ to, subject, html, text });
}

export async function sendAccountEnabledEmail(
  to: string,
  params: { recipientName: string; reason?: string }
): Promise<void> {
  const { subject, html, text } = accountEnabledTemplate(params);
  await sendMail({ to, subject, html, text });
}
