import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS & Preflight Middleware
 *
 * Handles dynamic CORS headers and OPTIONS preflight for API routes.
 * Uses Origin-based matching for correct Access-Control-Allow-Origin.
 *
 * Security headers are configured in next.config.ts (headers section).
 */
export function middleware(request: NextRequest) {
  // ── CORS for API routes ──
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();

    // C4 fix: Dynamic origin matching instead of invalid comma-separated or wildcard values
    const requestOrigin = request.headers.get("Origin") || "";
    const allowedOrigins = [
      "https://ledgererp.online",
      "http://localhost:3000",
      "http://127.0.0.1:81",
      "https://pinetwork-browser://", // Pi Browser internal scheme
    ];

    // In development, also allow any localhost origin
    const isDev = process.env.NODE_ENV === "development";
    const isAllowed = allowedOrigins.includes(requestOrigin) ||
      (isDev && (requestOrigin.startsWith("http://localhost:") || requestOrigin.startsWith("http://127.0.0.1:")));

    if (isAllowed && requestOrigin) {
      response.headers.set("Access-Control-Allow-Origin", requestOrigin);
      response.headers.set("Vary", "Origin");
    } else if (isDev && !requestOrigin) {
      // No origin header (same-origin or server-side request) in dev: allow
      response.headers.set("Access-Control-Allow-Origin", "*");
    }

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
