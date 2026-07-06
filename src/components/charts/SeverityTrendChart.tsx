"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { CARD_DEPTH } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   SIMULATED 7-DAY TREND DATA
   ════════════════════════════════════════════════════════════════════════════ */

const trendData = [
  { day: "السبت", critical: 28, high: 35, medium: 42 },
  { day: "الأحد", critical: 32, high: 38, medium: 40 },
  { day: "الاثنين", critical: 25, high: 30, medium: 35 },
  { day: "الثلاثاء", critical: 22, high: 28, medium: 38 },
  { day: "الأربعاء", critical: 20, high: 32, medium: 36 },
  { day: "الخميس", critical: 18, high: 26, medium: 33 },
  { day: "الجمعة", critical: 25, high: 30, medium: 35 },
];

/* ════════════════════════════════════════════════════════════════════════════
   CUSTOM ARABIC TOOLTIP
   ════════════════════════════════════════════════════════════════════════════ */

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl backdrop-blur-md"
      dir="rtl"
    >
      <p className="text-xs font-bold text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.dataKey === "critical"
                  ? "حرج"
                  : entry.dataKey === "high"
                    ? "مرتفع"
                    : "متوسط"}
              </span>
            </div>
            <span className="font-bold tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SEVERITY TREND CHART
   ════════════════════════════════════════════════════════════════════════════ */

export function SeverityTrendChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark
    ? "oklch(1 0 0 / 6%)"
    : "oklch(0 0 0 / 6%)";
  const axisColor = isDark
    ? "oklch(0.556 0 0)"
    : "oklch(0.556 0 0)";

  const gradientIds = useMemo(() => ({
    criticalFill: `critFill-${Math.random().toString(36).slice(2)}`,
    highFill: `highFill-${Math.random().toString(36).slice(2)}`,
    mediumFill: `medFill-${Math.random().toString(36).slice(2)}`,
  }), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className={CARD_DEPTH}>
        <CardHeader className="pb-2">
          <PiSectionHeader icon={<TrendingDown className="h-4 w-4" />}>
            اتجاه المشاكل الأمنية (آخر 7 أيام)
          </PiSectionHeader>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full min-h-[260px] sm:min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={260}>
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={gradientIds.criticalFill}
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop offset="5%" stopColor="oklch(0.577 0.245 27.325)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.577 0.245 27.325)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient
                    id={gradientIds.highFill}
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop offset="5%" stopColor="oklch(0.705 0.213 47.604)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.705 0.213 47.604)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient
                    id={gradientIds.mediumFill}
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop offset="5%" stopColor="oklch(0.828 0.189 84.429)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.828 0.189 84.429)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-4}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: isDark ? "oklch(1 0 0 / 15%)" : "oklch(0 0 0 / 10%)",
                    strokeWidth: 1,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="critical"
                  stroke="oklch(0.577 0.245 27.325)"
                  strokeWidth={2.5}
                  fill={`url(#${gradientIds.criticalFill})`}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "oklch(0.577 0.245 27.325)",
                    stroke: isDark ? "oklch(0.205 0 0)" : "white",
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="oklch(0.705 0.213 47.604)"
                  strokeWidth={2.5}
                  fill={`url(#${gradientIds.highFill})`}
                  animationDuration={1400}
                  animationEasing="ease-out"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "oklch(0.705 0.213 47.604)",
                    stroke: isDark ? "oklch(0.205 0 0)" : "white",
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stroke="oklch(0.828 0.189 84.429)"
                  strokeWidth={2.5}
                  fill={`url(#${gradientIds.mediumFill})`}
                  animationDuration={1600}
                  animationEasing="ease-out"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "oklch(0.828 0.189 84.429)",
                    stroke: isDark ? "oklch(0.205 0 0)" : "white",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-3" dir="rtl">
            {[
              { label: "حرج", color: "oklch(0.577 0.245 27.325)" },
              { label: "مرتفع", color: "oklch(0.705 0.213 47.604)" },
              { label: "متوسط", color: "oklch(0.828 0.189 84.429)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}