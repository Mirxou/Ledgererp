"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePi } from "@/lib/pi-context";

/* ════════════════════════════════════════════════════════════════════════════
   PI AUTH GATE — First-screen experience for Pi Network
   Shown when user has NOT authenticated and NOT chosen "visitor" mode.
   Dr. Kokkalis would approve: Pi-first, professional, branded.
   ════════════════════════════════════════════════════════════════════════════ */

export function PiAuthGate({ children }: { children: React.ReactNode }) {
  const { piUser, authenticate } = usePi();
  const [isVisitor, setIsVisitor] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ledgererp-visitor") === "true";
    }
    return false;
  });
  const [showGate, setShowGate] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Show gate after a brief delay (let the page shell render)
    const timer = setTimeout(() => setShowGate(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handlePiAuth = async () => {
    setAuthLoading(true);
    try {
      await authenticate();
      localStorage.setItem("ledgererp-pi-auth", "true");
    } catch {
      // Auth failed or not in Pi Browser — still let them in
      localStorage.setItem("ledgererp-visitor", "true");
      setIsVisitor(true);
    }
    setAuthLoading(false);
  };

  const handleVisitor = () => {
    localStorage.setItem("ledgererp-visitor", "true");
    setIsVisitor(true);
  };

  // If authenticated, visitor, or gate not yet shown — render children
  if (piUser || isVisitor || !showGate) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 bg-background">
          {/* Gradient orbs */}
          <div
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 animate-pulse"
            style={{
              background: "radial-gradient(circle, oklch(0.55 0.25 295) 0%, transparent 70%)",
              top: "10%",
              right: "10%",
              animationDuration: "4s",
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 animate-pulse"
            style={{
              background: "radial-gradient(circle, oklch(0.75 0.18 85) 0%, transparent 70%)",
              bottom: "20%",
              left: "15%",
              animationDuration: "5s",
              animationDelay: "1s",
            }}
          />
          <div
            className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-10 animate-pulse"
            style={{
              background: "radial-gradient(circle, oklch(0.65 0.24 295) 0%, transparent 70%)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              animationDuration: "6s",
              animationDelay: "2s",
            }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(oklch(0.55 0.25 295) 1px, transparent 1px), linear-gradient(90deg, oklch(0.55 0.25 295) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
          {/* Pi Logo with animated rings */}
          <motion.div
            className="relative mb-8"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          >
            {/* Pulsing rings */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              style={{ inset: "-12px" }}
            />
            <motion.div
              className="absolute rounded-full border border-primary/15"
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              style={{ inset: "-6px" }}
            />

            {/* Main Pi circle */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.25 295), oklch(0.40 0.20 280))",
                boxShadow: "0 0 60px oklch(0.55 0.25 295 / 30%), 0 0 120px oklch(0.55 0.25 295 / 10%)",
              }}
            >
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                <path d="M9.5 15.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5" opacity="0.5" />
                <path d="M8 10c0-2.21 1.79-4 4-4s4 1.79 4 4" opacity="0.3" />
              </svg>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-3xl sm:text-4xl font-black mb-3 text-gradient-pi leading-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Ledgererp
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-sm sm:text-base text-muted-foreground font-medium mb-2 leading-relaxed"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
          >
            منصة التدقيق الأمني على شبكة Pi Network
          </motion.p>

          {/* Pi Network badge */}
          <motion.div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-10"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            <span className="text-primary font-bold text-sm">π</span>
            <span className="text-primary text-xs font-medium">Pi Network Ecosystem</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </motion.div>

          {/* CTA Button */}
          <motion.button
            onClick={handlePiAuth}
            disabled={authLoading}
            className="w-full max-w-xs py-3.5 px-6 rounded-2xl text-white font-bold text-base relative overflow-hidden group pi-press"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.25 295), oklch(0.45 0.20 280))",
              boxShadow: "0 4px 30px oklch(0.55 0.25 295 / 30%)",
            }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 8px 40px oklch(0.55 0.25 295 / 40%)",
            }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Shimmer overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative flex items-center justify-center gap-2.5">
              {authLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري التحقق...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.5 15.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5" />
                  </svg>
                  تسجيل الدخول عبر Pi
                </>
              )}
            </span>
          </motion.button>

          {/* Visitor link */}
          <motion.button
            onClick={handleVisitor}
            className="mt-5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.5 }}
          >
            أو المتابعة كزائر ←
          </motion.button>

          {/* Trust indicators */}
          <motion.div
            className="mt-10 flex items-center gap-4 text-[10px] text-muted-foreground/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              مشفّر
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Pi-Only Auth
            </span>
            <span>•</span>
            <span>v3.0</span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}