"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/charts/ScoreRing";

/* ════════════════════════════════════════════════════════════════════════════
   STAT CARD — Bold Statement Design
   ════════════════════════════════════════════════════════════════════════════ */

export function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-border/50 bg-background hover:border-border/80 transition-all duration-300 p-5 cursor-default"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <div className="flex items-center gap-4">
        {/* Icon circle with gradient */}
        <div
          className={`w-11 h-11 rounded-full ${color} flex items-center justify-center flex-shrink-0 shadow-lg`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Value + label */}
        <div className="flex-1 min-w-0">
          <p className="text-3xl font-black tracking-tight leading-none">
            <AnimatedNumber value={value} duration={800} delay={delay} />
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5 truncate">
            {label}
          </p>
          {sub && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
              {sub}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}