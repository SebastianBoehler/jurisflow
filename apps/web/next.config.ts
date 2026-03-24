import path from "node:path";

import type { NextConfig } from "next";

const apiDestination = `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/:path*`;

const nextConfig: NextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async rewrites() {
    return [
      {
        source: "/_jurisflow/:path*",
        destination: apiDestination
      }
    ];
  }
};

export default nextConfig;
