export interface EmailTemplateContent {
  subject: string;
  html: string;
  text: string;
}

function wrapHtml(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #111827;">${title}</h2>
      <div style="font-size: 15px; line-height: 1.5;">${bodyHtml}</div>
      <p style="margin-top: 32px; font-size: 12px; color: #6b7280;">WorkNest &mdash; local gigs, trusted work.</p>
    </div>
  `;
}

export function gigCompletedAndReviewRequestedTemplate(params: {
  recipientName: string;
  counterpartName: string;
  gigTitle: string;
}): EmailTemplateContent {
  const { recipientName, counterpartName, gigTitle } = params;
  return {
    subject: `Gig completed — leave a review for "${gigTitle}"`,
    html: wrapHtml(
      "Gig completed",
      `<p>Hi ${recipientName},</p>
       <p>"<strong>${gigTitle}</strong>" has been marked as completed.</p>
       <p>Now's a good time to leave a review for ${counterpartName}.</p>`
    ),
    text: `Hi ${recipientName},\n\n"${gigTitle}" has been marked as completed.\n\nNow's a good time to leave a review for ${counterpartName}.\n\n— WorkNest`,
  };
}

export function reviewReceivedTemplate(params: {
  recipientName: string;
  raterName: string;
  rating: number;
  gigTitle: string;
}): EmailTemplateContent {
  const { recipientName, raterName, rating, gigTitle } = params;
  return {
    subject: "You received a new review",
    html: wrapHtml(
      "New review received",
      `<p>Hi ${recipientName},</p>
       <p>${raterName} left you a ${rating}-star review for "<strong>${gigTitle}</strong>".</p>`
    ),
    text: `Hi ${recipientName},\n\n${raterName} left you a ${rating}-star review for "${gigTitle}".\n\n— WorkNest`,
  };
}

export function reviewRemovedTemplate(params: {
  recipientName: string;
  gigTitle: string;
  reason: string;
}): EmailTemplateContent {
  const { recipientName, gigTitle, reason } = params;
  return {
    subject: "Your review was removed",
    html: wrapHtml(
      "Review removed",
      `<p>Hi ${recipientName},</p>
       <p>Your review for "<strong>${gigTitle}</strong>" was removed by an administrator.</p>
       <p>Reason: ${reason}</p>`
    ),
    text: `Hi ${recipientName},\n\nYour review for "${gigTitle}" was removed by an administrator.\n\nReason: ${reason}\n\n— WorkNest`,
  };
}

export function reportResolvedTemplate(params: {
  recipientName: string;
  reason: string;
}): EmailTemplateContent {
  const { recipientName, reason } = params;
  return {
    subject: "Your report has been resolved",
    html: wrapHtml(
      "Report resolved",
      `<p>Hi ${recipientName},</p>
       <p>An administrator reviewed your reported review and took action.</p>
       <p>Reason: ${reason}</p>`
    ),
    text: `Hi ${recipientName},\n\nAn administrator reviewed your reported review and took action.\n\nReason: ${reason}\n\n— WorkNest`,
  };
}

export function reportDismissedTemplate(params: {
  recipientName: string;
  reason: string;
}): EmailTemplateContent {
  const { recipientName, reason } = params;
  return {
    subject: "Your report has been dismissed",
    html: wrapHtml(
      "Report dismissed",
      `<p>Hi ${recipientName},</p>
       <p>An administrator reviewed your reported review and dismissed the report. The review remains published.</p>
       <p>Reason: ${reason}</p>`
    ),
    text: `Hi ${recipientName},\n\nAn administrator reviewed your reported review and dismissed the report. The review remains published.\n\nReason: ${reason}\n\n— WorkNest`,
  };
}

export function accountWarningTemplate(params: {
  recipientName: string;
  reason: string;
}): EmailTemplateContent {
  const { recipientName, reason } = params;
  return {
    subject: "Account warning from WorkNest",
    html: wrapHtml(
      "Account warning",
      `<p>Hi ${recipientName},</p>
       <p>An administrator has issued a warning on your account.</p>
       <p>Reason: ${reason}</p>`
    ),
    text: `Hi ${recipientName},\n\nAn administrator has issued a warning on your account.\n\nReason: ${reason}\n\n— WorkNest`,
  };
}
