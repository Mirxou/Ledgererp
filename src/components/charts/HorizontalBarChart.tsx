"use client";

/* ════════════════════════════════════════════════════════════════════════════
   HORIZONTAL BAR CHART (SVG)
   ════════════════════════════════════════════════════════════════════════════ */

export function HorizontalBarChart({ data, maxItems = 10 }: {
  data: { label: string; value: number; color: string }[];
  maxItems?: number;
}) {
  const items = data.slice(0, maxItems);
  const maxVal = Math.max(...items.map((d) => d.value), 1);
  const barH = 22, gap = 6, labelW = 160, valueW = 36, padRight = 8;
  const barAreaW = 280;
  const svgW = labelW + barAreaW + valueW + padRight;
  const svgH = items.length * (barH + gap) + 4;

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
      {items.map((d, i) => {
        const y = i * (barH + gap);
        const w = Math.max((d.value / maxVal) * barAreaW, 2);
        return (
          <g key={i} className="transition-all duration-500" style={{ transitionDelay: `${i * 60}ms` }}>
            <text x={labelW - 8} y={y + barH / 2 + 1} textAnchor="end" fontSize="10" fill="currentColor" className="fill-muted-foreground">
              {d.label.length > 24 ? d.label.slice(0, 22) + "\u2026" : d.label}
            </text>
            <rect x={labelW} y={y} width={w} height={barH} rx={4} fill={d.color} opacity={0.85} />
            <text x={labelW + w + 8} y={y + barH / 2 + 1} fontSize="11" fontWeight="600" fill="currentColor" className="fill-foreground">
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}