/**
 * In-memory OTP store — maps normalized email → { code, expiresAt }.
 * Uses globalThis so codes survive Next.js dev hot reloads in the same process.
 * Note: resets on serverless cold starts; fine for local/testing, not multi-instance prod.
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface OtpEntry {
  code: string;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __deltaOtpStore: Map<string, OtpEntry> | undefined;
}

function getStore(): Map<string, OtpEntry> {
  if (!global.__deltaOtpStore) {
    global.__deltaOtpStore = new Map();
  }
  return global.__deltaOtpStore;
}

/** Generate a cryptographically random 6-digit numeric code. */
export function generateOtpCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 1_000_000).toString().padStart(6, "0");
  return code;
}

export function storeOtp(email: string, code: string): void {
  const key = email.trim().toLowerCase();
  getStore().set(key, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  });
}

/** Returns true and deletes the entry when the code matches and is not expired. */
export function verifyAndConsumeOtp(email: string, code: string): boolean {
  const key = email.trim().toLowerCase();
  const entry = getStore().get(key);

  if (!entry) {
    console.warn("[OTP] No code found for:", key);
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    getStore().delete(key);
    console.warn("[OTP] Code expired for:", key);
    return false;
  }

  const normalized = code.trim();
  if (entry.code !== normalized) {
    console.warn("[OTP] Code mismatch for:", key);
    return false;
  }

  getStore().delete(key);
  return true;
}

/** Dev helper — peek without consuming (never expose in API responses). */
export function hasPendingOtp(email: string): boolean {
  const entry = getStore().get(email.trim().toLowerCase());
  return Boolean(entry && Date.now() <= entry.expiresAt);
}
