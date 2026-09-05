import { WORKNEST_LOGO_CID } from "../utils/mailer";

export interface EmailTemplateContent {
  subject: string;
  html: string;
  text: string;
}

// Mirrors app/src/theme/colors.ts so transactional emails match the WorkNest brand.
const brand = {
  primary: "#0090A6",
  primaryDark: "#045F70",
  primarySoft: "#DCF2F4",
  accent: "#C7C804",
  accentDark: "#8C8D03",
  accentSoft: "#F4F7D6",
  background: "#F2FAFA",
  surface: "#FFFFFF",
  text: "#1F2A2E",
  textMuted: "#667479",
  success: "#16875E",
  successLight: "#DCF2E8",
  warning: "#D98918",
  warningLight: "#FCEFD9",
  danger: "#D54B35",
  dangerLight: "#FDECE8",
  info: "#3B6FA5",
  infoLight: "#E3EBF5",
  border: "#DCE8E8",
};

type EmailKind = "success" | "review" | "danger" | "warning" | "info";

const kindStyles: Record<EmailKind, { badgeBg: string; badgeColor: string; glyph: string; eyebrowColor: string }> = {
  success: { badgeBg: brand.successLight, badgeColor: brand.success, glyph: "&#10003;", eyebrowColor: brand.success },
  review: { badgeBg: brand.accentSoft, badgeColor: brand.accentDark, glyph: "&#9733;", eyebrowColor: brand.accentDark },
  danger: { badgeBg: brand.dangerLight, badgeColor: brand.danger, glyph: "&#33;", eyebrowColor: brand.danger },
  warning: { badgeBg: brand.warningLight, badgeColor: brand.warning, glyph: "&#9888;", eyebrowColor: brand.warning },
  info: { badgeBg: brand.infoLight, badgeColor: brand.info, glyph: "&#8505;", eyebrowColor: brand.info },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A label/value row rendered inside a `detailBox`. Values are pre-escaped by the caller when needed. */
function detailRow(label: string, value: string, isLast = false): string {
  const border = isLast ? "" : `border-bottom:1px solid ${brand.border};`;
  return `
    <tr>
      <td style="padding:10px 0;${border}font-size:13px;color:${brand.textMuted};vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;${border}font-size:13px;color:${brand.text};font-weight:600;text-align:right;vertical-align:top;">${value}</td>
    </tr>`;
}

function detailBox(rows: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.background};border:1px solid ${brand.border};border-radius:12px;padding:4px 16px;margin:20px 0;">
      ${rows}
    </table>`;
}

function starRatingHtml(rating: number, max = 5): string {
  const filled = Math.max(0, Math.min(max, Math.round(rating)));
  let stars = "";
  for (let i = 0; i < max; i++) {
    stars += `<span style="color:${i < filled ? brand.accentDark : brand.border};font-size:16px;">&#9733;</span>`;
  }
  return `${stars} <span style="color:${brand.textMuted};font-size:13px;">${filled}/${max}</span>`;
}

// Mirrors app/src/utils/formatters.ts / constants.ts so amounts, pay-rate
// labels, and dates read identically in the app and in email.
function formatCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-LK")}`;
}

function paymentTypeLabel(paymentType: string): string {
  switch (paymentType) {
    case "HOURLY":
      return "Hourly";
    case "DAILY":
      return "Daily";
    case "FIXED":
      return "Fixed";
    default:
      return paymentType;
  }
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  });
}

function pill(label: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${bg};color:${color};font-size:12px;font-weight:600;">${escapeHtml(label)}</span>`;
}

