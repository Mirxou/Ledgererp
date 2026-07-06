"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<
    BeforeInstallPromptEvent | null
  >(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  }, []);

  if (!show) return null;

  return (
    <div className="pi-gradient text-white relative overflow-hidden rounded-xl mx-4 mt-4 mb-2">
      {/* Decorative glow */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl" />
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-400/15 rounded-full blur-xl" />

      <div className="relative flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
        {/* Logo + Text */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/pi-shield-logo.svg"
            alt="Ledgererp"
            className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 drop-shadow-lg"
          />
          <div className="min-w-0">
            <p className="font-bold text-sm sm:text-base leading-tight">
              تثبيت التطبيق على جهازك
            </p>
            <p className="text-white/75 text-xs sm:text-sm mt-0.5 truncate">
              وصول أسرع + وضع عدم الاتصال
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/25 gap-1.5 text-xs sm:text-sm px-3 sm:px-4 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">إضافة إلى الشاشة الرئيسية</span>
            <span className="sm:hidden">تثبيت</span>
          </Button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}