/**
 * Helpers for protecting API routes with NextAuth session.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/** Returns the authenticated session or null. */
export async function getApiSession() {
  return getServerSession(authOptions);
}

/**
 * Guard an API route handler — returns 401 if the user is not signed in.
 * Usage:
 *   const denied = await requireApiAuth();
 *   if (denied) return denied;
 */
export async function requireApiAuth() {
  const session = await getApiSession();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized — sign in with your team account." },
      { status: 401 }
    );
  }
  return null;
}
