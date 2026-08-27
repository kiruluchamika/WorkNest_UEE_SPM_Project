import { sendMail } from "../utils/mailer";

function renderEmailTemplate(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #111827;">${title}</h2>
      <div style="font-size: 15px; line-height: 1.5;">${bodyHtml}</div>
      <p style="margin-top: 32px; font-size: 12px; color: #6b7280;">WorkNest &mdash; local gigs, trusted work.</p>
    </div>
  `;
}

export async function sendGigCompletionEmail(
  to: string,
  params: { recipientName: string; gigTitle: string }
): Promise<void> {
  await sendMail({
    to,
    subject: `Gig completed: ${params.gigTitle}`,
    html: renderEmailTemplate(
      "Gig marked as completed",
      `<p>Hi ${params.recipientName},</p><p>The gig "<strong>${params.gigTitle}</strong>" has been marked as completed.</p>`
    ),
  });
}

export async function sendReviewRequestEmail(
  to: string,
  params: { recipientName: string; counterpartName: string; gigTitle: string }
): Promise<void> {
  await sendMail({
    to,
    subject: `Leave a review for "${params.gigTitle}"`,
    html: renderEmailTemplate(
      "How did it go?",
      `<p>Hi ${params.recipientName},</p><p>Now that "<strong>${params.gigTitle}</strong>" is complete, please take a moment to review ${params.counterpartName}.</p>`
    ),
  });
}

export async function sendNewReviewReceivedEmail(
  to: string,
  params: { recipientName: string; raterName: string; rating: number; gigTitle: string }
): Promise<void> {
  await sendMail({
    to,
    subject: "You received a new review",
    html: renderEmailTemplate(
      "New review received",
      `<p>Hi ${params.recipientName},</p><p>${params.raterName} left you a ${params.rating}-star review for "<strong>${params.gigTitle}</strong>".</p>`
    ),
  });
}

export async function sendReviewRemovedEmail(
  to: string,
  params: { recipientName: string; gigTitle: string; reason: string }
): Promise<void> {
  await sendMail({
    to,
    subject: "Your review was removed",
    html: renderEmailTemplate(
      "Review removed",
      `<p>Hi ${params.recipientName},</p><p>Your review for "<strong>${params.gigTitle}</strong>" was removed by a moderator.</p><p>Reason: ${params.reason}</p>`
    ),
  });
}

export async function sendReportResolvedEmail(
  to: string,
  params: { recipientName: string; reason: string }
): Promise<void> {
  await sendMail({
    to,
    subject: "Your report has been reviewed",
    html: renderEmailTemplate(
      "Report resolved",
      `<p>Hi ${params.recipientName},</p><p>Your report has been reviewed. The review remains published.</p><p>Reason: ${params.reason}</p>`
    ),
  });
}

export async function sendAccountWarningEmail(
  to: string,
  params: { recipientName: string; reason: string }
): Promise<void> {
  await sendMail({
    to,
    subject: "Account warning from WorkNest",
    html: renderEmailTemplate(
      "Account warning",
      `<p>Hi ${params.recipientName},</p><p>An admin has issued a warning on your account.</p><p>Reason: ${params.reason}</p>`
    ),
  });
}
