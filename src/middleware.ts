/**
 * Protect portal routes — unauthenticated users are redirected to /login.
 */

import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/press-release/:path*",
    "/invoice-analyzer/:path*",
    // Existing app routes that map to the same environments
    "/my-request/press-release/:path*",
    "/invoices/:path*",
    "/tasks/:path*",
    "/content/:path*",
    "/integrations/:path*",
  ],
};
