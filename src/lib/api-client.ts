/**
 * Authenticated API Client
 *
 * Wraps fetch() with automatic Pi Network auth headers.
 * - In Pi Browser: sends Bearer token from Pi SDK
 * - In Demo/Dev mode: sends X-Demo-Uid header
 */

import { isPiBrowser, getP } from "./pi-sdk";

// In-memory token cache
let cachedToken: string | null = null;

/**
 * Set the access token after Pi authentication.
 * Called by usePiAuth hook after successful auth.
 */
export function setAccessToken(token: string) {
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
 * - Pi Browser: Authorization: Bearer <token>
 * - Demo mode: X-Demo-Uid: <uid>
 */
function buildAuthHeaders(demoUid?: string): HeadersInit {
  const headers: Record<string, string> = {};

  if (isPiBrowser() && cachedToken) {
    headers["Authorization"] = `Bearer ${cachedToken}`;
  } else if (demoUid) {
    headers["X-Demo-Uid"] = demoUid;
  }

  return headers;
}

/**
 * Authenticated fetch wrapper.
 * Automatically adds auth headers and Content-Type.
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

  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
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
