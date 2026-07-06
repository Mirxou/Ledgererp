"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Treemap,
  ResponsiveContainer,
  type TreemapNode,
} from "recharts";
import { LayoutGrid } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { CARD_DEPTH } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface CategoryData {
  name: string;
  size: number;
  critical?: number;
  high?: number;
}

interface CategoryTreemapChartProps {
  data: CategoryData[];
}

/* ════════════════════════════════════════════════════════════════════════════
   CUSTOM CONTENT RENDERER
   ════════════════════════════════════════════════════════════════════════════ */

const COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  critical: {
    fill: "oklch(0.577 0.245 27.325 / 85%)",
    stroke: "oklch(0.577 0.245 27.325)",
    text: "text-red-100 dark:text-red-50",
  },
  high: {
    fill: "oklch(0.705 0.213 47.604 / 75%)",
    stroke: "oklch(0.705 0.213 47.604)",
    text: "text-orange-100 dark:text-orange-50",
  },
  medium: {
    fill: "oklch(0.828 0.189 84.429 / 70%)",
    stroke: "oklch(0.828 0.189 84.429)",
    text: "text-amber-900 dark:text-amber-100",
  },
  low: {
    fill: "oklch(0.627 0.265 303.9 / 60%)",
    stroke: "oklch(0.627 0.265 303.9)",
    text: "text-purple-100 dark:text-purple-50",
  },
};

function getSeverityLevel(item: CategoryData): string {
  if ((item.critical ?? 0) > 0) return "critical";
  if ((item.high ?? 0) > 0) return "high";
  if (item.size > 5) return "medium";
  return "low";
}

function CustomContent(props: Record<string, unknown>) {
  const { x, y, width, height, name, value } = props as TreemapNode & { critical?: number; high?: number };
  if (!x || !y || !width || !height || !name) return null;
  if (width < 50 || height < 36) return null;

  const item: CategoryData = { name, size: value ?? 0, critical: props.critical, high: props.high };
  const severity = getSeverityLevel(item);
  const colors = COLORS[severity];

  const showCount = width > 80 && height > 50;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1}
        rx={6}
        ry={6}
        style={{ transition: "all 0.3s ease" }}
      />
      {/* Inner subtle highlight for dark depth */}
      <rect
        x={x + 1}
        y={y + 1}
        width={width - 2}
        height={Math.min(height * 0.4, 20)}
        fill="oklch(1 0 0 / 8%)"
        rx={5}
        ry={5}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - (showCount ? 6 : 0)}
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        className={colors.text}
        style={{
          fontSize: Math.min(width / name.length * 1.6, 14),
          fontWeight: 700,
          fontFamily: "var(--font-cairo), system-ui, sans-serif",
        }}
      >
        {name}
      </text>
      {showCount && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          className={colors.text}
          style={{
            fontSize: 11,
            opacity: 0.85,
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          }}
        >
          {value} مشكلة
        </text>
      )}
    </g>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CATEGORY TREEMAP CHART
   ════════════════════════════════════════════════════════════════════════════ */

export function CategoryTreemapChart({ data }: CategoryTreemapChartProps) {
  const { resolvedTheme } = useTheme();

  const treemapData = useMemo(
    () => [
      {
        name: "الفئات",
        children: data.map((d) => ({
          name: d.name,
          size: d.size,
          critical: d.critical,
          high: d.high,
        })),
      },
    ],
    [data],
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
          <PiSectionHeader icon={<LayoutGrid className="h-4 w-4" />}>
            خريطة توزيع المشاكل حسب الفئة
          </PiSectionHeader>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full min-h-[260px] sm:min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={260}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="transparent"
                content={<CustomContent />}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </ResponsiveContainer>
          </div>

          {/* Severity Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 flex-wrap" dir="rtl">
            {[
              { label: "يحتوي حرج", color: "oklch(0.577 0.245 27.325)" },
              { label: "يحتوي مرتفع", color: "oklch(0.705 0.213 47.604)" },
              { label: "متوسط الحجم", color: "oklch(0.828 0.189 84.429)" },
              { label: "منخفض", color: "oklch(0.627 0.265 303.9)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="w-2.5 h-2.5 rounded"
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