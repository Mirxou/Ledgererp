"use client";

import { useEffect, useState, useRef } from "react";
import { getScoreColors } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   ANIMATED NUMBER
   60fps requestAnimationFrame with easeOutExpo deceleration.
   ════════════════════════════════════════════════════════════════════════════ */

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function AnimatedNumber({ value, duration = 1200, delay = 0 }: {
  value: number;
  duration?: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutExpo(progress);
        setDisplay(Math.round(eased * value));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, duration, delay]);

  return <span>{display}</span>;
}

/* ════════════════════════════════════════════════════════════════════════════
   SCORE RING (SVG)
   Upgraded with: track ring, gradient stroke, SVG glow filter,
   and pi-gradient-text for scores > 50.
   ════════════════════════════════════════════════════════════════════════════ */

export function ScoreRing({ score, label, size = 110, showAnimated = true }: {
  score: number;
  label: string;
  size?: number;
  showAnimated?: boolean;
}) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = getScoreColors(score);
  const uniqueId = `ring-${label.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-").toLowerCase()}`;
  const gradientId = `${uniqueId}-grad`;
  const glowId = `${uniqueId}-glow`;

  // Determine gradient colors based on score
  const gradStart = score >= 50
    ? "oklch(0.55 0.25 295)"   /* Pi purple */
    : "oklch(0.65 0.22 20)";   /* Warm red */
  const gradEnd = score >= 50
    ? "oklch(0.75 0.18 80)"    /* Gold */
    : "oklch(0.704 0.191 22.216)"; /* Red */

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={`relative rounded-full p-2.5 ${colors.bgClass}`} style={{ background: colors.bg }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            {/* Gradient for the score arc */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradStart} />
              <stop offset="100%" stopColor={gradEnd} />
            </linearGradient>

            {/* Soft glow filter */}
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values={`0 0 0 0 ${score >= 50 ? "0.55" : "0.70"}
                        0 0 0 0 ${score >= 50 ? "0.25" : "0.15"}
                        0 0 0 0 ${score >= 50 ? "0.29" : "0.22"}
                        0 0 0 0.6 0`}
                result="colorBlur"
              />
              <feMerge>
                <feMergeNode in="colorBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track ring — thin background circle */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted-foreground/10"
          />

          {/* Main score ring — uses gradient */}
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            strokeWidth="5.5" strokeLinecap="round"
            stroke={`url(#${gradientId})`}
            className="transition-all duration-1000 ease-out"
            style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          />

          {/* Glow layer — dark mode only */}
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            strokeWidth="5.5" strokeLinecap="round"
            stroke={`url(#${gradientId})`}
            className="hidden dark:block transition-all duration-1000 ease-out"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              filter: `drop-shadow(0 0 8px ${colors.glow})`,
            }}
            aria-hidden="true"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-bold ${score > 50 ? "pi-gradient-text" : colors.text}`}
          style={{ fontSize: size * 0.22 }}
        >
          {showAnimated ? <AnimatedNumber value={score} /> : score}
        </span>
      </div>
      <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight max-w-[120px]">{label}</span>
    </div>
  );
}