/**
 * Resolve NextAuth signing secret — never throw during module init.
 * Vercel must set NEXTAUTH_SECRET in project env; fallback keeps demo/dev online.
 */

const DEV_FALLBACK_SECRET =
  "delta-portal-dev-fallback-secret-set-NEXTAUTH_SECRET-in-production";

let missingSecretWarned = false;

export function resolveNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;

  if (!missingSecretWarned) {
    missingSecretWarned = true;
    console.warn(
      "[Auth] NEXTAUTH_SECRET is missing — using fallback secret. " +
        "Set NEXTAUTH_SECRET in Vercel → Settings → Environment Variables."
    );
  }

  return DEV_FALLBACK_SECRET;
}

export function isNextAuthSecretConfigured(): boolean {
  return Boolean(process.env.NEXTAUTH_SECRET?.trim());
}
