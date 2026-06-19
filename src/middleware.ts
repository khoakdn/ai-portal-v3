/**
 * Protect portal routes — redirects unauthenticated users to /login.
 * Uses getToken with try/catch so missing secrets never crash the edge runtime.
 */

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveNextAuthSecret } from "@/lib/auth/secret";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/press-release",
  "/invoice-analyzer",
  "/my-request/press-release",
  "/invoices",
  "/tasks",
  "/content",
  "/integrations",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(req: NextRequest) {
  if (!isProtectedPath(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({
      req,
      secret: resolveNextAuthSecret(),
    });

    if (token) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  } catch (err) {
    console.error("[middleware] Auth check failed — redirecting to login:", err);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/press-release/:path*",
    "/invoice-analyzer/:path*",
    "/my-request/press-release/:path*",
    "/invoices/:path*",
    "/tasks/:path*",
    "/content/:path*",
    "/integrations/:path*",
  ],
};
