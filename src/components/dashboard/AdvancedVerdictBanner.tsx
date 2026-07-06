"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AuditReport } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   RISK LEVEL CONFIGURATION
   ════════════════════════════════════════════════════════════════════════════ */

type RiskLevel = "severe" | "high" | "medium" | "acceptable" | "excellent";

interface RiskConfig {
  label: string;
  pillClass: string;
  bgClass: string;
  borderClass: string;
  scoreTextClass: string;
  stepsNeeded: (critical: number, high: number) => string;
}

const RISK_LEVELS: Record<RiskLevel, RiskConfig> = {
  severe: {
    label: "خطر شديد",
    pillClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    bgClass: "bg-gradient-to-br from-red-50/80 via-background to-red-50/40 dark:from-red-950/30 dark:via-background dark:to-red-950/15",
    borderClass: "border-red-200/60 dark:border-red-800/30",
    scoreTextClass: "text-red-600 dark:text-red-400",
    stepsNeeded: (c, h) => `إصلاح ${Math.ceil(c * 0.4)} مشكلة حرجة + ${Math.ceil(h * 0.2)} مرتفعة`,
  },
  high: {
    label: "خطر مرتفع",
    pillClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    bgClass: "bg-gradient-to-br from-orange-50/80 via-background to-orange-50/40 dark:from-orange-950/30 dark:via-background dark:to-orange-950/15",
    borderClass: "border-orange-200/60 dark:border-orange-800/30",
    scoreTextClass: "text-orange-600 dark:text-orange-400",
    stepsNeeded: (c, h) => `إصلاح ${Math.ceil(c * 0.5)} مشكلة حرجة + ${Math.ceil(h * 0.3)} مرتفعة`,
  },
  medium: {
    label: "خطر متوسط",
    pillClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    bgClass: "bg-gradient-to-br from-amber-50/80 via-background to-amber-50/40 dark:from-amber-950/30 dark:via-background dark:to-amber-950/15",
    borderClass: "border-amber-200/60 dark:border-amber-800/30",
    scoreTextClass: "text-amber-600 dark:text-amber-400",
    stepsNeeded: (c, h) => `إصلاح ${c} مشكلة حرجة + ${Math.ceil(h * 0.2)} مرتفعة`,
  },
  acceptable: {
    label: "مقبول",
    pillClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    bgClass: "bg-gradient-to-br from-emerald-50/80 via-background to-emerald-50/40 dark:from-emerald-950/30 dark:via-background dark:to-emerald-950/15",
    borderClass: "border-emerald-200/60 dark:border-emerald-800/30",
    scoreTextClass: "text-emerald-600 dark:text-emerald-400",
    stepsNeeded: () => "تحسين بسيط للوصول إلى المستوى الممتاز",
  },
  excellent: {
    label: "ممتاز",
    pillClass: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    bgClass: "bg-gradient-to-br from-green-50/80 via-background to-green-50/40 dark:from-green-950/30 dark:via-background dark:to-green-950/15",
    borderClass: "border-green-200/60 dark:border-green-800/30",
    scoreTextClass: "text-green-600 dark:text-green-400",
    stepsNeeded: () => "التطبيق يلبي معايير أمنية عالية",
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
   MAIN COMPONENT — AdvancedVerdictBanner
   ════════════════════════════════════════════════════════════════════════════ */

export function AdvancedVerdictBanner({ report }: { report: AuditReport }) {
  const [expanded, setExpanded] = useState(false);
  const score = report.scores.overall;
  const riskLevel = getRiskLevel(score);
  const risk = RISK_LEVELS[riskLevel];

  const description = useMemo(() => {
    if (score <= 25) return `${report.summary.critical} ثغرة حرجة تمنع النشر على Mainnet`;
    if (score <= 50) return `${report.summary.critical} ثغرة حرجة و ${report.summary.high} مشكلة مرتفعة تحتاج إصلاح عاجل`;
    if (score <= 75) return `تحسينات مطلوبة: ${report.summary.critical} حرج + ${report.summary.high} مرتفع`;
    if (score <= 90) return `مستوى أمان جيد — بعض التحسينات البسيطة مطلوبة`;
    return "مستوى أمان ممتاز — التطبيق جاهز للنشر";
  }, [score, report.summary.critical, report.summary.high]);

  const scoreBarPct = score;
  const stepsText = risk.stepsNeeded(report.summary.critical, report.summary.high);

  return (
    <div className={`rounded-2xl p-6 border ${risk.borderClass} ${risk.bgClass} transition-colors duration-300`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Left: Score */}
        <div className="flex items-baseline gap-1 flex-shrink-0">
          <span className={`text-5xl sm:text-6xl font-black tracking-tighter leading-none ${risk.scoreTextClass}`}>
            {score}
          </span>
          <span className="text-xl text-muted-foreground font-light">/</span>
          <span className="text-lg text-muted-foreground/60 font-light">100</span>
        </div>

        {/* Center: Label + description */}
        <div className="flex-1 min-w-0 space-y-2">
          <Badge
            variant="outline"
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${risk.pillClass}`}
          >
            {risk.label}
          </Badge>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {/* Right: Severity pills */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/8 border border-red-500/15">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-red-600 dark:text-red-400">{report.summary.critical}</span>
            <span className="text-[11px] text-muted-foreground">حرج</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/8 border border-orange-500/15">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{report.summary.high}</span>
            <span className="text-[11px] text-muted-foreground">مرتفع</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{report.summary.medium}</span>
            <span className="text-[11px] text-muted-foreground">متوسط</span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 mx-auto mt-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{expanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
      </button>

      {/* Expandable details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {/* Score breakdown bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">النتيجة الحالية</span>
                  <span className={`font-bold ${risk.scoreTextClass}`}>{score}/100</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      score <= 25 ? "bg-red-500" : score <= 50 ? "bg-orange-500" : score <= 75 ? "bg-amber-500" : score <= 90 ? "bg-emerald-500" : "bg-green-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${scoreBarPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                {/* Severity breakdown mini bars */}
                <div className="flex gap-1 mt-2">
                  <div className="flex-1 h-1 rounded-full bg-red-500/60" style={{ flexBasis: `${Math.max(report.summary.critical, 2)}%` }} />
                  <div className="flex-1 h-1 rounded-full bg-orange-500/60" style={{ flexBasis: `${Math.max(report.summary.high, 3)}%` }} />
                  <div className="flex-1 h-1 rounded-full bg-amber-500/60" style={{ flexBasis: `${Math.max(report.summary.medium, 3)}%` }} />
                  <div className="flex-1 h-1 rounded-full bg-sky-500/60" style={{ flexBasis: `${Math.max(report.summary.low, 2)}%` }} />
                </div>
              </div>

              {/* Steps needed */}
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border/40">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">الخطوات المطلوبة للوصول إلى 60+: </span>
                  {stepsText}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}