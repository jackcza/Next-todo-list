import nodemailer from "nodemailer";
import { CODE_MINUTES } from "@/lib/auth";
import type { CodePurpose } from "@/lib/constants";
import type { Locale } from "@/lib/i18n";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

const COPY: Record<Locale, Record<CodePurpose, { subject: string; intro: string }> & { footer: string }> = {
  en: {
    register: { subject: "Your Todo List verification code", intro: "Your Todo List verification code is:" },
    reset: { subject: "Reset your Todo List password", intro: "Use this code to reset your Todo List password:" },
    footer: `It expires in ${CODE_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
  },
  zh: {
    register: { subject: "Todo List 验证码", intro: "你的 Todo List 验证码是：" },
    reset: { subject: "重置 Todo List 密码", intro: "使用以下验证码重置你的 Todo List 密码：" },
    footer: `验证码 ${CODE_MINUTES} 分钟内有效。如果不是你本人操作，请忽略这封邮件。`,
  },
};

export async function sendVerificationCode(email: string, code: string, purpose: CodePurpose, locale: Locale) {
  if (!transporter) {
    console.log(`[${purpose} code] ${email}: ${code}`);
    return;
  }

  const { subject, intro } = COPY[locale][purpose];
  const { footer } = COPY[locale];
  await transporter.sendMail({
    from: `Todo List <${MAIL_FROM}>`,
    to: email,
    subject: `${subject}: ${code}`,
    text: `${intro} ${code}\n\n${footer}`,
    html: `<div style="font-family:sans-serif;font-size:15px;color:#1e293b">
  <p>${intro}</p>
  <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#6366f1">${code}</p>
  <p style="color:#64748b">${footer}</p>
</div>`,
  });
}
