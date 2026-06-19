/**
 * Email domain lock — only approved corporate domains may authenticate.
 */

/** Returns the domain portion of an email address, lowercased. */
export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

/** True when the email belongs to ALLOWED_EMAIL_DOMAIN. */
export function isAllowedEmailDomain(email: string): boolean {
  const allowed = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!allowed) return false;
  const domain = extractEmailDomain(email);
  return domain === allowed;
}

/** Human-readable denial message for UI and logs. */
export function domainLockMessage(): string {
  const allowed = process.env.ALLOWED_EMAIL_DOMAIN ?? "your company domain";
  return `Access denied. Only @${allowed} email addresses are permitted.`;
}
