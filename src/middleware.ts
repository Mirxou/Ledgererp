import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS & Preflight Middleware
 *
 * Handles dynamic CORS headers and OPTIONS preflight for API routes.
 *
 * Security headers are configured in next.config.ts (headers section) to avoid
 * conflicts. This file ONLY handles:
 * 1. Dynamic CORS origin (wildcard in dev, specific in production)
 * 2. OPTIONS preflight responses (204 No Content)
 *
 * NOTE: Next.js 16 shows a deprecation warning for middleware.ts in favor of
 * proxy.ts, but this file still functions correctly.
 */
export function middleware(request: NextRequest) {
  // ── CORS for API routes ──
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();

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

    return response;
  }

  return NextResponse.next();
}

// Only run on API routes and page routes (exclude static assets)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|db/).*)",
  ],
};
