/**
 * POST /api/auth/send-otp
 * Demo mode — generates a 6-digit code, stores it in memory, returns mockCode to client.
 * No Resend dispatch or domain restrictions.
 */

import { NextResponse } from "next/server";
import { generateOtpCode, storeOtp } from "@/lib/auth/otp-store";
// import { sendOtpEmail } from "@/lib/auth/resend-otp";

export interface SendOtpBody {
  email?: string;
}

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  mockCode?: string;
  error?: string;
}

export async function POST(req: Request) {
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
      { success: false, error: "A valid email address is required." } satisfies SendOtpResponse,
      { status: 400 }
    );
  }

  // Demo mode — any valid email format is accepted (no ALLOWED_EMAIL_DOMAIN check).

  const code = generateOtpCode();
  storeOtp(email, code);

  console.log(`[send-otp] DEMO MODE — code for ${email}: ${code}`);

  // Live Resend dispatch disabled for demo presentations:
  // try {
  //   await sendOtpEmail(email, code);
  //   console.log("[send-otp] OTP email dispatched to:", email);
  // } catch (err) {
  //   console.error("🚨 send-otp Resend failure:", err);
  //   return NextResponse.json({ success: false, error: "..." }, { status: 502 });
  // }

  return NextResponse.json(
    {
      success: true,
      mockCode: code,
      message: "Demo verification code generated.",
    } satisfies SendOtpResponse,
    { status: 200 }
  );
}
