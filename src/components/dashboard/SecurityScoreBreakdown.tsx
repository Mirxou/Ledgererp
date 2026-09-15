"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, BarChart3,
  Lock, Database, Globe, Shield, Key, CircleDot, Code2, Server,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { CARD_DEPTH } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   SECURITY SCORE BREAKDOWN — 8-dimension detailed panel
   ════════════════════════════════════════════════════════════════════════════ */

interface Dimension {
  id: string;
  name: string;
  nameEn: string;
  icon: typeof Lock;
  score: number;
  previousScore: number;
}

type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "F";

function getGrade(score: number): Grade {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 60) return "D";
  return "F";
}

function getGradeColor(grade: Grade): string {
  if (grade.startsWith("A")) return "text-green-400";
  if (grade.startsWith("B")) return "text-emerald-400";
  if (grade.startsWith("C")) return "text-amber-400";
  if (grade.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

function getGradeBg(grade: Grade): string {
  if (grade.startsWith("A")) return "bg-green-500/15 border-green-500/25";
  if (grade.startsWith("B")) return "bg-emerald-500/15 border-emerald-500/25";
  if (grade.startsWith("C")) return "bg-amber-500/15 border-amber-500/25";
  if (grade.startsWith("D")) return "bg-orange-500/15 border-orange-500/25";
  return "bg-red-500/15 border-red-500/25";
}

function getBarGradient(score: number): string {
  if (score >= 90) return "from-green-500 to-emerald-400";
  if (score >= 80) return "from-emerald-500 to-teal-400";
  if (score >= 70) return "from-amber-500 to-yellow-400";
  if (score >= 60) return "from-orange-500 to-amber-400";
  return "from-red-500 to-rose-400";
}

function getTrend(current: number, previous: number): "up" | "down" | "stable" {
  const diff = current - previous;
  if (diff > 2) return "up";
  if (diff < -2) return "down";
  return "stable";
}

/* ── Score Dimensions Data ─────────────────────────────────────────────── */

function generateDimensions(): Dimension[] {
  return [
    {
      id: "auth",
      name: "أمان المصادقة",
      nameEn: "Authentication Security",
      icon: Lock,
      score: 82,
      previousScore: 75,
    },
    {
      id: "data",
      name: "حماية البيانات",
      nameEn: "Data Protection",
      icon: Database,
      score: 71,
      previousScore: 68,
    },
    {
      id: "api",
      name: "أمان API",
      nameEn: "API Security",
      icon: Globe,
      score: 65,
      previousScore: 72,
    },
    {
      id: "frontend",
      name: "حماية الواجهة",
      nameEn: "Frontend Protection",
      icon: Shield,
      score: 78,
      previousScore: 78,
    },
    {
      id: "crypto",
      name: "التشفير",
      nameEn: "Cryptography",
      icon: Key,
      score: 58,
      previousScore: 45,
    },
    {
      id: "pi-compliance",
      name: "التوافق مع Pi",
      nameEn: "Pi Compliance",
      icon: CircleDot,
      score: 88,
      previousScore: 82,
    },
    {
      id: "code-quality",
      name: "جودة الكود",
      nameEn: "Code Quality",
      icon: Code2,
      score: 74,
      previousScore: 70,
    },
    {
      id: "architecture",
      name: "هيكلية النظام",
      nameEn: "Architecture",
      icon: Server,
      score: 69,
      previousScore: 71,
    },
  ];
}

/* ── Dimension Row ─────────────────────────────────────────────────────── */

function DimensionRow({
  dimension,
  index,
}: {
  dimension: Dimension;
  index: number;
}) {
  const grade = getGrade(dimension.score);
  const trend = getTrend(dimension.score, dimension.previousScore);
  const Icon = dimension.icon;
  const gradient = getBarGradient(dimension.score);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="group"
    >
      <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-purple-500/30 transition-colors">
          <Icon className="size-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{dimension.name}</span>
            {/* Trend */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 + 0.2 }}
            >
              {trend === "up" && (
                <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                  <TrendingUp className="size-3" />
                  <span>+{dimension.score - dimension.previousScore}</span>
                </span>
              )}
              {trend === "down" && (
                <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                  <TrendingDown className="size-3" />
                  <span>{dimension.score - dimension.previousScore}</span>
                </span>
              )}
              {trend === "stable" && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                  <Minus className="size-3" />
                </span>
              )}
            </motion.div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-l ${gradient}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${dimension.score}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.06, ease: "easeOut" }}
                style={{
                  boxShadow: `0 0 12px ${dimension.score >= 80 ? "rgba(34,197,94,0.3)" : dimension.score >= 60 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground w-8 text-left tabular-nums">
              {dimension.score}
            </span>
          </div>
        </div>

        {/* Grade Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.06 + 0.15 }}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getGradeBg(grade)}`}
        >
          <span className={`text-sm font-bold ${getGradeColor(grade)}`}>
            {grade}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function SecurityScoreBreakdown() {
  const dimensions = useMemo(() => generateDimensions(), []);

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );
  const overallGrade = getGrade(overallScore);

  /* Radar chart mini data — simplified SVG hexagonal radar */
  const radarPoints = dimensions.map((d, i) => {
    const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2;
    const r = (d.score / 100) * 40;
    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
  });
  const radarPath = radarPoints.join(" ");

  const gridPoints = [25, 50, 75, 100].map((pct) => {
    const r = (pct / 100) * 40;
    return dimensions
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2;
        return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
      })
      .join(" ");
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 ${CARD_DEPTH}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <PiSectionHeader icon={<BarChart3 className="size-4" />}>
          تحليل النقاط الأمنية
        </PiSectionHeader>
      </div>

      {/* Overall Grade */}
      <div className="flex items-center gap-6 mb-6">
        {/* Radar Mini Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Grid lines */}
            {gridPoints.map((pts, i) => (
              <polygon
                key={i}
                points={pts}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.5"
              />
            ))}
            {/* Axes */}
            {dimensions.map((_, i) => {
              const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2;
              const ex = 50 + 40 * Math.cos(angle);
              const ey = 50 + 40 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={ex}
                  y2={ey}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="0.5"
                />
              );
            })}
            {/* Data polygon */}
            <motion.polygon
              points={radarPath}
              fill="oklch(0.55 0.25 295 / 0.15)"
              stroke="oklch(0.65 0.24 295)"
              strokeWidth="1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
            />
            {/* Data points */}
            {dimensions.map((d, i) => {
              const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2;
              const r = (d.score / 100) * 40;
              const cx = 50 + r * Math.cos(angle);
              const cy = 50 + r * Math.sin(angle);
              return (
                <motion.circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="2"
                  fill="oklch(0.65 0.24 295)"
                  initial={{ r: 0 }}
                  animate={{ r: 2 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                />
              );
            })}
          </svg>
        </motion.div>

        {/* Overall Grade Display */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">التقييم الإجمالي</p>
            <div className="flex items-baseline gap-3">
              <motion.span
                className={`text-5xl sm:text-6xl font-black ${getGradeColor(overallGrade)}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
              >
                {overallGrade}
              </motion.span>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold">{overallScore}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              من {dimensions.length} أبعاد أمنية
            </p>
          </motion.div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-white/[0.06] mb-2" />

      {/* Dimensions List */}
      <ScrollArea className="max-h-96">
        <div className="pl-1">
          {dimensions.map((dim, idx) => (
            <DimensionRow key={dim.id} dimension={dim} index={idx} />
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
}