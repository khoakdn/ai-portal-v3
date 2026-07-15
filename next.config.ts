import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.delta-emea.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "filecenter.deltaww.com",
        pathname: "/news/images/**",
      },
    ],
  },
};

export default nextConfig;
