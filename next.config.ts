import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Allow Preview Panel cross-origin access
  allowedDevOrigins: ["http://127.0.0.1:81", "http://localhost:3000"],
  // Pi Browser compatibility — NO X-Frame-Options (Pi Browser uses WebView/iframe)
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://ledgererp.online, http://127.0.0.1:81" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;