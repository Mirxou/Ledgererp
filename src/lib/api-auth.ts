/**
 * API Authentication & Authorization Middleware
 *
 * Validates that requests come from authenticated Pi Network users.
 * In development/demo mode, allows requests with a demo header.
 * In production, requires a valid Pi access token verified against Pi API.
 */

import { NextRequest, NextResponse } from "next/server";

const PI_API_BASE = "https://api.minepi.com/v2";
const PI_SANDBOX_API_BASE = "https://api.sandbox.minepi.com/v2";

/** Pi user info returned after verification */
export interface VerifiedPiUser {
  uid: string;
  username: string;
}

/** Result of auth check */
export type AuthResult =
  | { ok: true; user: VerifiedPiUser }
  | { ok: false; response: NextResponse };

/**
 * Verify Pi access token and return user info.
 *
 * Checks:
 * 1. Authorization header exists with Bearer token
 * 2. Token is valid by calling Pi /me endpoint
 * 3. Returns user uid and username
 *
 * In development, also accepts "X-Demo-Uid" header for testing.
 */
export async function verifyPiAuth(req: NextRequest): Promise<AuthResult> {
  // ── Development: Accept demo header ──
  if (process.env.NODE_ENV === "development") {
    const demoUid = req.headers.get("X-Demo-Uid");
    if (demoUid) {
      return { ok: true, user: { uid: demoUid, username: "demo_user" } };
    }
  }

  // ── Check Authorization header ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer <pi_access_token>" },
        { status: 401 }
      ),
    };
  }

  const accessToken = authHeader.substring(7);

  // ── Verify token with Pi API (with 10s timeout) ──
  // Use sandbox API in development, mainnet in production
  const apiBase = process.env.NODE_ENV === "development" ? PI_SANDBOX_API_BASE : PI_API_BASE;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const piRes = await fetch(`${apiBase}/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!piRes.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Invalid or expired Pi access token" },
          { status: 401 }
        ),
      };
    }

    const userDTO = await piRes.json();

    if (!userDTO.uid) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Pi API did not return user uid" },
          { status: 401 }
        ),
      };
    }

    return {
      ok: true,
      user: {
        uid: userDTO.uid as string,
        username: (userDTO.username || "unknown") as string,
      },
    };
  } catch (err) {
    console.error("[api-auth] Pi verification failed:", err);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Pi authentication service unavailable" },
        { status: 503 }
      ),
    };
  }
}

/**
 * Verify that the authenticated user owns the specified store.
 * Used for store-scoped operations (update, delete, manage products/invoices).
 */
export async function verifyStoreOwnership(
  req: NextRequest,
  storeId: string,
  userUid: string
): Promise<{ ok: boolean; response?: NextResponse }> {
  // Import db lazily to avoid circular deps
  const { db } = await import("@/lib/db");

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: { piUid: true },
  });

  if (!store) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Store not found" }, { status: 404 }),
    };
  }

  if (store.piUid !== userUid) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You do not own this store" },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}

/**
 * Input sanitization utilities
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== "string") return "";
  // Trim whitespace
  let sanitized = input.trim();
  // Limit length
  if (sanitized.length > maxLength) sanitized = sanitized.substring(0, maxLength);
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  return sanitized;
}

export function validatePositiveNumber(input: unknown): number | null {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num) || num <= 0) return null;
  return num;
}

export function validateNonNegativeNumber(input: unknown): number | null {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num) || num < 0) return null;
  return num;
}

/** Valid invoice statuses */
const VALID_INVOICE_STATUSES = [
  "pending",
  "paid_escrow",
  "shipped",
  "delivered",
  "completed",
  "disputed",
  "cancelled",
  "releasing", // A2U payment in progress
] as const;

export function isValidInvoiceStatus(status: string): boolean {
  return (VALID_INVOICE_STATUSES as readonly string[]).includes(status);
}

/** Rate limiting (in-memory, per-IP) */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

/** Periodic cleanup of expired rate limit entries to prevent memory leak */
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(function() {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 120_000).unref(); // Clean every 2 min, don't keep process alive
}

export function checkRateLimit(req: NextRequest): NextResponse | null {
  // Schedule periodic cleanup on first call
  if (!cleanupScheduled) scheduleCleanup();

  // Get client IP (from headers or connection)
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return null;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  entry.count++;
  return null;
}
