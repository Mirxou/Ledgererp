"use client";

import { IssueBrief } from "@/lib/audit-data";
import { SourceBadge } from "@/components/ui/SeverityBadge";
import { PanelLeft, CheckCircle2, Sparkles } from "lucide-react";
import type { IssueWithStatus } from "@/lib/store";

/* ── Status Config ──────────────────────────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-500/15 text-red-600 dark:text-red-400",
  in_progress: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  fixed: "bg-green-500/15 text-green-600 dark:text-green-400",
  wont_fix: "bg-slate-500/15 text-slate-500 dark:text-slate-400",
  accepted_risk: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد التنفيذ",
  fixed: "تم الإصلاح",
  wont_fix: "لن يُصلح",
  accepted_risk: "مخاطر مقبولة",
};

/* ════════════════════════════════════════════════════════════════════════════
   ISSUE ROW (for High/Medium) — compact with status
   ════════════════════════════════════════════════════════════════════════════ */

export function IssueRow({
  issue,
  onClick,
  dbIssue,
  onStatusChange,
  onAiAnalysis,
}: {
  issue: IssueBrief & { severity?: string };
  onClick?: () => void;
  dbIssue?: IssueWithStatus | null;
  onStatusChange?: (issueId: string, newStatus: string) => void;
  onAiAnalysis?: (dbIssue: IssueWithStatus) => void;
}) {
  const status = dbIssue?.status || "open";

  const cycleStatus = () => {
    if (!onStatusChange || !dbIssue) return;
    const order = ["open", "in_progress", "fixed", "wont_fix", "accepted_risk"];
    const currentIdx = order.indexOf(status);
    const nextIdx = (currentIdx + 1) % order.length;
    onStatusChange(dbIssue.issueId, order[nextIdx]);
  };

  return (
    <div
      role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick?.(); }}
      className="flex items-center gap-2 sm:gap-3 py-2.5 px-2 sm:px-3 rounded-lg hover:bg-muted-foreground/5 transition-colors group cursor-pointer min-h-[44px]"
      aria-label={`مشكلة: ${issue.title}`}
    >
      <SourceBadge source={issue.source} />
      <span className="text-xs font-medium truncate flex-1 group-hover:text-foreground transition-colors">
        {issue.title}
      </span>
      <code className="text-[11px] font-mono text-muted-foreground flex-shrink-0 w-28 sm:w-36 truncate hidden sm:block text-left" dir="ltr">
        {issue.file}
      </code>

      {/* Status Badge - clickable */}
      {dbIssue && (
        <button
          onClick={(e) => { e.stopPropagation(); cycleStatus(); }}
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-all flex-shrink-0 min-h-[26px] ${STATUS_STYLES[status] || STATUS_STYLES.open}`}
          title="اضغط لتغيير الحالة"
        >
          {STATUS_LABELS[status] || "مفتوح"}
        </button>
      )}

      {/* AI Button */}
      {dbIssue && onAiAnalysis && (
        <button
          onClick={(e) => { e.stopPropagation(); onAiAnalysis(dbIssue); }}
          className="text-purple-500/60 hover:text-purple-500 transition-colors flex-shrink-0 p-1 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-md hover:bg-purple-500/10"
          title="تحليل ذكي"
        >
          <Sparkles className="h-3 w-3" />
        </button>
      )}

      <PanelLeft className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
    </div>
  );
}