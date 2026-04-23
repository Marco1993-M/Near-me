import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "near-me.cafe",
          },
        ],
        destination: "https://www.near-me.cafe/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
