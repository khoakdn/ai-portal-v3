/**
 * POST /api/auth/send-otp
 * Demo mode — generates a 6-digit code + signed proof for serverless verify.
 */

import { NextResponse } from "next/server";
import { createOtpProof } from "@/lib/auth/otp-crypto";
import { generateOtpCode, storeOtp } from "@/lib/auth/otp-store";
import { isNextAuthSecretConfigured } from "@/lib/auth/secret";

export interface SendOtpBody {
  email?: string;
}

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  mockCode?: string;
  otpProof?: string;
  error?: string;
}

export async function POST(req: Request) {
  try {
    let body: SendOtpBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body." } satisfies SendOtpResponse,
        { status: 400 }
      );
    }

    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid email address is required.",
        } satisfies SendOtpResponse,
        { status: 400 }
      );
    }

    if (!isNextAuthSecretConfigured()) {
      console.warn(
        "[send-otp] NEXTAUTH_SECRET not set — using fallback; set it in Vercel env."
      );
    }

    const code = generateOtpCode();
    const storeResult = storeOtp(email, code);

    if (!storeResult.ok) {
      console.warn(
        "[send-otp] Memory cache skipped:",
        storeResult.error ?? "unknown"
      );
    }

    let otpProof: string;
    try {
      otpProof = createOtpProof(email, code);
    } catch (err) {
      console.error("[send-otp] Failed to create signed OTP proof:", err);
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not generate a verification code. Ensure NEXTAUTH_SECRET is configured in Vercel.",
        } satisfies SendOtpResponse,
        { status: 503 }
      );
    }

    console.log(`[send-otp] DEMO MODE — code for ${email}: ${code}`);

    return NextResponse.json(
      {
        success: true,
        mockCode: code,
        otpProof,
        message: storeResult.ok
          ? "Demo verification code generated."
          : "Demo code generated (serverless mode — use the code shown on screen).",
      } satisfies SendOtpResponse,
      { status: 200 }
    );
  } catch (err) {
    console.error("[send-otp] Unhandled error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong generating your code. Please try again in a moment.",
      } satisfies SendOtpResponse,
      { status: 500 }
    );
  }
}
