"use client";

import { Progress } from "@/components/ui/progress";
import { getProgressColors } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   LABELED PROGRESS BAR
   ════════════════════════════════════════════════════════════════════════════ */

export function LabeledProgress({ label, value }: { label: string; value: number }) {
  const colors = getProgressColors(value);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-xs font-bold ${colors.text}`}>
          {value}<span className="text-muted-foreground/60 font-normal">/100</span>
        </span>
      </div>
      <Progress value={value} className={`h-2 ${colors.bar}`} />
    </div>
  );
}