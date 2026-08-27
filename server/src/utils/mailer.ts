import { transporter } from "../config/mailer";
import { env } from "../config/env";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail({ to, subject, html, text }: SendMailInput) {
  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
}
