import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx", "xlsx-js-style"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
