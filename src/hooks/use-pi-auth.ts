"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  isPiBrowser,
  authenticatePi,
  type PiUser,
} from "@/lib/pi-sdk";

/* ─── Return type ─────────────────────────────────────────── */
export interface UsePiAuthReturn {
  /** `true` once we know whether the Pi SDK is available or not. */
  sdkReady: boolean;
  /** `true` when the user is NOT in Pi Browser (detection complete). */
  notPiBrowser: boolean;
  /** `true` after a successful Pi authentication + backend verification. */
  connected: boolean;
  /** The authenticated Pi user (null until connected). */
  user: PiUser | null;
  /** `true` while detection, authentication or verification is in flight. */
  loading: boolean;
  /** Human-readable error message, or null. */
  error: string | null;
  /** Manually trigger authentication (useful for a login button). */
  login: () => Promise<void>;
}

/* ─── Hook ────────────────────────────────────────────────── */

export function usePiAuth(): UsePiAuthReturn {
  const [sdkReady, setSdkReady] = useState(false);
  const [notPiBrowser, setNotPiBrowser] = useState(false);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<PiUser | null>(null);
  const [loading, setLoading] = useState(true); // Start true — we're detecting
  const [error, setError] = useState<string | null>(null);

  const authAttempted = useRef(false);
  const mountedRef = useRef(true);

  /* ── Step 1: detect Pi SDK ─────────────────────────────── */
  useEffect(() => {
    // If already available synchronously (Pi Browser, script loaded)
    if (isPiBrowser()) {
      setSdkReady(true);
      setLoading(false);
      return;
    }

    // Poll for async-loaded SDK (shouldn't happen in Pi Browser, but safety net)
    let attempts = 0;
    const MAX_ATTEMPTS = 15; // 15 × 500ms = 7.5 seconds

    const id = setInterval(() => {
      attempts++;
      if (isPiBrowser()) {
        clearInterval(id);
        if (mountedRef.current) {
          setSdkReady(true);
          setLoading(false);
        }
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(id);
        if (mountedRef.current) {
          setNotPiBrowser(true);
          setLoading(false);
        }
      }
    }, 500);

    return () => {
      clearInterval(id);
    };
  }, []);

  /* ── Step 2: authenticate when SDK is ready ─────────────── */
  const doAuth = useCallback(async () => {
    if (!isPiBrowser() || authAttempted.current) return;
    authAttempted.current = true;

    setLoading(true);
    setError(null);

    try {
      const authedUser = await authenticatePi();
      if (!mountedRef.current) return;

      setUser(authedUser);

      // Send accessToken to backend for server-side verification
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
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      authAttempted.current = false; // Allow retry
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Auto-authenticate as soon as the SDK becomes ready
  useEffect(() => {
    if (sdkReady && !connected) {
      doAuth();
    }
  }, [sdkReady, connected, doAuth]);

  // Cleanup
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  /* ── Manual login (retry) ───────────────────────────────── */
  const login = useCallback(async () => {
    authAttempted.current = false;
    await doAuth();
  }, [doAuth]);

  return { sdkReady, notPiBrowser, connected, user, loading, error, login };
}