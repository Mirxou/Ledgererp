"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   PI SDK CONTEXT
   Safe wrapper around the Pi Network SDK — all functions are no-ops when
   `window.Pi` does not exist (i.e. running outside Pi Browser).
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Pi SDK type declarations ────────────────────────────────────────────── */

interface PiUser {
  uid: string;
  username: string;
  avatar: string;
}

interface PiSDK {
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void,
    callback: (err: unknown, auth: { user: PiUser; accessToken: string }) => void,
  ) => void;
  getBalance: (
    callback: (err: unknown, balance: number) => void,
  ) => void;
  createPayment: (payment: unknown, callbacks: unknown) => void;
}

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

/* ── Context types ───────────────────────────────────────────────────────── */

interface PiContextValue {
  isPiBrowser: boolean;
  isSDKReady: boolean;
  piUser: PiUser | null;
  piBalance: number | null;
  piAuth: () => Promise<void>;
  refreshBalance: () => void;
}

const PiContext = createContext<PiContextValue>({
  isPiBrowser: false,
  isSDKReady: false,
  piUser: null,
  piBalance: null,
  piAuth: async () => {},
  refreshBalance: () => {},
});

export function usePi() {
  return useContext(PiContext);
}

/* ── Provider ────────────────────────────────────────────────────────────── */

export function PiProvider({ children }: { children: React.ReactNode }) {
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [piUser, setPiUser] = useState<PiUser | null>(null);
  const [piBalance, setPiBalance] = useState<number | null>(null);
  const mountedRef = useRef(true);

  /* Detect Pi Browser and wait for SDK ready */
  useEffect(() => {
    const checkSDK = () => {
      if (typeof window !== "undefined" && window.Pi) {
        setIsPiBrowser(true);
        setIsSDKReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkSDK()) return;

    // Poll for SDK — it loads async
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (checkSDK() || attempts > 30) {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      mountedRef.current = false;
    };
  }, []);

  /* Authenticate with Pi SDK */
  const piAuth = useCallback(async () => {
    if (!window.Pi) return;

    window.Pi.authenticate(
      ["username", "payments", "wallet"],
      // onIncompletePaymentFound — no-op for audit app
      () => {},
      (err, authResult) => {
        if (!mountedRef.current) return;
        if (err) {
          console.error("Pi auth failed:", err);
          return;
        }
        if (authResult?.user) {
          setPiUser(authResult.user);
        }
        // After auth, fetch balance
        if (window.Pi) {
          window.Pi.getBalance((balanceErr, balance) => {
            if (!mountedRef.current) return;
            if (!balanceErr && balance !== undefined) {
              setPiBalance(balance);
            }
          });
        }
      },
    );
  }, []);

  /* Refresh balance without re-authenticating */
  const refreshBalance = useCallback(() => {
    if (!window.Pi) return;
    window.Pi.getBalance((err, balance) => {
      if (!mountedRef.current) return;
      if (!err && balance !== undefined) {
        setPiBalance(balance);
      }
    });
  }, []);

  return (
    <PiContext.Provider
      value={{ isPiBrowser, isSDKReady, piUser, piBalance, piAuth, refreshBalance }}
    >
      {children}
    </PiContext.Provider>
  );
}