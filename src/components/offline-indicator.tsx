"use client";

import { useState, useEffect, useCallback } from "react";
import { WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ════════════════════════════════════════════════════════════════════════════
   OFFLINE INDICATOR — Banner shown when browser is offline
   Emerald color, dismissible, auto-reappears on next offline event
   ════════════════════════════════════════════════════════════════════════════ */

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(function() {
    if (typeof window !== "undefined") return navigator.onLine;
    return true;
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false); // Reset dismissal when back online
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false); // Show banner again when going offline
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Don't show if online or dismissed
  if (isOnline || dismissed) return null;

  return (
    <div className="sticky top-14 z-40 w-full bg-emerald-600 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="text-xs sm:text-sm font-medium truncate">
            لا يوجد اتصال بالإنترنت — وضع عدم الاتصال
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-7 w-7 p-0 shrink-0 hover:bg-emerald-700 text-white"
          aria-label="إغلاق"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
