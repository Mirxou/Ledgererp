"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { CARD_DEPTH } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface ScoreComparisonChartProps {
  backend: { codeQuality: number; security: number; architecture: number; overall: number };
  frontend: { codeQuality: number; security: number; overall: number };
  piNetwork: { overall: number };
  overall: number;
}

/* ════════════════════════════════════════════════════════════════════════════
   COLORS PER SOURCE
   ════════════════════════════════════════════════════════════════════════════ */

const SOURCE_COLORS = {
  الخادم: "oklch(0.55 0.25 295)",       // Pi purple
  "الواجهة الأمامية": "oklch(0.6 0.118 184.704)", // Teal
  "شبكة بي": "oklch(0.828 0.189 84.429)",        // Gold/amber
};

/* ════════════════════════════════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ════════════════════════════════════════════════════════════════════════════ */

function ComparisonTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xl backdrop-blur-md"
      dir="rtl"
    >
      <p className="text-xs font-bold text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.fill as string }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-bold tabular-nums">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CUSTOM LEGEND
   ════════════════════════════════════════════════════════════════════════════ */

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-5" dir="rtl">
      {Object.entries(SOURCE_COLORS).map(([label, color]) => (
        <div key={label} className="flex items-center gap-1.5 text-[11px]">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ROUNDED BAR
   Using Cell to set rounded tops via rx/ry is not directly supported,
   so we use a custom shape approach via the Bar shape prop.
   Instead, we apply the Recharts built-in radius prop on Bar.
   ════════════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════════
   SCORE COMPARISON CHART
   ════════════════════════════════════════════════════════════════════════════ */

export function ScoreComparisonChart({
  backend,
  frontend,
  piNetwork,
  overall,
}: ScoreComparisonChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark
    ? "oklch(1 0 0 / 6%)"
    : "oklch(0 0 0 / 6%)";
  const axisColor = isDark
    ? "oklch(0.556 0 0)"
    : "oklch(0.556 0 0)";

  const data = useMemo(
    () => [
      {
        dimension: "الأمان",
        الخادم: backend.security,
        "الواجهة الأمامية": frontend.security,
        "شبكة بي": piNetwork.overall,
      },
      {
        dimension: "البنية",
        الخادم: backend.architecture,
        "الواجهة الأمامية": 0,
        "شبكة بي": 0,
      },
      {
        dimension: "جودة الكود",
        الخادم: backend.codeQuality,
        "الواجهة الأمامية": frontend.codeQuality,
        "شبكة بي": 0,
      },
      {
        dimension: "النتيجة العامة",
        الخادم: backend.overall,
        "الواجهة الأمامية": frontend.overall,
        "شبكة بي": piNetwork.overall,
      },
    ],
    [backend, frontend, piNetwork],
  );

  const barColors = useMemo(
    () => [
      SOURCE_COLORS["الخادم"],
      SOURCE_COLORS["الواجهة الأمامية"],
      SOURCE_COLORS["شبكة بي"],
    ],
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className={CARD_DEPTH}>
        <CardHeader className="pb-2">
          <PiSectionHeader icon={<BarChart3 className="h-4 w-4" />}>
            مقارنة الدرجات بين الأنظمة
          </PiSectionHeader>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full min-h-[280px] sm:min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={280}>
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barCategoryGap="20%"
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="dimension"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-4}
                />
                <Tooltip
                  content={<ComparisonTooltip />}
                  cursor={{
                    fill: isDark
                      ? "oklch(1 0 0 / 4%)"
                      : "oklch(0 0 0 / 3%)",
                  }}
                />
                <Legend content={<CustomLegend />} />

                <Bar
                  dataKey="الخادم"
                  fill={barColors[0]}
                  radius={[6, 6, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  maxBarSize={36}
                />
                <Bar
                  dataKey="الواجهة الأمامية"
                  fill={barColors[1]}
                  radius={[6, 6, 0, 0]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  maxBarSize={36}
                />
                <Bar
                  dataKey="شبكة بي"
                  fill={barColors[2]}
                  radius={[6, 6, 0, 0]}
                  animationDuration={1400}
                  animationEasing="ease-out"
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}