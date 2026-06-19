/**
 * Stateless OTP proof — HMAC-signed payload so verify works across serverless instances.
 * No filesystem or persistent store required.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveNextAuthSecret } from "@/lib/auth/secret";

const OTP_TTL_MS = 10 * 60 * 1000;

interface OtpPayload {
  e: string;
  c: string;
  x: number;
}

/** Build a signed proof tying email + code + expiry (survives cold starts). */
export function createOtpProof(email: string, code: string): string {
  const payload: OtpPayload = {
    e: email.trim().toLowerCase(),
    c: code.trim(),
    x: Date.now() + OTP_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", resolveNextAuthSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${sig}`;
}

/** Verify signed proof without shared memory. Returns false on any error. */
export function verifyOtpProof(
  email: string,
  code: string,
  proof: string
): boolean {
  try {
    const [payloadB64, sig] = proof.split(".");
    if (!payloadB64 || !sig) return false;

    const expected = createHmac("sha256", resolveNextAuthSecret())
      .update(payloadB64)
      .digest("base64url");

    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as OtpPayload;

    if (payload.e !== email.trim().toLowerCase()) return false;
    if (payload.c !== code.trim()) return false;
    if (Date.now() > payload.x) return false;

    return true;
  } catch (err) {
    console.warn("[OTP] Proof verification failed:", err);
    return false;
  }
}
