"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  isPiBrowser,
  authenticatePi,
  type PiUser,
} from "@/lib/pi-sdk";

/* ─── Return type ─────────────────────────────────────────── */
export interface UsePiAuthReturn {
  /** `true` once `window.Pi` is detected. */
  sdkReady: boolean;
  /** `true` after a successful Pi authentication + backend verification. */
  connected: boolean;
  /** The authenticated Pi user (null until connected). */
  user: PiUser | null;
  /** `true` while authentication or verification is in flight. */
  loading: boolean;
  /** Human-readable error message, or null. */
  error: string | null;
  /** Manually trigger authentication (useful for a login button). */
  login: () => Promise<void>;
}

/* ─── Hook ────────────────────────────────────────────────── */

/**
 * React hook that manages Pi Network authentication.
 *
 * • On mount it starts polling for `window.Pi` (the SDK loads asynchronously).
 * • Once the SDK is ready it automatically authenticates the user.
 * • After receiving the `accessToken` from Pi, it sends the token to
 *   `/api/auth/verify` so the backend can validate it against
 *   `https://api.minepi.com/v2/me`.
 */
export function usePiAuth(): UsePiAuthReturn {
  const [sdkReady, setSdkReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<PiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Prevent duplicate auth calls. */
  const authAttempted = useRef(false);

  /* ── Step 1: poll for SDK readiness ──────────────────────── */
  useEffect(() => {
    if (sdkReady) return; // already detected

    // If already available (synchronous load)
    if (isPiBrowser()) {
      setSdkReady(true);
      return;
    }

    // The script tag uses `beforeInteractive` but we still poll briefly
    // in case the environment loads it asynchronously.
    const id = setInterval(() => {
      if (isPiBrowser()) {
        clearInterval(id);
        setSdkReady(true);
      }
    }, 300);

    // Stop polling after 10 s — the user is probably not in Pi Browser.
    const timeout = setTimeout(() => {
      clearInterval(id);
    }, 10_000);

    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, [sdkReady]);

  /* ── Step 2: authenticate when SDK is ready ─────────────── */
  const doAuth = useCallback(async () => {
    if (!isPiBrowser() || authAttempted.current) return;
    authAttempted.current = true;

    setLoading(true);
    setError(null);

    try {
      const authedUser = await authenticatePi();
      setUser(authedUser);

      // Send the accessToken to our backend for server-side verification.
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: authedUser.accessToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ??
            `Backend verification failed (${res.status})`,
        );
      }

      setConnected(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      // Allow retrying on next manual login click
      authAttempted.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-authenticate as soon as the SDK becomes ready.
  useEffect(() => {
    if (sdkReady) {
      doAuth();
    }
  }, [sdkReady, doAuth]);

  /* ── Manual login (for a button) ───────────────────────── */
  const login = useCallback(async () => {
    // Reset state so the user can retry.
    authAttempted.current = false;
    await doAuth();
  }, [doAuth]);

  return { sdkReady, connected, user, loading, error, login };
}