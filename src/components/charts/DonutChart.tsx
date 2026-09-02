"use client";

import { useMemo } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   SVG DONUT CHART
   ════════════════════════════════════════════════════════════════════════════ */

export function DonutChart({ data, size = 180 }: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2, cy = size / 2, r = size / 2 - 24, sw = 18;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(() =>
    data.map((d, idx) => {
      const pct = d.value / total;
      const accumulatedBefore = data.slice(0, idx).reduce((s, x) => s + x.value / total, 0);
      return { ...d, dashLen: pct * circumference, dashOffset: -accumulatedBefore * circumference, pct };
    }),
    [data, total, circumference],
  );

  if (total === 0) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">لا توجد بيانات</div>;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted-foreground/10" />
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" strokeWidth={sw} strokeLinecap="butt"
            stroke={s.color} strokeDasharray={`${s.dashLen} ${circumference - s.dashLen}`}
            strokeDashoffset={s.dashOffset}
            className="transition-all duration-700 ease-out" style={{ transitionDelay: `${i * 100}ms` }}
          />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}