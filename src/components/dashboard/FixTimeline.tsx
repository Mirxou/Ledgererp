"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ArrowLeftRight, MessageSquare, Sparkles, CheckCircle2, Clock, Ban, ShieldCheck } from "lucide-react";
import type { AuditLogEntry } from "@/lib/store";
import { CARD_DEPTH } from "@/lib/audit-data";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

/* ════════════════════════════════════════════════════════════════════════════
   FIX TIMELINE
   ════════════════════════════════════════════════════════════════════════════ */

const ACTION_ICONS: Record<string, { icon: typeof History; color: string; bg: string }> = {
  status_change: { icon: ArrowLeftRight, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/40" },
  note_added: { icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/40" },
  ai_analysis: { icon: Sparkles, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/40" },
};

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد التنفيذ",
  fixed: "تم الإصلاح",
  wont_fix: "لن يُصلح",
  accepted_risk: "مخاطر مقبولة",
};

function formatTime(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ar });
  } catch {
    return dateStr;
  }
}

export function FixTimeline() {
  const { data: logs, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/issues?_t=logs");
      if (!res.ok) throw new Error("فشل");
      // We'll fetch logs via a separate mechanism
      // For now, return empty and use the issues endpoint to infer
      return [];
    },
    refetchInterval: 30000,
    retry: 1,
  });

  // Use a simpler approach - fetch from a dedicated logs endpoint
  const { data: timelineData, isLoading: tlLoading } = useQuery<{ logs: AuditLogEntry[] }>({
    queryKey: ["timeline"],
    queryFn: async () => {
      const res = await fetch("/api/issues");
      if (!res.ok) return { logs: [] };
      const data = await res.json();
      // Derive some timeline data from issues with non-open status
      const recent: AuditLogEntry[] = [];
      for (const issue of data.issues || []) {
        if (issue.status !== "open" && issue.updatedAt) {
          recent.push({
            id: issue.id,
            action: issue.status === "fixed" ? "status_change" : "status_change",
            issueId: issue.issueId,
            oldStatus: "open",
            newStatus: issue.status,
            details: `${issue.title} — ${STATUS_LABELS[issue.status] || issue.status}`,
            createdAt: issue.updatedAt,
          });
        }
      }
      return { logs: recent.sort((a: AuditLogEntry, b: AuditLogEntry) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ).slice(0, 10) };
    },
    refetchInterval: 30000,
  });

  const displayLogs = timelineData?.logs || logs || [];

  return (
    <Card className={CARD_DEPTH}>
      <CardHeader className="pb-3">
        <PiSectionHeader icon={<History className="h-4 w-4" />}>
          سجل النشاط الأخير
        </PiSectionHeader>
      </CardHeader>
      <CardContent>
        {tlLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-pulse" />
              جاري التحميل...
            </div>
          </div>
        ) : displayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">لا يوجد نشاط بعد. ابدأ بتتبع إصلاحاتك!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {displayLogs.map((log, i) => {
                const config = ACTION_ICONS[log.action] || ACTION_ICONS.status_change;
                const Icon = config.icon;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted-foreground/5 border border-border/50 animate-in fade-in-0 slide-in-from-right-4 duration-500"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-relaxed truncate">{log.details}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted-foreground/10 px-1.5 py-0.5 rounded">
                          {log.issueId}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}