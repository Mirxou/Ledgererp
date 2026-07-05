"use client";

import { AnimatedNumber } from "@/components/charts/ScoreRing";
import { Card, CardContent } from "@/components/ui/card";
import { GLASS_STAT } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   STAT CARD
   ════════════════════════════════════════════════════════════════════════════ */

export function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  color: string;
  delay?: number;
}) {
  return (
    <Card className={`relative overflow-hidden border-0 ${GLASS_STAT}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-black tracking-tight leading-none">
              <AnimatedNumber value={value} duration={800} delay={delay} />
            </p>
            <p className="text-[10px] font-medium text-muted-foreground mt-1 truncate">{label}</p>
            {sub && <p className="text-[9px] text-muted-foreground/60 mt-0.5 truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}