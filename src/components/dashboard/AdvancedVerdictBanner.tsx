"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, AlertTriangle, XCircle, ChevronDown, Flame, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/charts/ScoreRing";
import { AuditReport } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   RISK LEVEL CONFIGURATION
   ════════════════════════════════════════════════════════════════════════════ */

type RiskLevel = "severe" | "high" | "medium" | "acceptable" | "excellent";

interface RiskConfig {
  label: string;
  color: string;
  darkColor: string;
  bgGradient: string;
  darkBgGradient: string;
  borderColor: string;
  darkBorderColor: string;
  icon: React.ReactNode;
  glowColor: string;
  dotColor: string;
}

const RISK_LEVELS: Record<RiskLevel, RiskConfig> = {
  severe: {
    label: "خطر شديد",
    color: "text-red-600",
    darkColor: "dark:text-red-400",
    bgGradient: "from-red-500/20 via-red-600/10 to-red-500/5",
    darkBgGradient: "dark:from-red-900/40 dark:via-red-800/20 dark:to-red-900/10",
    borderColor: "border-red-300/60",
    darkBorderColor: "dark:border-red-800/40",
    icon: <XCircle className="h-7 w-7" />,
    glowColor: "oklch(0.65 0.22 20 / 15%)",
    dotColor: "bg-red-500",
  },
  high: {
    label: "خطر مرتفع",
    color: "text-orange-600",
    darkColor: "dark:text-orange-400",
    bgGradient: "from-orange-500/20 via-orange-600/10 to-orange-500/5",
    darkBgGradient: "dark:from-orange-900/40 dark:via-orange-800/20 dark:to-orange-900/10",
    borderColor: "border-orange-300/60",
    darkBorderColor: "dark:border-orange-800/40",
    icon: <XCircle className="h-7 w-7" />,
    glowColor: "oklch(0.70 0.18 50 / 15%)",
    dotColor: "bg-orange-500",
  },
  medium: {
    label: "خطر متوسط",
    color: "text-yellow-600",
    darkColor: "dark:text-yellow-400",
    bgGradient: "from-yellow-500/20 via-yellow-600/10 to-yellow-500/5",
    darkBgGradient: "dark:from-yellow-900/40 dark:via-yellow-800/20 dark:to-yellow-900/10",
    borderColor: "border-yellow-300/60",
    darkBorderColor: "dark:border-yellow-800/40",
    icon: <AlertTriangle className="h-7 w-7" />,
    glowColor: "oklch(0.80 0.16 85 / 15%)",
    dotColor: "bg-yellow-500",
  },
  acceptable: {
    label: "مقبول",
    color: "text-lime-600",
    darkColor: "dark:text-lime-400",
    bgGradient: "from-lime-500/20 via-lime-600/10 to-lime-500/5",
    darkBgGradient: "dark:from-lime-900/40 dark:via-lime-800/20 dark:to-lime-900/10",
    borderColor: "border-lime-300/60",
    darkBorderColor: "dark:border-lime-800/40",
    icon: <ShieldCheck className="h-7 w-7" />,
    glowColor: "oklch(0.70 0.18 130 / 15%)",
    dotColor: "bg-lime-500",
  },
  excellent: {
    label: "ممتاز",
    color: "text-green-600",
    darkColor: "dark:text-green-400",
    bgGradient: "from-green-500/20 via-green-600/10 to-green-500/5",
    darkBgGradient: "dark:from-green-900/40 dark:via-green-800/20 dark:to-green-900/10",
    borderColor: "border-green-300/60",
    darkBorderColor: "dark:border-green-800/40",
    icon: <ShieldCheck className="h-7 w-7" />,
    glowColor: "oklch(0.65 0.20 150 / 15%)",
    dotColor: "bg-green-500",
  },
};

function getRiskLevel(score: number): RiskLevel {
  if (score <= 25) return "severe";
  if (score <= 50) return "high";
  if (score <= 75) return "medium";
  if (score <= 90) return "acceptable";
  return "excellent";
}

