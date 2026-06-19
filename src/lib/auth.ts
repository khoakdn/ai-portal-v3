/**
 * NextAuth configuration — passwordless OTP via Credentials (demo mode).
 * Stateless signed proofs work across Vercel serverless instances.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { verifyOtpProof } from "@/lib/auth/otp-crypto";
import { verifyAndConsumeOtp } from "@/lib/auth/otp-store";
import { resolveNextAuthSecret } from "@/lib/auth/secret";

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
        otpProof: { label: "OTP Proof", type: "text" },
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email?.trim().toLowerCase() ?? "";
          const code = credentials?.code?.trim() ?? "";
          const otpProof = credentials?.otpProof?.trim() ?? "";

          if (!email || !code) {
            console.warn("[Auth] OTP authorize — missing email or code");
            return null;
          }

          console.log(`[Auth Demo] OTP login attempt: ${email}`);

          const fromMemory = verifyAndConsumeOtp(email, code);
          const fromProof =
            !fromMemory && otpProof
              ? verifyOtpProof(email, code, otpProof)
              : false;

          const codeValid = fromMemory || fromProof;
          console.log(
            `[Auth Demo] OTP verification for ${email}: ${codeValid} (memory=${fromMemory}, proof=${fromProof})`
          );

          if (!codeValid) return null;

          return {
            id: email,
            email,
            name: email.split("@")[0],
          };
        } catch (err) {
          console.error("[Auth] authorize threw — returning null:", err);
          return null;
        }
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
  secret: resolveNextAuthSecret(),
};

/** Server-side session accessor for layouts, pages, and API routes. */
export function getAuthSession() {
  return getServerSession(authOptions);
}
