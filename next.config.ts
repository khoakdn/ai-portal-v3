import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Increase the body size limit for invoice PDF uploads.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
