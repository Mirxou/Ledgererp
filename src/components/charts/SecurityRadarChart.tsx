"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import { Shield } from "lucide-react";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

export interface SecurityScores {
  الأمان: number;
  البنية: number;
  "جودة الكود": number;
  التشفير: number;
  المصادقة: number;
  الأداء: number;
}

interface SecurityRadarChartProps {
  scores: SecurityScores;
  showHeader?: boolean;
}

/* ════════════════════════════════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ════════════════════════════════════════════════════════════════════════════ */

function RadarTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="rounded-lg border border-border/60 bg-card px-3 py-2 shadow-lg backdrop-blur-md text-xs"
      dir="rtl"
    >
      <span className="font-bold text-purple-600 dark:text-purple-400">
        {item.name}
      </span>
      <span className="text-muted-foreground mr-2">
        : {item.value}%
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECURITY RADAR CHART
   ════════════════════════════════════════════════════════════════════════════ */

export function SecurityRadarChart({
  scores,
  showHeader = true,
}: SecurityRadarChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gradientId = useMemo(
    () => `radarGrad-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const data = useMemo(
    () =>
      Object.entries(scores).map(([key, value]) => ({
        dimension: key,
        value,
        fullMark: 100,
      })),
    [scores],
  );

  const gridColor = isDark
    ? "oklch(1 0 0 / 8%)"
    : "oklch(0 0 0 / 8%)";
  const axisColor = isDark
    ? "oklch(0.6 0 0)"
    : "oklch(0.4 0 0)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {showHeader && (
        <PiSectionHeader icon={<Shield className="h-4 w-4 text-purple-500" />}>
          نتيجة الأمان الشاملة
        </PiSectionHeader>
      )}
      <div className="w-full min-h-[280px] sm:min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={280}>
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="72%"
            data={data}
          >
            <defs>
              <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor="oklch(0.55 0.25 295)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="100%"
                  stopColor="oklch(0.75 0.18 80)"
                  stopOpacity={0.15}
                />
              </radialGradient>
            </defs>

            <PolarGrid
              stroke={gridColor}
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{
                fill: axisColor,
                fontSize: 11,
                fontFamily: "var(--font-cairo), system-ui, sans-serif",
              }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />

            <Tooltip content={<RadarTooltip />} />

            <Radar
              name="النتيجة"
              dataKey="value"
              stroke="oklch(0.55 0.25 295)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              animationDuration={1500}
              animationEasing="ease-out"
              dot={{
                r: 4,
                fill: "oklch(0.55 0.25 295)",
                stroke: isDark ? "oklch(0.205 0 0)" : "white",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "oklch(0.55 0.25 295)",
                stroke: isDark ? "oklch(0.205 0 0)" : "white",
                strokeWidth: 2,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}