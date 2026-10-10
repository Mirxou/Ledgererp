"use client";

import { useCallback, useState } from "react";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ════════════════════════════════════════════════════════════════════════════
   SERVICE WORKER REGISTRAR
   ────────────────────────────────────────────────────────────────────────────
   • Registers /sw.js via useServiceWorker hook
   • Shows an update banner when a new SW is waiting
   • Provides "Apply update" button that skips waiting & reloads
   ════════════════════════════════════════════════════════════════════════════ */

export function ServiceWorkerRegistrar() {
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  const onUpdateAvailable = useCallback(() => {
    setDismissed(false);
  }, []);

  const { hasUpdate, applyUpdate } = useServiceWorker(onUpdateAvailable);

  const handleApplyUpdate = useCallback(() => {
    setApplying(true);
    applyUpdate();
    // Page will reload via controllerchange event
  }, [applyUpdate]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Show update banner only when update is available and not dismissed
  if (!hasUpdate || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-emerald-600 text-white rounded-lg shadow-lg border border-emerald-500 p-3">
        <div className="flex items-start gap-3">
          <RefreshCw className={`h-4 w-4 mt-0.5 shrink-0 ${applying ? "animate-spin" : ""}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              تحديث متاح
            </p>
            <p className="text-xs text-emerald-100 mt-0.5">
              إصدار جديد من التطبيق متاح. حدّث للحصول على أحدث الميزات.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleApplyUpdate}
                disabled={applying}
                className="h-7 text-xs"
              >
                {applying ? "جارٍ التحديث..." : "تحديث الآن"}
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 shrink-0 hover:bg-emerald-700 text-white"
            aria-label="إغلاق"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
