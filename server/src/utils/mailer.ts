import path from "node:path";
import { transporter } from "../config/mailer";
import { env } from "../config/env";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Referenced from email templates via <img src="cid:worknest-logo">.
export const WORKNEST_LOGO_CID = "worknest-logo";
const WORKNEST_LOGO_PATH = path.join(__dirname, "..", "assets", "email", "worknest-logo.png");

export async function sendMail({ to, subject, html, text }: SendMailInput) {
  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
    text,
    attachments: [
      {
        filename: "worknest-logo.png",
        path: WORKNEST_LOGO_PATH,
        cid: WORKNEST_LOGO_CID,
      },
    ],
  });
}
