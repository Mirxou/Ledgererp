"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Gauge } from "lucide-react";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface FixProgressGaugeProps {
  fixed: number;
  total: number;
  showHeader?: boolean;
}

/* ════════════════════════════════════════════════════════════════════════════
   COLOR BASED ON PROGRESS
   Red → Orange → Yellow → Green
   ════════════════════════════════════════════════════════════════════════════ */

function getProgressColor(pct: number): string {
  if (pct >= 75) return "oklch(0.696 0.17 162.48)";      // Green
  if (pct >= 50) return "oklch(0.828 0.189 84.429)";     // Yellow/Gold
  if (pct >= 25) return "oklch(0.705 0.213 47.604)";     // Orange
  return "oklch(0.577 0.245 27.325)";                    // Red
}

function getProgressBgColor(pct: number, isDark: boolean): string {
  if (isDark) return "oklch(0.269 0 0)";
  return "oklch(0.97 0 0)";
}

function getProgressTrackColor(isDark: boolean): string {
  if (isDark) return "oklch(0.3 0 0)";
  return "oklch(0.92 0 0)";
}

/* ════════════════════════════════════════════════════════════════════════════
   FIX PROGRESS GAUGE
   Uses Recharts PieChart with a custom active shape to create a
   circular gauge / donut-style progress indicator.
   ════════════════════════════════════════════════════════════════════════════ */

export function FixProgressGauge({
  fixed,
  total,
  showHeader = true,
}: FixProgressGaugeProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const pct = total > 0 ? Math.round((fixed / total) * 100) : 0;
  const color = getProgressColor(pct);
  const bgColor = getProgressBgColor(pct, isDark);
  const trackColor = getProgressTrackColor(isDark);

  const data = useMemo(
    () => [
      { name: "تم الإصلاح", value: fixed },
      { name: "متبقي", value: total - fixed },
    ],
    [fixed, total],
  );

  const activeShape = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (props: any) => {
      const {
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
      } = props as {
        cx: number;
        cy: number;
        innerRadius: number;
        outerRadius: number;
        startAngle: number;
        endAngle: number;
      };

      return (
        <g>
          {/* Background Track */}
          <circle
            cx={cx}
            cy={cy}
            r={(innerRadius + outerRadius) / 2}
            fill="none"
            stroke={trackColor}
            strokeWidth={outerRadius - innerRadius}
            opacity={0.8}
          />
          {/* Active Arc */}
          <path
            d={describeArc(cx, cy, innerRadius, outerRadius, startAngle, endAngle)}
            fill={color}
            opacity={0.9}
          >
            <animate
              attributeName="opacity"
              from="0"
              to="0.9"
              dur="1.2s"
              fill="freeze"
            />
          </path>
          {/* Glow effect in dark mode */}
          {isDark && (
            <path
              d={describeArc(cx, cy, innerRadius, outerRadius, startAngle, endAngle)}
              fill="none"
              stroke={color}
              strokeWidth={3}
              filter="url(#gaugeGlow)"
              opacity={0.5}
            />
          )}
        </g>
      );
    };
  }, [color, trackColor, isDark]);

  const glowFilterId = useMemo(
    () => `gaugeGlow-${Math.random().toString(36).slice(2)}`,
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="flex flex-col items-center"
    >
      {showHeader && (
        <PiSectionHeader icon={<Gauge className="h-4 w-4" />}>
          مقياس تقدم الإصلاحات
        </PiSectionHeader>
      )}

      <div className="relative w-full max-w-[220px] mx-auto">
        <div className="w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <PieChart>
              <defs>
                <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                </filter>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="85%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                activeIndex={0}
                activeShape={activeShape}
                animationDuration={1400}
                animationEasing="ease-out"
                stroke="none"
              >
                <Cell fill="transparent" />
                <Cell fill="transparent" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Center Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="font-bold leading-none"
            style={{
              fontSize: "2.5rem",
              color,
            }}
          >
            {pct}%
          </span>
          <span className="text-[11px] text-muted-foreground mt-1.5">
            {fixed} من {total}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            تم الإصلاح
          </span>
        </div>
      </div>

      {/* Color scale indicator */}
      <div className="flex items-center gap-1 mt-3">
        <span className="text-[9px] text-muted-foreground">0%</span>
        <div className="w-24 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(to left, 
                oklch(0.696 0.17 162.48), 
                oklch(0.828 0.189 84.429), 
                oklch(0.705 0.213 47.604), 
                oklch(0.577 0.245 27.325))`,
            }}
          />
        </div>
        <span className="text-[9px] text-muted-foreground">100%</span>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);

  const largeArcFlag = startAngle - endAngle > 180 ? 1 : 0;

  return [
    "M", outerStart.x, outerStart.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
}