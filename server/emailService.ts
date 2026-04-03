import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "noreply@uninexus.app";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    return null;
  }

  return { host, port, secure, auth: { user, pass }, from };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const config = getEmailConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return transporter;
}

export async function sendOtpEmail(email: string, otp: string, displayName?: string): Promise<boolean> {
  const config = getEmailConfig();
  const t = getTransporter();

  if (!t || !config) {
    console.warn(
      `[EMAIL] SMTP not configured. OTP for ${email}: ${otp}\n` +
      `Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables to enable email sending.`
    );
    return false;
  }

  const greeting = displayName ? `Hi ${displayName},` : "Hello,";

  await t.sendMail({
    from: config.from,
    to: email,
    subject: "Your UniNexus verification code",
    text: [
      greeting,
      "",
      "Your verification code is:",
      "",
      `    ${otp}`,
      "",
      "This code expires in 10 minutes.",
      "",
      "If you did not request this code, you can safely ignore this email.",
      "",
      "— The UniNexus Team",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#fafafa;border-radius:12px;border:1px solid #e5e7eb;">
        <img src="https://uninexus.app/assets/logo.png" alt="UniNexus" style="height:48px;margin-bottom:24px;" />
        <h2 style="margin:0 0 8px;color:#1f2937;">Verify your email</h2>
        <p style="color:#6b7280;margin:0 0 24px;">${greeting.replace(/<|>/g, "")}</p>
        <p style="color:#374151;margin:0 0 16px;">Your verification code is:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#7c3aed;background:#f3f0ff;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;">${otp}</div>
        <p style="color:#6b7280;font-size:14px;margin:0 0 8px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#9ca3af;font-size:13px;margin:0;">If you did not request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#d1d5db;font-size:12px;margin:0;">UniNexus — institutional community platform</p>
      </div>
    `,
  });

  return true;
}
