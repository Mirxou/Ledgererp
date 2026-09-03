"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  isPiBrowser,
  initPi,
  authenticatePi,
  type PiUser,
} from "@/lib/pi-sdk";

/* ─── Return type ─────────────────────────────────────────── */
export interface UsePiAuthReturn {
  sdkReady: boolean;
  notPiBrowser: boolean;
  connected: boolean;
  user: PiUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
}

/* ─── Hook ────────────────────────────────────────────────── */

export function usePiAuth(): UsePiAuthReturn {
  const [sdkReady, setSdkReady] = useState(false);
  const [notPiBrowser, setNotPiBrowser] = useState(false);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<PiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authAttempted = useRef(false);
  const mountedRef = useRef(true);

  /* ── Step 1: detect Pi SDK ─────────────────────────────── */
  useEffect(() => {
    if (isPiBrowser()) {
      initPi(); // Initialize SDK before any other calls
      setSdkReady(true);
      setLoading(false);
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 15;

    const id = setInterval(() => {
      attempts++;
      if (isPiBrowser()) {
        clearInterval(id);
        if (mountedRef.current) {
          initPi(); // Initialize SDK
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

    return () => { clearInterval(id); };
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

      // Try backend verification — but DON'T block if it fails
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: authedUser.accessToken }),
        });

        if (res.ok) {
          const verified = await res.json();
          // Use verified data if available (more reliable)
          if (verified && verified.uid) {
            setUser({
              uid: verified.uid,
              username: verified.username || authedUser.username,
              accessToken: authedUser.accessToken,
            });
          }
        }
      } catch {
        // Backend verification failed — use SDK data directly
        console.warn("[usePiAuth] Backend verification skipped, using SDK data");
      }

      // Always connect using SDK data (Pi SDK already verified the user)
      setConnected(true);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      authAttempted.current = false;
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
