/**
 * NextAuth configuration — passwordless OTP via Credentials (demo mode).
 * No database adapter; codes live in in-memory store.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { verifyAndConsumeOtp } from "@/lib/auth/otp-store";

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      console.error("🚨 NEXTAUTH ERROR:", code, metadata);
    },
    warn(code) {
      console.warn("⚠️ NEXTAUTH WARN:", code);
    },
    debug(code, metadata) {
      console.log("🔍 NEXTAUTH DEBUG:", code, metadata);
    },
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const code = credentials?.code?.trim() ?? "";

        if (!email || !code) {
          console.warn("[Auth] OTP authorize — missing email or code");
          return null;
        }

        // Demo mode — accept any email domain; verify against in-memory OTP store only.
        console.log(`[Auth Demo] OTP login attempt: ${email}`);

        const codeValid = verifyAndConsumeOtp(email, code);
        console.log(`[Auth Demo] OTP code verification for ${email}: ${codeValid}`);

        if (!codeValid) {
          return null;
        }

        return {
          id: email,
          email,
          name: email.split("@")[0],
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string | undefined) ?? session.user.name;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Server-side session accessor for layouts, pages, and API routes. */
export function getAuthSession() {
  return getServerSession(authOptions);
}
