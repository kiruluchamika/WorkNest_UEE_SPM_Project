import { sendMail } from "../utils/mailer";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npm run test:email -- <recipient-email>");
    process.exit(1);
  }

  const info = await sendMail({
    to,
    subject: "WorkNest SMTP test",
    html: "<p>This is a test email from WorkNest to confirm SMTP is working.</p>",
  });

  console.log("Email sent:", info.messageId);
}

main().catch((err) => {
  console.error("Failed to send test email:", err);
  process.exit(1);
});
