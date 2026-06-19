/**
 * NextAuth catch-all route — OTP credentials sign-in via @/lib/auth.
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
