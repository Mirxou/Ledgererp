import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Allow Preview Panel cross-origin access
  allowedDevOrigins: ["http://127.0.0.1:81", "http://localhost:3000"],
  // Pi Browser compatibility — comprehensive security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        // API routes — CORS for Pi Network domain + local dev
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://ledgererp.online, http://127.0.0.1:81" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;