/**
 * In-memory OTP store — best-effort cache for same serverless instance.
 * Primary verification uses signed otpProof (otp-crypto.ts) for Vercel cold starts.
 */

const OTP_TTL_MS = 10 * 60 * 1000;

interface OtpEntry {
  code: string;
  expiresAt: number;
}

export interface OtpStoreResult {
  ok: boolean;
  error?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __deltaOtpStore: Map<string, OtpEntry> | undefined;
}

function getStore(): Map<string, OtpEntry> | null {
  try {
    if (typeof globalThis === "undefined") return null;
    if (!global.__deltaOtpStore) {
      global.__deltaOtpStore = new Map();
    }
    return global.__deltaOtpStore;
  } catch (err) {
    console.warn("[OTP] Could not access in-memory store:", err);
    return null;
  }
}

/** Generate a cryptographically random 6-digit numeric code. Never throws. */
export function generateOtpCode(): string {
  try {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % 1_000_000).toString().padStart(6, "0");
  } catch {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

/** Store OTP in memory — returns { ok: false } instead of throwing. */
export function storeOtp(email: string, code: string): OtpStoreResult {
  try {
    const store = getStore();
    if (!store) {
      return {
        ok: false,
        error: "In-memory OTP cache unavailable on this serverless instance.",
      };
    }

    const key = email.trim().toLowerCase();
    store.set(key, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown store error";
    console.warn("[OTP] storeOtp failed:", message);
    return { ok: false, error: message };
  }
}

/** Returns true and deletes the entry when the code matches and is not expired. */
export function verifyAndConsumeOtp(email: string, code: string): boolean {
  try {
    const store = getStore();
    if (!store) return false;

    const key = email.trim().toLowerCase();
    const entry = store.get(key);

    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return false;
    }

    if (entry.code !== code.trim()) return false;

    store.delete(key);
    return true;
  } catch (err) {
    console.warn("[OTP] verifyAndConsumeOtp failed:", err);
    return false;
  }
}
