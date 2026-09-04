import {
  sendGigCompletedAndReviewRequestedEmail,
  sendReviewReceivedEmail,
  sendReviewRemovedEmail,
  sendReportResolvedEmail,
  sendReportDismissedEmail,
  sendAccountWarningEmail,
  sendGigPostedEmail,
  sendApplicationSubmittedEmail,
  sendHiredConfirmationEmail,
} from "../services/email.service";

// Fixed on purpose: this script exists to preview the branded templates in a real
// inbox, not to send arbitrary email to arbitrary addresses.
const TEST_RECIPIENT = "kiruluchamika2002@gmail.com";

const senders: Record<string, () => Promise<void>> = {
  gigCompleted: () =>
    sendGigCompletedAndReviewRequestedEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      counterpartName: "Saman",
      gigTitle: "IT internship",
    }),
  reviewReceived: () =>
    sendReviewReceivedEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      raterName: "Saman",
      rating: 5,
      gigTitle: "IT internship",
    }),
  reviewRemoved: () =>
    sendReviewRemovedEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      gigTitle: "IT internship",
      reason: "Contained inappropriate language.",
    }),
  reportResolved: () =>
    sendReportResolvedEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      reason: "The reported review violated our community guidelines.",
    }),
  reportDismissed: () =>
    sendReportDismissedEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      reason: "The review did not violate our community guidelines.",
    }),
  accountWarning: () =>
    sendAccountWarningEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      reason: "Repeated late cancellations of accepted gigs.",
    }),
  gigPosted: () =>
    sendGigPostedEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      gigTitle: "Weekend Cafe Barista",
      category: "Hospitality",
      paymentAmount: 1500,
      paymentType: "HOURLY",
      location: "Colombo 05",
    }),
  applicationSubmitted: () =>
    sendApplicationSubmittedEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      gigTitle: "Weekend Cafe Barista",
      businessName: "Cafe Nest",
      appliedDate: new Date().toISOString(),
      details: "Available weekends, 1 year of barista experience.",
    }),
  applicationHired: () =>
    sendHiredConfirmationEmail(TEST_RECIPIENT, {
      recipientName: "Kirulu",
      gigTitle: "Weekend Cafe Barista",
      businessName: "Cafe Nest",
      businessContact: "+94 77 123 4567",
      location: "Colombo 05",
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      startTime: "8:00 AM",
      paymentAmount: 1500,
      paymentType: "HOURLY",
    }),
};

async function main() {
  const kind = process.argv[2] ?? "gigCompleted";
  const send = senders[kind];

  if (!send) {
    console.error(`Unknown kind "${kind}". Available: ${Object.keys(senders).join(", ")}`);
    process.exit(1);
  }

  await send();
  console.log(`Sample "${kind}" email sent to ${TEST_RECIPIENT}`);
}

main().catch((err) => {
  console.error("Failed to send sample email:", err);
  process.exit(1);
});
