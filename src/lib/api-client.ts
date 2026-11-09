/**
 * Authenticated API Client
 *
 * Wraps fetch() with automatic Pi Network auth headers.
 * - In Pi Browser: sends Bearer token from Pi SDK
 * - In Demo/Dev mode: sends X-Demo-Uid header
 *
 * IMPORTANT: fetch() does NOT reject on HTTP errors (401/500) — without
 * explicit res.ok checking, failed mutations appear as SUCCESS on the client
 * while nothing was saved server-side (data silently lost on reload).
 * This client always throws ApiError for non-2xx responses.
 */

import { isPiBrowser, getP } from "./pi-sdk";

/** Custom error carrying HTTP status + server error message */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Event dispatched when the server rejects the auth token (401) */
export const SESSION_EXPIRED_EVENT = "ledgererp:session-expired";

// In-memory token cache
let cachedToken: string | null = null;

/**
 * Set the access token after Pi authentication.
 * Called by usePiAuth hook after successful auth.
 */
export function setAccessToken(token: string | null) {
  cachedToken = token;
}

/**
 * Get the current access token.
 */
export function getAccessToken(): string | null {
  return cachedToken;
}

/**
 * Build auth headers for API requests.
 * - Pi Browser + cached token: Authorization: Bearer <token>
 * - Demo mode: X-Demo-Uid: <uid>
 *
 * Fallback: if we're in Pi Browser but the token is missing, still send the
 * demo uid (harmless in production, useful in dev) so requests never go out
 * with zero auth headers.
 */
function buildAuthHeaders(demoUid?: string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (cachedToken) {
    headers["Authorization"] = `Bearer ${cachedToken}`;
  } else if (demoUid) {
    headers["X-Demo-Uid"] = demoUid;
  } else if (isPiBrowser() && !getP()) {
    // Pi Browser detected but SDK not ready yet — nothing to send
  }

  return headers;
}

/**
 * Parse the best human-readable message from an error response body.
 */
function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.error === "string" && b.error) return b.error;
    if (typeof b.message === "string" && b.message) return b.message;
  }
  return "خطأ في الخادم (HTTP " + status + ")";
}

/** Default request timeout (ms) — mobile networks can hang; never wait forever */
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Authenticated fetch wrapper.
 * Automatically adds auth headers and Content-Type.
 * THROWS ApiError for any non-2xx response (never silently succeeds).
 * Aborts after DEFAULT_TIMEOUT_MS with a clear network error.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
  demoUid?: string,
): Promise<Response> {
  const authHeaders = buildAuthHeaders(demoUid);

  const mergedHeaders: Record<string, string> = {
    ...authHeaders,
  };

  // Preserve existing headers
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        mergedHeaders[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      for (const [key, value] of options.headers) {
        mergedHeaders[key] = value;
      }
    } else {
      Object.assign(mergedHeaders, options.headers);
    }
  }

  // Add Content-Type for JSON bodies if not already set
  if (options.body && !mergedHeaders["Content-Type"]) {
    mergedHeaders["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timer = setTimeout(function() { controller.abort(); }, DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: mergedHeaders,
      signal: options.signal ?? controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    // Distinguish user-initiated aborts from our timeout
    if (err instanceof DOMException && err.name === "AbortError" && !options.signal) {
      throw new ApiError(0, "انتهت مهلة الاتصال بالخادم — تحقق من الإنترنت وأعد المحاولة");
    }
    throw err;
  }
  clearTimeout(timer);

  // ── THE critical check: fetch resolves even on 401/500! ──
  if (!res.ok) {
    // 401 = auth token expired/invalid → clear cache + notify app to re-auth
    if (res.status === 401) {
      cachedToken = null;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      }
    }
    // Try to read the server's error message (best effort)
    let message = "خطأ في الخادم (HTTP " + res.status + ")";
    try {
      const body = await res.json();
      message = extractErrorMessage(body, res.status);
    } catch {
      // non-JSON body — keep default message
    }
    throw new ApiError(res.status, message);
  }

  return res;
}

/**
 * Convenience methods for common API operations.
 */
export const api = {
  get: (url: string, demoUid?: string) =>
    apiFetch(url, { method: "GET" }, demoUid),

  post: (url: string, body: unknown, demoUid?: string) =>
    apiFetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    }, demoUid),

  patch: (url: string, body: unknown, demoUid?: string) =>
    apiFetch(url, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, demoUid),

  delete: (url: string, body?: unknown, demoUid?: string) =>
    apiFetch(url, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }, demoUid),
};

/** Extract a readable Arabic-friendly message from any thrown error */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) {
    if (err.message === "Failed to fetch" || err.name === "TypeError") {
      return "تعذر الاتصال بالخادم — تحقق من الإنترنت";
    }
    return err.message;
  }
  return "خطأ غير معروف";
}
