"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface SWMessage {
  type: string;
  [key: string]: unknown;
}

export interface SWStatus {
  isRegistered: boolean;
  hasUpdate: boolean;
  isOffline: boolean;
  pendingSales: number;
}

/**
 * useServiceWorker — Registers /sw.js and handles lifecycle events
 *
 * Features:
 *  - Registers service worker on mount
 *  - Detects new SW waiting and exposes `hasUpdate`
 *  - Accepts onUpdate callback to show "update available" UI
 *  - Listens for SW postMessage events (cache updates, sync status, etc.)
 *  - Provides helper to skip waiting and activate new SW
 */
export function useServiceWorker(onUpdate?: () => void) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof window !== "undefined" ? !navigator.onLine : false
  );

  // Skip waiting and activate the new SW
  const applyUpdate = useCallback(() => {
    const reg = registrationRef.current;
    if (!reg) return;
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }, []);

  // Clear API cache (useful for manual refresh)
  const clearApiCache = useCallback(() => {
    if (registrationRef.current?.active) {
      registrationRef.current.active.postMessage({ type: "CLEAR_API_CACHE" });
    }
  }, []);

  // Replay pending sales
  const replayPendingSales = useCallback(() => {
    if (registrationRef.current?.active) {
      registrationRef.current.active.postMessage({ type: "REPLAY_PENDING" });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // ── Register SW ────────────────────────────────────────────────────
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registrationRef.current = reg;
        console.log("[SW] Registered:", reg.scope);

        // Check if there's already a waiting SW (from previous page load)
        if (reg.waiting) {
          setHasUpdate(true);
          onUpdate?.();
        }

        // Listen for new SW installations
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New SW is installed and waiting
              setHasUpdate(true);
              onUpdate?.();
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });

    // ── Listen for controller change (new SW took over) ───────────────
    const handleControllerChange = () => {
      // New SW activated — reload to get fresh content
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // ── Listen for SW messages ────────────────────────────────────────
    const handleMessage = (event: MessageEvent<SWMessage>) => {
      const { data } = event;
      if (!data?.type) return;

      switch (data.type) {
        case "CACHE_UPDATED":
          // Could trigger a subtle UI indicator that data is fresh
          break;
        case "SALE_QUEUED":
          console.log("[SW] Sale queued offline:", data.id);
          break;
        case "SYNC_COMPLETE":
          console.log(
            `[SW] Sync complete: ${data.synced}/${data.total} synced, ${data.failed} failed`
          );
          break;
        case "CACHE_CLEARED":
          console.log("[SW] Cache cleared:", data.cache);
          break;
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);

    // ── Online/Offline status ──────────────────────────────────────────
    const handleOnline = () => {
      setIsOffline(false);
      // When coming back online, try to replay pending sales
      if (registrationRef.current?.active) {
        registrationRef.current.active.postMessage({ type: "REPLAY_PENDING" });
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onUpdate]);

  return {
    hasUpdate,
    isOffline,
    applyUpdate,
    clearApiCache,
    replayPendingSales,
  };
}
