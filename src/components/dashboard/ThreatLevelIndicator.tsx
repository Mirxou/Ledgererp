"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Clock, AlertTriangle, ShieldAlert, ShieldX, ShieldCheck } from "lucide-react";
import { useIssueStore } from "@/lib/store";
import { CARD_DEPTH } from "@/lib/audit-data";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { Badge } from "@/components/ui/badge";

/* ════════════════════════════════════════════════════════════════════════════
   THREAT LEVEL INDICATOR — DEFCON-style live gauge
   ════════════════════════════════════════════════════════════════════════════ */

type ThreatLevel = 0 | 1 | 2 | 3 | 4;

interface ThreatConfig {
  label: string;
  color: string;
  glowColor: string;
  ringColor: string;
  bgColor: string;
  textColor: string;
  icon: typeof Shield;
}

const THREAT_LEVELS: Record<ThreatLevel, ThreatConfig> = {
  0: {
    label: "آمن",
    color: "#22c55e",
    glowColor: "rgba(34,197,94,0.3)",
    ringColor: "rgba(34,197,94,0.15)",
    bgColor: "bg-green-500/10",
    textColor: "text-green-400",
    icon: ShieldCheck,
  },
  1: {
    label: "منخفض",
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.3)",
    ringColor: "rgba(245,158,11,0.15)",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
    icon: Shield,
  },
  2: {
    label: "متوسط",
    color: "#f97316",
    glowColor: "rgba(249,115,22,0.3)",
    ringColor: "rgba(249,115,22,0.15)",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
    icon: ShieldAlert,
  },
  3: {
    label: "مرتفع",
    color: "#ef4444",
    glowColor: "rgba(239,68,68,0.35)",
    ringColor: "rgba(239,68,68,0.15)",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
    icon: AlertTriangle,
  },
  4: {
    label: "حرج",
    color: "#dc2626",
    glowColor: "rgba(220,38,38,0.4)",
    ringColor: "rgba(220,38,38,0.2)",
    bgColor: "bg-red-600/10",
    textColor: "text-red-500",
    icon: ShieldX,
  },
};

function calculateThreatLevel(issues: { severity: string; status: string }[]): {
  level: ThreatLevel;
  counts: Record<string, number>;
} {
  const open = issues.filter((i) => i.status !== "FIXED");
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  open.forEach((i) => {
    const s = i.severity.toLowerCase();
    if (s === "critical") counts.critical++;
    else if (s === "high") counts.high++;
    else if (s === "medium") counts.medium++;
    else if (s === "low") counts.low++;
  });

  let level: ThreatLevel = 0;
  if (counts.critical >= 3) level = 4;
  else if (counts.critical >= 1) level = 3;
  else if (counts.high >= 3) level = 3;
  else if (counts.high >= 1 || counts.medium >= 5) level = 2;
  else if (counts.medium >= 1) level = 1;
  else if (counts.low >= 1) level = 1;
  else level = 0;

  return { level, counts };
}

/* ── Particles for CRITICAL ──────────────────────────────────────────── */

function CriticalParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-red-500"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
            x: [0, (Math.random() - 0.5) * 60],
            y: [0, (Math.random() - 0.5) * 60],
          }}
          transition={{
            duration: 1.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FULL GAUGE COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function ThreatLevelIndicator() {
  const { issues } = useIssueStore();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { level, counts } = useMemo(
    () => calculateThreatLevel(issues),
    [issues]
  );

  const config = THREAT_LEVELS[level];
  const LevelIcon = config.icon;

  /* Update timestamp */
  useEffect(() => {
    const interval = setInterval(() => setLastUpdate(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  /* Circumference for SVG ring */
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progress = ((4 - level) / 4) * circumference;

  const severityItems = [
    { label: "حرج", count: counts.critical, color: "bg-red-500", textColor: "text-red-400" },
    { label: "مرتفع", count: counts.high, color: "bg-orange-500", textColor: "text-orange-400" },
    { label: "متوسط", count: counts.medium, color: "bg-amber-500", textColor: "text-amber-400" },
    { label: "منخفض", count: counts.low, color: "bg-green-500", textColor: "text-green-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 ${CARD_DEPTH}`}
    >
      <PiSectionHeader icon={<ShieldAlert className="size-4" />}>
        مستوى التهديد
      </PiSectionHeader>

      <div className="flex flex-col items-center gap-5 mt-4">
        {/* Gauge */}
        <div className="relative">
          {level === 4 && <CriticalParticles />}

          {/* Glow */}
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl"
            animate={
              level >= 3
                ? {
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.05, 1],
                  }
                : { opacity: 0.2, scale: 1 }
            }
            transition={{
              duration: level === 4 ? 1.2 : 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
            }}
          />

          {/* SVG Ring */}
          <svg
            className="relative w-36 h-36 sm:w-44 sm:h-44 -rotate-90"
            viewBox="0 0 128 128"
          >
            {/* Background ring */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="6"
            />
            {/* Progress ring */}
            <motion.circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={config.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={false}
              animate={{ strokeDashoffset: progress }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 8px ${config.glowColor})`,
              }}
            />
            {/* Decorative inner ring */}
            <circle
              cx="64"
              cy="64"
              r={radius - 14}
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={level}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-1.5"
              >
                <motion.div
                  animate={
                    level >= 3
                      ? { scale: [1, 1.15, 1] }
                      : { scale: 1 }
                  }
                  transition={{
                    duration: 1.5,
                    repeat: level >= 3 ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                >
                  <LevelIcon
                    className="size-7 sm:size-8"
                    style={{ color: config.color }}
                  />
                </motion.div>
                <span
                  className="text-lg sm:text-xl font-bold"
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  المستوى {level + 1}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Severity breakdown */}
        <div className="w-full grid grid-cols-4 gap-3">
          {severityItems.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]"
            >
              <div
                className={`w-2 h-2 rounded-full ${item.color}`}
                style={{ boxShadow: `0 0 8px ${item.color.replace("bg-", "")}` }}
              />
              <span className={`text-base font-bold ${item.textColor}`}>
                {item.count}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          <span>
            آخر تحديث:{" "}
            {lastUpdate.toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPACT BAR VERSION (for header)
   ════════════════════════════════════════════════════════════════════════════ */

export function ThreatLevelBar() {
  const { issues } = useIssueStore();

  const { level, counts } = useMemo(
    () => calculateThreatLevel(issues),
    [issues]
  );

  const config = THREAT_LEVELS[level];
  const LevelIcon = config.icon;

  const totalOpen = counts.critical + counts.high + counts.medium + counts.low;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
    >
      <motion.div
        animate={
          level >= 3
            ? { scale: [1, 1.2, 1] }
            : { scale: 1 }
        }
        transition={{
          duration: 1.5,
          repeat: level >= 3 ? Infinity : 0,
        }}
      >
        <LevelIcon className="size-4" style={{ color: config.color }} />
      </motion.div>

      {/* Level bar */}
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((l) => (
          <motion.div
            key={l}
            className="h-2.5 w-5 rounded-sm sm:w-6"
            animate={{
              backgroundColor: l <= level ? config.color : "rgba(255,255,255,0.06)",
            }}
            transition={{ duration: 0.5 }}
            style={{
              boxShadow:
                l <= level ? `0 0 6px ${config.glowColor}` : "none",
            }}
          />
        ))}
      </div>

      <Badge
        variant="outline"
        className={`${config.textColor} border-current/20 text-[10px] font-semibold px-2`}
      >
        {config.label}
      </Badge>

      <span className="text-[11px] text-muted-foreground hidden sm:inline">
        {totalOpen} مفتوح
      </span>
    </motion.div>
  );
}