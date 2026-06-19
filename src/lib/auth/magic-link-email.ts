/**
 * Branded HTML for magic-link sign-in emails sent via Resend.
 */

export function buildMagicLinkEmailHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr><td style="background:#0087DC;height:4px;"></td></tr>
        <tr><td style="padding:40px 32px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#0087DC;">Delta Electronics</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">Sign in to Marketing Portal</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#64748b;">Click the button below to securely sign in. This link expires in 24 hours and can only be used once.</p>
          <a href="${url}" style="display:inline-block;background:#0087DC;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">Sign in to Portal</a>
          <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">If you did not request this email, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildMagicLinkEmailText(url: string): string {
  return `Sign in to Delta Marketing Portal\n\n${url}\n\nThis link expires in 24 hours. If you did not request this email, ignore it.`;
}
