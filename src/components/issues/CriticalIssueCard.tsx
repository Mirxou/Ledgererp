"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Code2, CheckCircle2, Sparkles } from "lucide-react";
import { Issue, CARD_DEPTH } from "@/lib/audit-data";
import type { IssueWithStatus } from "@/lib/store";
import { SeverityBadge, SourceBadge } from "@/components/ui/SeverityBadge";

/* ── Status Config ──────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: "open", label: "مفتوح", color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  { value: "in_progress", label: "قيد التنفيذ", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  { value: "fixed", label: "تم الإصلاح", color: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30" },
  { value: "wont_fix", label: "لن يُصلح", color: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" },
  { value: "accepted_risk", label: "مخاطر مقبولة", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
] as const;

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

/* ════════════════════════════════════════════════════════════════════════════
   CRITICAL ISSUE CARD (with Status Management)
   ════════════════════════════════════════════════════════════════════════════ */

export function CriticalIssueCard({
  issue,
  index,
  onSelect,
  dbIssue,
  onStatusChange,
  onAiAnalysis,
}: {
  issue: Issue;
  index: number;
  onSelect: (issue: Issue) => void;
  dbIssue?: IssueWithStatus | null;
  onStatusChange?: (issueId: string, newStatus: string) => void;
  onAiAnalysis?: (dbIssue: IssueWithStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const isBlocking = index < 7;

  const currentStatus = dbIssue?.status || "open";
  const statusStyle = getStatusStyle(currentStatus);

  const handleStatusChange = (newStatus: string) => {
    setStatusMenuOpen(false);
    if (onStatusChange && dbIssue) {
      onStatusChange(dbIssue.issueId, newStatus);
    }
  };

  return (
    <div
      role="button" tabIndex={0}
      aria-label={`مشكلة حرجة ${index + 1}: ${issue.title}`}
      onClick={() => onSelect(issue)}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(issue); }}
      className={`border rounded-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
        isBlocking
          ? "border-red-200 bg-gradient-to-br from-red-50/80 to-white dark:from-red-950/30 dark:to-red-950/10 dark:border-red-900/50"
          : "border-orange-200 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-orange-950/5 dark:border-orange-900/40"
      } ${CARD_DEPTH}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
            isBlocking
              ? "bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300"
              : "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300"
          }`}>
            {index + 1}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {/* Header row: badges + status + AI button */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <SeverityBadge severity="CRITICAL" />
            <SourceBadge source={issue.source} />
            <Badge variant="outline" className="text-[10px] font-medium bg-muted-foreground/10">{issue.category}</Badge>
            {isBlocking && (
              <Badge className="bg-red-600 text-white text-[10px] px-2 py-0 animate-pulse">يعطل النشر</Badge>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setStatusMenuOpen(!statusMenuOpen); }}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors min-h-[28px] ${statusStyle.color}`}
                aria-label="تغيير الحالة"
              >
                {statusStyle.label}
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
              {statusMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-20 bg-popover border rounded-lg shadow-lg py-1 min-w-[140px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      className={`w-full text-right text-xs px-3 py-2 hover:bg-muted-foreground/5 transition-colors flex items-center justify-between ${
                        currentStatus === opt.value ? "font-bold" : ""
                      }`}
                    >
                      {opt.label}
                      {currentStatus === opt.value && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Analysis Button */}
            {dbIssue && onAiAnalysis && (
              <button
                onClick={(e) => { e.stopPropagation(); onAiAnalysis(dbIssue); }}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors min-h-[28px]"
                aria-label="تحليل ذكي"
              >
                <Sparkles className="h-3 w-3" />
                تحليل ذكي
              </button>
            )}
          </div>

          <h4 className="font-semibold text-sm mb-1.5 leading-snug">{issue.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2.5">
            <Code2 className="h-3 w-3 flex-shrink-0" />
            <code className="text-xs font-mono break-all">{issue.file}</code>
            {issue.line > 0 && <span className="text-muted-foreground/60">سطر {issue.line}</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{issue.description}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-xs text-primary hover:text-primary/80 hover:underline flex items-center gap-1 transition-colors min-h-[44px] py-1"
            aria-label={expanded ? "إخفاء التوصية" : "عرض التوصية"}
          >
            {expanded
              ? <>إخفاء التوصية <ChevronUp className="h-3 w-3" /></>
              : <>عرض التوصية <ChevronDown className="h-3 w-3" /></>}
          </button>
          {expanded && (
            <div className="mt-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {issue.recommendation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}