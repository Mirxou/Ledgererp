"use client";

import { useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   COMPARISON BAR CHART
   Horizontal dual-bar chart comparing Ledgererp vs ecosystem average.
   ════════════════════════════════════════════════════════════════════════════ */

interface ComparisonItem {
  label: string;
  value: number;
  average: number;
}

export function ComparisonBar({ data }: { data: ComparisonItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const bars = containerRef.current?.querySelectorAll<HTMLElement>("[data-bar]");
    if (!bars) return;

    bars.forEach((bar) => {
      const target = parseFloat(bar.dataset.bar ?? "0");
      animRef.current = requestAnimationFrame(() => {
        bar.style.width = `${target}%`;
      });
    });

    return () => cancelAnimationFrame(animRef.current);
  }, [data]);

  const maxVal = 100;
  const labelW = 140;
  const padding = 8;
  const rowH = 48;
  const gap = 8;

  return (
    <div ref={containerRef} className="space-y-1" dir="rtl">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 px-1">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-3 h-2.5 rounded-sm" style={{ background: "linear-gradient(90deg, oklch(0.55 0.25 295), oklch(0.75 0.18 80))" }} />
          <span>Ledgererp</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-3 h-2.5 rounded-sm bg-muted-foreground/30" />
          <span>متوسط الإيكوسيستم</span>
        </div>
      </div>

      {data.map((item, i) => {
        const ledPct = (item.value / maxVal) * 100;
        const avgPct = (item.average / maxVal) * 100;
        return (
          <div
            key={i}
            className="flex items-center gap-3"
            style={{ height: rowH }}
          >
            {/* Label */}
            <span className="text-[11px] font-medium text-muted-foreground text-right flex-shrink-0" style={{ width: labelW }}>
              {item.label}
            </span>

            {/* Bars area */}
            <div className="flex-1 space-y-1.5 min-w-0">
              {/* Ledgererp bar */}
              <div className="relative h-4 w-full bg-muted-foreground/5 rounded-sm overflow-hidden">
                <div
                  data-bar={String(ledPct)}
                  className="absolute inset-y-0 right-0 rounded-sm transition-all duration-1000 ease-out"
                  style={{
                    width: "0%",
                    background: "linear-gradient(90deg, oklch(0.55 0.25 295), oklch(0.75 0.18 80))",
                    transitionDelay: `${i * 100}ms`,
                  }}
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[10px] font-bold text-foreground z-10">
                  {item.value}
                </span>
              </div>
              {/* Average bar */}
              <div className="relative h-3 w-full bg-muted-foreground/5 rounded-sm overflow-hidden">
                <div
                  data-bar={String(avgPct)}
                  className="absolute inset-y-0 right-0 bg-muted-foreground/25 rounded-sm transition-all duration-1000 ease-out"
                  style={{
                    width: "0%",
                    transitionDelay: `${i * 100 + 200}ms`,
                  }}
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[9px] text-muted-foreground z-10">
                  {item.average}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}