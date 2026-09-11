import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security Headers Middleware
 *
 * Adds CORS, CSP, and other security headers to all responses.
 * This addresses the audit finding about missing security headers.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ── Content Security Policy ──
  // Allow Pi SDK, Google Fonts, and our own origin
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.minepi.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.minepi.com https://api.sandbox.minepi.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspHeader);

  // ── Other Security Headers ──
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  // ── CORS for API routes ──
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // In production, restrict to Pi Browser origin
    const allowedOrigin = process.env.NODE_ENV === "production"
      ? "https://pinetwork-browser://"
      : "*";

    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Demo-Uid");
    response.headers.set("Access-Control-Max-Age", "86400");

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  return response;
}

// Only run middleware on API routes and page routes (exclude static assets)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|db/).*)",
  ],
};
