import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // `after()` was promoted to stable in Next.js 15.1.
    // The flag is kept here for compatibility with any 15.0.x patch that
    // Vercel's build infrastructure might resolve to via the ^ range.
    after: true,
    serverActions: {
      // Increase the body size limit for invoice PDF uploads.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