function renderLayout(params: {
  kind: EmailKind;
  eyebrow: string;
  heading: string;
  preheader: string;
  bodyHtml: string;
}): string {
  const { kind, eyebrow, heading, preheader, bodyHtml } = params;
  const style = kindStyles[kind];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WorkNest</title>
  </head>
  <body style="margin:0;padding:0;background:${brand.background};">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">
      ${escapeHtml(preheader)}
      &#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.background};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <img src="cid:${WORKNEST_LOGO_CID}" width="150" alt="WorkNest" style="display:block;border:0;outline:0;max-width:150px;" />
              </td>
            </tr>
            <tr>
              <td style="background:${brand.surface};border:1px solid ${brand.border};border-radius:16px;overflow:hidden;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="height:6px;line-height:6px;font-size:0;background-color:${brand.primary};background-image:linear-gradient(90deg, ${brand.primary}, ${brand.accent});">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:32px 36px 28px 36px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="48" style="width:48px;height:48px;border-radius:50%;background:${style.badgeBg};text-align:center;vertical-align:middle;font-size:20px;line-height:48px;color:${style.badgeColor};">
                            ${style.glyph}
                          </td>
                        </tr>
                      </table>
                      <p style="margin:18px 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:${style.eyebrowColor};text-transform:uppercase;">
                        ${escapeHtml(eyebrow)}
                      </p>
                      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${brand.text};font-family:Arial, Helvetica, sans-serif;">
                        ${escapeHtml(heading)}
                      </h1>
                      <div style="font-size:15px;line-height:1.65;color:${brand.text};font-family:Arial, Helvetica, sans-serif;">
                        ${bodyHtml}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:28px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${brand.primaryDark};font-family:Arial, Helvetica, sans-serif;">
                  WorkNest &mdash; local gigs, trusted work.
                </p>
                <p style="margin:0;font-size:12px;color:${brand.textMuted};font-family:Arial, Helvetica, sans-serif;">
                  This is an automated message, please don&rsquo;t reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function gigCompletedAndReviewRequestedTemplate(params: {
  recipientName: string;
  counterpartName: string;
  gigTitle: string;
  paymentAmount?: number;
  paymentType?: string;
}): EmailTemplateContent {
  const { recipientName, counterpartName, gigTitle, paymentAmount, paymentType } = params;
  const name = escapeHtml(recipientName);
  const counterpart = escapeHtml(counterpartName);
  const title = escapeHtml(gigTitle);
  const hasPayment = paymentAmount !== undefined && paymentType !== undefined;
  const pay = hasPayment ? `${formatCurrency(paymentAmount)} / ${paymentTypeLabel(paymentType)}` : "";

  return {
    subject: `Gig completed — leave a review for "${gigTitle}"`,
    html: renderLayout({
      kind: "success",
      eyebrow: "Gig completed",
      heading: "Great work — this gig is complete!",
      preheader: `"${gigTitle}" is complete. Now's a good time to leave a review for ${counterpartName}.`,
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;">"<strong>${title}</strong>" has been marked as completed. Here&rsquo;s a quick summary:</p>
        ${detailBox(
          detailRow("Gig", title) +
            detailRow("Completed with", counterpart) +
            (hasPayment ? detailRow("Agreed payment", pay) : "") +
            detailRow("Status", pill("Completed", brand.success, brand.successLight), true)
        )}
        <p style="margin:0 0 8px;">Now&rsquo;s a great time to leave a review for <strong>${counterpart}</strong>. Honest feedback helps keep the WorkNest community trustworthy and helps others make informed decisions.</p>
        <p style="margin:0;font-size:13px;color:${brand.textMuted};">Tip: mentioning communication, quality, and reliability makes your review most useful to others.</p>
      `,
    }),
    text: `Hi ${recipientName},\n\n"${gigTitle}" has been marked as completed.${hasPayment ? `\nAgreed payment: ${pay}` : ""}\n\nNow's a good time to leave a review for ${counterpartName}.\n\n— WorkNest`,
  };
}

export function reviewReceivedTemplate(params: {
  recipientName: string;
  raterName: string;
  rating: number;
  gigTitle: string;
}): EmailTemplateContent {
  const { recipientName, raterName, rating, gigTitle } = params;
  const name = escapeHtml(recipientName);
  const rater = escapeHtml(raterName);
  const title = escapeHtml(gigTitle);

  return {
    subject: "You received a new review",
    html: renderLayout({
      kind: "review",
      eyebrow: "New review",
      heading: "You've received a new review!",
      preheader: `${raterName} rated you ${rating}/5 for "${gigTitle}".`,
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;">${rater} left you feedback for "<strong>${title}</strong>":</p>
        ${detailBox(
          detailRow("Rating", starRatingHtml(rating)) +
            detailRow("From", rater) +
            detailRow("Gig", title, true)
        )}
        <p style="margin:0;">Great reviews build your reputation on WorkNest and help you win more gigs. Keep up the great work!</p>
      `,
    }),
    text: `Hi ${recipientName},\n\n${raterName} left you a ${rating}-star review for "${gigTitle}".\n\n— WorkNest`,
  };
}

export function reviewRemovedTemplate(params: {
  recipientName: string;
  gigTitle: string;
  reason: string;
}): EmailTemplateContent {
  const { recipientName, gigTitle, reason } = params;
  const name = escapeHtml(recipientName);
  const title = escapeHtml(gigTitle);
  const reasonText = escapeHtml(reason);

  return {
    subject: "Your review was removed",
    html: renderLayout({
      kind: "danger",
      eyebrow: "Review removed",
      heading: "Your review was removed",
      preheader: `Your review for "${gigTitle}" was removed by an administrator.`,
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;">An administrator removed your review for "<strong>${title}</strong>".</p>
        ${detailBox(detailRow("Gig", title) + detailRow("Reason", reasonText, true))}
        <p style="margin:0;font-size:13px;color:${brand.textMuted};">If you believe this was a mistake, please contact WorkNest support for clarification.</p>
      `,
    }),
    text: `Hi ${recipientName},\n\nYour review for "${gigTitle}" was removed by an administrator.\n\nReason: ${reason}\n\n— WorkNest`,
  };
}

export function reportResolvedTemplate(params: {
  recipientName: string;
  reason: string;
}): EmailTemplateContent {
  const { recipientName, reason } = params;
  const name = escapeHtml(recipientName);
  const reasonText = escapeHtml(reason);

  return {
    subject: "Your report has been resolved",
    html: renderLayout({
      kind: "success",
      eyebrow: "Report resolved",
      heading: "Your report has been resolved",
      preheader: "An administrator reviewed your report and took action.",
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;">An administrator reviewed the review you reported and took action on it.</p>
        ${detailBox(
          detailRow("Outcome", pill("Action taken", brand.success, brand.successLight)) +
            detailRow("Reason", reasonText, true)
        )}
        <p style="margin:0;">Thank you for helping keep WorkNest a safe and trustworthy community.</p>
      `,
    }),
    text: `Hi ${recipientName},\n\nAn administrator reviewed your reported review and took action.\n\nReason: ${reason}\n\n— WorkNest`,
  };
}

export function reportDismissedTemplate(params: {
  recipientName: string;
  reason: string;
}): EmailTemplateContent {
  const { recipientName, reason } = params;
  const name = escapeHtml(recipientName);
  const reasonText = escapeHtml(reason);

  return {
    subject: "Your report has been dismissed",
    html: renderLayout({
      kind: "info",
      eyebrow: "Report dismissed",
      heading: "Your report has been dismissed",
      preheader: "An administrator reviewed your report and dismissed it. The review remains published.",
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;">An administrator reviewed the review you reported and decided not to take action. The review remains published.</p>
        ${detailBox(
          detailRow("Outcome", pill("No action taken", brand.info, brand.infoLight)) +
            detailRow("Reason", reasonText, true)
        )}
        <p style="margin:0;font-size:13px;color:${brand.textMuted};">If you have further concerns, you're welcome to reach out to WorkNest support.</p>
      `,
    }),
    text: `Hi ${recipientName},\n\nAn administrator reviewed your reported review and dismissed the report. The review remains published.\n\nReason: ${reason}\n\n— WorkNest`,
  };
}

export function accountWarningTemplate(params: {
  recipientName: string;
  reason: string;
}): EmailTemplateContent {
  const { recipientName, reason } = params;
  const name = escapeHtml(recipientName);
  const reasonText = escapeHtml(reason);

  return {
    subject: "Account warning from WorkNest",
    html: renderLayout({
      kind: "warning",
      eyebrow: "Account warning",
      heading: "You've received an account warning",
      preheader: "An administrator issued a warning on your WorkNest account.",
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;">An administrator has issued a warning on your account.</p>
        ${detailBox(detailRow("Reason", reasonText, true))}
        <p style="margin:0;font-size:13px;color:${brand.textMuted};">Please review WorkNest's community guidelines to avoid further action on your account.</p>
      `,
    }),
    text: `Hi ${recipientName},\n\nAn administrator has issued a warning on your account.\n\nReason: ${reason}\n\n— WorkNest`,
  };
}

export function gigPostedTemplate(params: {
  recipientName: string;
  gigTitle: string;
  category: string;
  paymentAmount: number;
  paymentType: string;
  location: string;
}): EmailTemplateContent {
  const { recipientName, gigTitle, category, paymentAmount, paymentType, location } = params;
  const name = escapeHtml(recipientName);
  const title = escapeHtml(gigTitle);
  const categoryText = escapeHtml(category);
  const locationText = escapeHtml(location);
  const pay = `${formatCurrency(paymentAmount)} / ${paymentTypeLabel(paymentType)}`;

  return {
    subject: `Gig submitted — "${gigTitle}" is pending review`,
    html: renderLayout({
      kind: "success",
      eyebrow: "Gig submitted",
      heading: "Your gig is submitted!",
      preheader: `"${gigTitle}" was submitted successfully and is now pending review.`,
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;">"<strong>${title}</strong>" has been submitted successfully. Here&rsquo;s a summary of what you posted:</p>
        ${detailBox(
          detailRow("Gig", title) +
            detailRow("Category", categoryText) +
            detailRow("Pay rate", pay) +
            detailRow("Location", locationText) +
            detailRow("Status", pill("Pending review", brand.warning, brand.warningLight), true)
        )}
        <p style="margin:0;">Our team reviews new posts before they go live. You&rsquo;ll be notified as soon as it&rsquo;s approved and visible to job seekers &mdash; you can track its status anytime from <strong>My Gigs</strong> in the app.</p>
      `,
    }),
    text: `Hi ${recipientName},\n\n"${gigTitle}" has been submitted successfully and is pending review.\n\nCategory: ${category}\nPay rate: ${pay}\nLocation: ${location}\n\nYou'll be notified once it's approved. Track it anytime from My Gigs in the app.\n\n— WorkNest`,
  };
}

export function applicationSubmittedTemplate(params: {
  recipientName: string;
  gigTitle: string;
  businessName: string;
  appliedDate: string;
  details?: string;
}): EmailTemplateContent {
  const { recipientName, gigTitle, businessName, appliedDate, details } = params;
  const name = escapeHtml(recipientName);
  const title = escapeHtml(gigTitle);
  const business = escapeHtml(businessName);
  const appliedOn = formatDate(appliedDate);

  return {
    subject: `Application received — "${gigTitle}"`,
    html: renderLayout({
      kind: "info",
      eyebrow: "Application submitted",
      heading: "Your application is in!",
      preheader: `Your application for "${gigTitle}" at ${businessName} has been submitted.`,
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;">This confirms we&rsquo;ve received your application. Here&rsquo;s a copy for your records:</p>
        ${detailBox(
          detailRow("Gig", title) +
            detailRow("Business", business) +
            detailRow("Applied on", appliedOn) +
            (details ? detailRow("Your note", escapeHtml(details)) : "") +
            detailRow("Status", pill("Pending review", brand.warning, brand.warningLight), true)
        )}
        <p style="margin:0;">${business} will review your application and get back to you. You can check its status anytime from <strong>My Applications</strong> in the app.</p>
      `,
    }),
    text: `Hi ${recipientName},\n\nYour application for "${gigTitle}" at ${businessName} has been submitted.\n\nApplied on: ${appliedOn}${details ? `\nYour note: ${details}` : ""}\nStatus: Pending review\n\n— WorkNest`,
  };
}

export function hiredConfirmationTemplate(params: {
  recipientName: string;
  gigTitle: string;
  businessName: string;
  businessContact?: string;
  location: string;
  startDate: string;
  startTime?: string;
  paymentAmount: number;
  paymentType: string;
}): EmailTemplateContent {
  const {
    recipientName,
    gigTitle,
    businessName,
    businessContact,
    location,
    startDate,
    startTime,
    paymentAmount,
    paymentType,
  } = params;
  const name = escapeHtml(recipientName);
  const title = escapeHtml(gigTitle);
  const business = escapeHtml(businessName);
  const locationText = escapeHtml(location);
  const schedule = `${formatDate(startDate)}${startTime ? ` at ${escapeHtml(startTime)}` : ""}`;
  const pay = `${formatCurrency(paymentAmount)} / ${paymentTypeLabel(paymentType)}`;

  return {
    subject: `You're hired — "${gigTitle}"`,
    html: renderLayout({
      kind: "success",
      eyebrow: "You're hired",
      heading: "Congratulations — you got the gig!",
      preheader: `${businessName} hired you for "${gigTitle}". Here's what to know before you start.`,
      bodyHtml: `
        <p style="margin:0 0 8px;">Hi ${name},</p>
        <p style="margin:0;"><strong>${business}</strong> has hired you for "<strong>${title}</strong>". Here&rsquo;s what you need to know:</p>
        ${detailBox(
          detailRow("Gig", title) +
            detailRow("Business", business) +
            detailRow("Location", locationText) +
            detailRow("Start", schedule) +
            detailRow("Agreed payment", pay, !businessContact) +
            (businessContact ? detailRow("Contact", escapeHtml(businessContact), true) : "")
        )}
        <p style="margin:0;">Reach out to ${business} if you have questions before your start date. Good luck!</p>
      `,
    }),
    text: `Hi ${recipientName},\n\n${businessName} has hired you for "${gigTitle}".\n\nLocation: ${location}\nStart: ${schedule}\nAgreed payment: ${pay}${businessContact ? `\nContact: ${businessContact}` : ""}\n\nReach out to ${businessName} if you have questions before your start date. Good luck!\n\n— WorkNest`,
  };
}