/* ════════════════════════════════════════════════════════════════════════════
   ANIMATED SCORE RING
   ════════════════════════════════════════════════════════════════════════════ */

function VerdictScoreRing({ score, risk }: { score: number; risk: RiskConfig }) {
  const size = 120;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const ringColor = score >= 76
    ? "oklch(0.65 0.20 150)"
    : score >= 51
      ? "oklch(0.80 0.16 85)"
      : score >= 26
        ? "oklch(0.70 0.18 50)"
        : "oklch(0.65 0.22 20)";

  const ringColorEnd = score >= 76
    ? "oklch(0.55 0.22 145)"
    : score >= 51
      ? "oklch(0.85 0.14 80)"
      : score >= 26
        ? "oklch(0.65 0.20 40)"
        : "oklch(0.55 0.20 15)";

  const gradId = "verdict-ring-grad";

  return (
    <div className="relative flex items-center justify-center flex-shrink-0">
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 100 }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={ringColor} />
              <stop offset="100%" stopColor={ringColorEnd} />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth="4"
            className="stroke-muted-foreground/10"
          />
          {/* Score arc */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth="6" strokeLinecap="round"
            stroke={`url(#${gradId})`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${risk.color} ${risk.darkColor}`}>
            <AnimatedNumber value={score} />
          </span>
          <span className="text-[9px] text-muted-foreground font-medium">درجة الأمان</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BACKGROUND PARTICLES
   ════════════════════════════════════════════════════════════════════════════ */

function BackgroundParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      top: `${5 + ((i * 41 + 17) % 90)}%`,
      left: `${3 + ((i * 59 + 11) % 94)}%`,
      size: 2 + (i % 4),
      delay: `${(i * 0.45) % 4}s`,
      duration: `${2.5 + (i % 3) * 0.7}s`,
    })),
  []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-particle-twinkle"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: "white",
            opacity: 0.12,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   KEY STATS ROW
   ════════════════════════════════════════════════════════════════════════════ */

function KeyStat({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <motion.div
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/10 dark:bg-white/5 border border-white/10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <div className={`${color} flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-white">{value}</p>
        <p className="text-[9px] text-white/60">{label}</p>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — AdvancedVerdictBanner
   ════════════════════════════════════════════════════════════════════════════ */

export function AdvancedVerdictBanner({ report }: { report: AuditReport }) {
  const [showDetails, setShowDetails] = useState(false);
  const score = report.scores.overall;
  const riskLevel = getRiskLevel(score);
  const risk = RISK_LEVELS[riskLevel];

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Animated gradient border */}
      <div className="absolute -inset-[2px] rounded-2xl overflow-hidden animate-verdict-border-spin">
        <div
          className="absolute inset-0"
          style={{
            background: score >= 76
              ? "conic-gradient(from 0deg, oklch(0.65 0.20 150 / 60%), oklch(0.55 0.22 145 / 40%), oklch(0.65 0.20 150 / 20%), oklch(0.55 0.22 145 / 60%), oklch(0.65 0.20 150 / 60%))"
              : score >= 51
                ? "conic-gradient(from 0deg, oklch(0.80 0.16 85 / 60%), oklch(0.85 0.14 80 / 40%), oklch(0.80 0.16 85 / 20%), oklch(0.85 0.14 80 / 60%), oklch(0.80 0.16 85 / 60%))"
                : score >= 26
                  ? "conic-gradient(from 0deg, oklch(0.70 0.18 50 / 60%), oklch(0.65 0.20 40 / 40%), oklch(0.70 0.18 50 / 20%), oklch(0.65 0.20 40 / 60%), oklch(0.70 0.18 50 / 60%))"
                  : "conic-gradient(from 0deg, oklch(0.65 0.22 20 / 60%), oklch(0.55 0.20 15 / 40%), oklch(0.65 0.22 20 / 20%), oklch(0.55 0.20 15 / 60%), oklch(0.65 0.22 20 / 60%))",
            filter: "blur(1px)",
          }}
        />
      </div>

      {/* Main banner content */}
      <div
        className={`relative z-10 rounded-2xl border-0 p-5 sm:p-6 overflow-hidden bg-gradient-to-br ${risk.bgGradient} ${risk.darkBgGradient}`}
        style={{
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        }}
      >
        {/* Background particles */}
        <BackgroundParticles />

        {/* Subtle glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 30% 50%, ${risk.glowColor} 0%, transparent 60%)` }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
          {/* Score Ring */}
          <VerdictScoreRing score={score} risk={risk} />

          {/* Info */}
          <div className="flex-1 min-w-0 text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
              <div className={`${risk.color} ${risk.darkColor}`}>
                {risk.icon}
              </div>
              <motion.h2
                className="text-lg sm:text-xl font-black"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                حكم الأمان:{" "}
                <span className={score > 50 ? "pi-gradient-text" : `${risk.color} ${risk.darkColor}`}>
                  {score}/100
                </span>
              </motion.h2>
            </div>

            {/* Risk level badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center sm:justify-start gap-2 mb-3"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${risk.dotColor} animate-pulse`} />
              <span className={`text-sm font-bold ${risk.color} ${risk.darkColor}`}>
                {risk.label}
              </span>
            </motion.div>

            {/* Key stats row */}
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <KeyStat
                icon={<Flame className="h-4 w-4 text-red-400" />}
                label="حرج"
                value={report.summary.critical}
                color="text-red-400"
              />
              <KeyStat
                icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}
                label="مرتفع"
                value={report.summary.high}
                color="text-orange-400"
              />
              <KeyStat
                icon={<ServerCrash className="h-4 w-4 text-rose-400" />}
                label="تعطل النشر"
                value={report.summary.blockingDeployment}
                color="text-rose-400"
              />
            </div>
          </div>
        </div>

        {/* Expandable details section */}
        <div className="relative z-10 mt-4">
          <motion.button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 mx-auto text-xs font-semibold text-white/60 hover:text-white/90 transition-colors"
            whileTap={{ scale: 0.97 }}
          >
            <span>{showDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
            <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RiskBreakdownItem label="ثغرات حرجة" count={report.summary.critical} total={report.summary.totalIssues} color="bg-red-500" />
                  <RiskBreakdownItem label="مشاكل مرتفعة" count={report.summary.high} total={report.summary.totalIssues} color="bg-orange-500" />
                  <RiskBreakdownItem label="مشاكل متوسطة" count={report.summary.medium} total={report.summary.totalIssues} color="bg-amber-500" />
                  <RiskBreakdownItem label="مشاكل منخفضة" count={report.summary.low} total={report.summary.totalIssues} color="bg-sky-500" />
                </div>

                {/* Risk summary text */}
                <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-white/70 leading-relaxed">
                    {score <= 25
                      ? "التطبيق يحتوي على ثغرات أمنية خطيرة تجعله غير آمن للاستخدام أو النشر. يجب إصلاح جميع المشاكل الحرجة فوراً."
                      : score <= 50
                        ? "التطبيق يعاني من مشاكل أمنية كبيرة تحتاج إلى إصلاح عاجل قبل التفكير في النشر."
                        : score <= 75
                          ? "مستوى الأمان متوسط. هناك تحسينات مطلوبة لكن التطبيق ليس في حالة حرجة."
                          : score <= 90
                            ? "مستوى الأمان مقبول. بعض التحسينات البسيطة قد ترفع الدرجة إلى ممتاز."
                            : "مستوى الأمان ممتاز! التطبيق يلبي معايير أمنية عالية."}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   RISK BREAKDOWN ITEM
   ════════════════════════════════════════════════════════════════════════════ */

function RiskBreakdownItem({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <motion.div
      className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-white/70 font-medium">{label}</span>
        <span className="text-xs font-bold text-white">{count} <span className="text-white/40 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}