"use client";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { IssueWithStatus } from "@/lib/store";
import { CARD_DEPTH } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   FIX PROGRESS CARD
   ════════════════════════════════════════════════════════════════════════════ */

export function FixProgressCard({ issues }: { issues: IssueWithStatus[] }) {
  const total = issues.length || 95;
  const fixed = issues.filter((i) => i.status === "fixed").length;
  const inProgress = issues.filter((i) => i.status === "in_progress").length;
  const openCritical = issues.filter((i) => i.status === "open" && i.severity === "CRITICAL").length;
  const openHigh = issues.filter((i) => i.status === "open" && i.severity === "HIGH").length;
  const pct = total > 0 ? Math.round((fixed / total) * 100) : 0;

  return (
    <Card className={CARD_DEPTH}>
      <CardHeader className="pb-3">
        <PiSectionHeader icon={<TrendingUp className="h-4 w-4" />}>
          تقدم الإصلاحات
        </PiSectionHeader>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{fixed} من {total} تم إصلاحها</span>
            <span className={`font-bold text-lg ${pct >= 50 ? "text-green-500" : pct >= 25 ? "text-amber-500" : "text-red-500"}`}>
              {pct}%
            </span>
          </div>
          <div className="relative h-4 rounded-full bg-muted overflow-hidden">
            {/* Fixed (green) */}
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-green-500 to-green-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(fixed / total) * 100}%` }}
            />
            {/* In Progress (orange) - from left of fixed */}
            <div
              className="absolute inset-y-0 bg-gradient-to-l from-orange-500 to-orange-400 rounded-full transition-all duration-700 ease-out"
              style={{ right: `${(fixed / total) * 100}%`, width: `${(inProgress / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/40">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{fixed}</p>
              <p className="text-[10px] text-muted-foreground">تم الإصلاح</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/40">
            <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{inProgress}</p>
              <p className="text-[10px] text-muted-foreground">قيد التنفيذ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{openCritical}</p>
              <p className="text-[10px] text-muted-foreground">حرج مفتوح</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{openHigh}</p>
              <p className="text-[10px] text-muted-foreground">مرتفع مفتوح</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}