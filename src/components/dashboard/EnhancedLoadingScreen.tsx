"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ════════════════════════════════════════════════════════════════════════════
   ENHANCED LOADING SCREEN
   Premium loading screen with animated Pi shield, progress bar, and
   CSS-only particle/sparkle effects.
   ════════════════════════════════════════════════════════════════════════════ */

interface EnhancedLoadingScreenProps {
  /** Called when loading completes (data ready). Screen jumps to 100% then fades. */
  onComplete?: () => void;
}

/* ── Generate sparkle/particle positions (CSS-only, no libraries) ────────── */

function generateSparkles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: `${10 + ((i * 37 + 13) % 80)}%`,
    left: `${5 + ((i * 53 + 7) % 90)}%`,
    size: 2 + (i % 3),
    delay: `${(i * 0.6) % 4}s`,
    duration: `${2.5 + (i % 3) * 0.8}s`,
    opacity: 0.2 + (i % 4) * 0.15,
  }));
}

const SPARKLES = generateSparkles(20);

/* ── Pi Shield SVG Logo ─────────────────────────────────────────────────── */

function PiShieldLogo() {
  return (
    <motion.div
      className="relative"
      animate={{ rotateY: [0, 360] }}
      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      style={{ perspective: "600px" }}
    >
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-[-12px] rounded-full border-2 border-purple-400/30"
        animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-[-8px] rounded-full border border-purple-400/20"
        animate={{ scale: [1, 1.25], opacity: [0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
      />

      {/* Main shield */}
      <motion.div
        className="w-24 h-24 sm:w-28 sm:h-28 relative"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Shield shape */}
          <defs>
            <linearGradient id="loadingShieldGrad" x1="10" y1="5" x2="90" y2="95">
              <stop stopColor="oklch(0.55 0.25 295)" />
              <stop offset="0.5" stopColor="oklch(0.50 0.22 280)" />
              <stop offset="1" stopColor="oklch(0.40 0.20 270)" />
            </linearGradient>
            <linearGradient id="loadingShieldInner" x1="20" y1="15" x2="80" y2="85">
              <stop stopColor="oklch(0.60 0.28 295 / 50%)" />
              <stop offset="1" stopColor="oklch(0.40 0.15 270 / 20%)" />
            </linearGradient>
            <filter id="loadingGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="0 0 0 0 0.55  0 0 0 0 0.25  0 0 0 0 0.29  0 0 0 0.5 0"
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer shield */}
          <path
            d="M50 5 L90 20 L90 50 C90 72 72 90 50 97 C28 90 10 72 10 50 L10 20 Z"
            fill="url(#loadingShieldGrad)"
            filter="url(#loadingGlow)"
          />

          {/* Inner highlight */}
          <path
            d="M50 15 L80 27 L80 50 C80 67 67 82 50 88 C33 82 20 67 20 50 L20 27 Z"
            fill="url(#loadingShieldInner)"
          />

          {/* Pi symbol */}
          <text x="50" y="62" textAnchor="middle" fontSize="36" fontWeight="bold" fill="white" fontFamily="serif" style={{ textShadow: "0 2px 8px oklch(0 0 0 / 30%)" }}>
            π
          </text>

          {/* Checkmark badge */}
          <circle cx="78" cy="22" r="10" fill="oklch(0.75 0.18 80)" stroke="white" strokeWidth="2.5" />
          <path d="M73 22 L77 26 L83 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

/* ── Progress Bar ───────────────────────────────────────────────────────── */

function LoadingProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="relative h-2.5 rounded-full bg-muted/50 dark:bg-muted/30 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 right-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, oklch(0.55 0.25 295), oklch(0.75 0.18 80))",
            boxShadow: "0 0 12px oklch(0.55 0.25 295 / 40%)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 rounded-full opacity-30"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          }}
          animate={{ x: ["100%", "-100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <motion.span
          className="text-xs font-bold pi-gradient-text tabular-nums"
          key={progress}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
        >
          {Math.round(progress)}%
        </motion.span>
        <span className="text-[10px] text-muted-foreground">جاري التحميل...</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function EnhancedLoadingScreen({ onComplete }: EnhancedLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  /* Simulated progress: 0% → 90%, then complete → 100% */
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        // Slow down as we approach 90%
        const increment = Math.max(0.5, (90 - prev) * 0.04);
        return Math.min(prev + increment, 90);
      });
    }, 80);

    return () => clearInterval(interval);
  }, [isComplete]);

  /* External trigger: jump to 100% when data loads */
  useEffect(() => {
    if (onComplete && progress >= 90 && !isComplete) {
      const timer = setTimeout(() => {
        setProgress(100);
        setIsComplete(true);
        setTimeout(() => {
          onComplete();
        }, 600);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete, isComplete]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated gradient mesh background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-background to-amber-50/30 dark:from-purple-950/50 dark:via-background dark:to-purple-950/20" />
            <motion.div
              className="absolute w-[500px] h-[500px] rounded-full opacity-20 dark:opacity-10 blur-3xl"
              style={{ background: "oklch(0.55 0.25 295)" }}
              animate={{
                x: [0, 100, -50, 0],
                y: [0, -80, 60, 0],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute w-[400px] h-[400px] rounded-full opacity-15 dark:opacity-8 blur-3xl"
              style={{ background: "oklch(0.75 0.18 80)" }}
              animate={{
                x: [0, -80, 50, 0],
                y: [0, 60, -40, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Sparkle particles (CSS-only) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {SPARKLES.map((s) => (
              <div
                key={s.id}
                className="absolute rounded-full animate-loading-sparkle"
                style={{
                  top: s.top,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  background: s.id % 2 === 0
                    ? "oklch(0.55 0.25 295)"
                    : "oklch(0.75 0.18 80)",
                  animationDelay: s.delay,
                  animationDuration: s.duration,
                  opacity: s.opacity,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8 px-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <PiShieldLogo />

            <div className="text-center space-y-3">
              <motion.h2
                className="text-lg sm:text-xl font-black text-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                جاري تحميل تقرير التدقيق الأمني
              </motion.h2>
              <motion.p
                className="text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                يرجى الانتظار بينما نقوم بتحليل البيانات...
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full"
            >
              <LoadingProgressBar progress={progress} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}