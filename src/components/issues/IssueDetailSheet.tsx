"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { AlertTriangle, CheckCircle2, ExternalLink, Github } from "lucide-react";
import { Issue, CARD_DEPTH } from "@/lib/audit-data";
import { SeverityBadge, SourceBadge } from "@/components/ui/SeverityBadge";

/* ════════════════════════════════════════════════════════════════════════════
   ISSUE DETAIL SHEET
   ════════════════════════════════════════════════════════════════════════════ */

export function IssueDetailSheet({
  issue,
  open,
  onOpenChange,
  repoUrl,
  severity = "CRITICAL",
  isBrief = false,
}: {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  repoUrl: string;
  severity?: string;
  isBrief?: boolean;
}) {
  if (!issue) return null;
  const sev = severity.toUpperCase();
  const sevColor: Record<string, string> = {
    CRITICAL: "text-red-500",
    HIGH: "text-orange-500",
    MEDIUM: "text-amber-500",
    LOW: "text-sky-500",
  };
  const githubUrl = `${repoUrl.replace(/\/?$/, "")}/blob/main/${issue.file}${issue.line > 0 ? `#L${issue.line}` : ""}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto dark:bg-gradient-to-b dark:from-[oklch(0.20_0_0)] dark:to-[oklch(0.16_0_0)]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base leading-snug pr-8">{issue.title}</SheetTitle>
          <SheetDescription className="sr-only">تفاصيل المشكلة {issue.id}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={sev} />
            <SourceBadge source={issue.source} />
            <Badge variant="outline" className="text-[10px] font-medium bg-muted-foreground/10">{issue.category}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted-foreground/5 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">رقم المشكلة</p>
              <p className="text-sm font-mono font-semibold">{issue.id}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted-foreground/5 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">الخطورة</p>
              <p className={`text-sm font-semibold ${sevColor[sev] || "text-red-500"}`}>{sev}</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-muted-foreground/5 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">المصدر</p>
              <p className="text-sm font-semibold">{issue.source}</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-muted-foreground/5 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">الملف</p>
              <p className="text-sm font-mono break-all">{issue.file}{issue.line > 0 ? ` : ${issue.line}` : ""}</p>
            </div>
          </div>
          <Separator />
          {isBrief ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />تفاصيل محدودة
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                الوصف والتوصية الكاملة متاحان في التقرير المُصدَّر. استخدم خيار تصدير JSON أو CSV للحصول على بيانات التدقيق الكاملة.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">الوصف</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />التوصية
                </h4>
                <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">{issue.recommendation}</p>
              </div>
              <Separator />
              <a
                href={githubUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors min-h-[44px] py-2"
                aria-label={`عرض ${issue.file} على GitHub`}
              >
                <Github className="h-4 w-4" />
                عرض على GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}