/**
 * Resend client + OTP email dispatch helpers.
 */

import { Resend } from "resend";

interface ResendErrorShape {
  name?: string;
  message?: string;
  statusCode?: number;
}

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  return new Resend(apiKey);
}

export function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() ?? "Delta Portal <onboarding@resend.dev>"
  );
}

export function logResendFailure(error: ResendErrorShape, recipient: string) {
  console.error("🚨 RESEND API ERROR:", JSON.stringify(error, null, 2));
  console.error("🚨 RESEND context:", {
    recipient,
    from: getEmailFrom(),
    hasApiKey: Boolean(process.env.RESEND_API_KEY),
  });

  const statusCode = error.statusCode;
  const message = (error.message ?? "").toLowerCase();

  if (
    statusCode === 403 ||
    message.includes("not authorized") ||
    message.includes("unverified") ||
    message.includes("sandbox")
  ) {
    console.warn(
      "⚠️ RESEND BLOCKED: You must use your Resend registration email while in sandbox mode!"
    );
  }
}

export function buildOtpEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
        <tr><td style="background:#0087DC;height:4px;"></td></tr>
        <tr><td style="padding:40px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#0087DC;">Delta Electronics</p>
          <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;">PR Portal Verification</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">Enter this one-time code on the sign-in page. It expires in 10 minutes.</p>
          <div style="display:inline-block;background:#f1f5f9;border:2px dashed #0087DC;border-radius:12px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#0087DC;">${code}</div>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">If you did not request this code, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildOtpEmailText(code: string): string {
  return `Your Delta PR Portal Verification Code is: ${code}\n\nThis code expires in 10 minutes. If you did not request it, ignore this email.`;
}

export async function sendOtpEmail(to: string, code: string) {
  const { data, error } = await getResendClient().emails.send({
    from: getEmailFrom(),
    to,
    subject: "Your Delta PR Portal Verification Code",
    html: buildOtpEmailHtml(code),
    text: buildOtpEmailText(code),
  });

  if (error) {
    logResendFailure(error as ResendErrorShape, to);
    throw new Error(
      `Resend dispatch failed (${(error as ResendErrorShape).statusCode ?? "unknown"}): ${error.message}`
    );
  }

  return data;
}
