import type { NextConfig } from "next";

const securityHeaders = [
  // Pi Browser uses WebView/iframe, so we use SAMEORIGIN instead of DENY
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // L6: Removed deprecated X-XSS-Protection (CSP provides equivalent protection)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.minepi.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.minepi.com https://api.sandbox.minepi.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow Preview Panel cross-origin access
  allowedDevOrigins: ["http://127.0.0.1:81", "http://localhost:3000"],
  async headers() {
    return [
      // Security headers for ALL routes
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // CORS for API routes — middleware handles dynamic origin matching
      // These static headers serve as fallback when no Origin header is present
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Demo-Uid" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
