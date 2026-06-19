/**
 * NextAuth catch-all route — OTP credentials sign-in via @/lib/auth.
 * Handler is created at module load; authOptions uses a safe NEXTAUTH_SECRET fallback.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
