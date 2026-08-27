import { transporter } from "../config/mailer";
import { env } from "../config/env";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailInput) {
  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  });
}
