"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Sparkles, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import type { IssueWithStatus } from "@/lib/store";

/* ════════════════════════════════════════════════════════════════════════════
   AI ANALYSIS DIALOG
   ════════════════════════════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof ShieldAlert }> = {
  "حرج": { label: "خطر حرج", color: "text-red-500", bg: "bg-red-500", icon: ShieldAlert },
  "مرتفع": { label: "خطر مرتفع", color: "text-orange-500", bg: "bg-orange-500", icon: AlertTriangle },
  "متوسط": { label: "خطر متوسط", color: "text-amber-500", bg: "bg-amber-500", icon: Info },
  "منخفض": { label: "خطر منخفض", color: "text-sky-500", bg: "bg-sky-500", icon: Info },
  "غير محدد": { label: "غير محدد", color: "text-muted-foreground", bg: "bg-muted-foreground", icon: Info },
};

export function AiAnalysisDialog({
  issue,
  open,
  onOpenChange,
}: {
  issue: IssueWithStatus | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState("متوسط");
  const [suggestedFix, setSuggestedFix] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!issue) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: issue.issueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحليل");
      setAnalysis(data.analysis);
      setRiskLevel(data.riskLevel || "متوسط");
      setSuggestedFix(data.suggestedFix || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setAnalysis(null);
      setError(null);
      setRiskLevel("متوسط");
      setSuggestedFix("");
    }
    onOpenChange(v);
  };

  const riskConfig = STATUS_CONFIG[riskLevel] || STATUS_CONFIG["متوسط"];
  const RiskIcon = riskConfig.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col dark:bg-gradient-to-b dark:from-[oklch(0.20_0_0)] dark:to-[oklch(0.16_0_0)]">
        <DialogHeader className="pb-3 flex-shrink-0">
          <DialogTitle className="text-base flex items-center gap-2 pr-8">
            <Sparkles className="h-4 w-4 text-purple-500" />
            تحليل ذكي — {issue?.issueId}
          </DialogTitle>
          <DialogDescription className="sr-only">تحليل ذكي بالذكاء الاصطناعي</DialogDescription>
        </DialogHeader>

        {/* Issue Summary */}
        {issue && (
          <div className="flex-shrink-0 p-3 rounded-xl bg-muted-foreground/5 border border-border/50 text-xs space-y-1">
            <p className="font-semibold text-sm">{issue.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{issue.severity}</Badge>
              <Badge variant="outline" className="text-[10px]">{issue.source}</Badge>
              <code className="font-mono text-muted-foreground" dir="ltr">{issue.file}</code>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0">
          {!analysis && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                اضغط على الزر أدناه لبدء التحليل الذكي بالذكاء الاصطناعي
              </p>
              <Button
                onClick={handleAnalyze}
                className="gap-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white"
              >
                <Sparkles className="h-4 w-4" />
                بدء التحليل الذكي
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center animate-pulse">
                <Sparkles className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                جاري التحليل بالذكاء الاصطناعي
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-sm text-red-500 text-center">{error}</p>
              <Button variant="outline" onClick={handleAnalyze} className="gap-2">
                <Sparkles className="h-4 w-4" />
                إعادة المحاولة
              </Button>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Risk Level Bar */}
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${riskConfig.bg}`} />
                <div className="flex items-center gap-2">
                  <RiskIcon className={`h-4 w-4 ${riskConfig.color}`} />
                  <span className={`text-sm font-bold ${riskConfig.color}`}>{riskConfig.label}</span>
                </div>
              </div>

              {/* Analysis Text */}
              <ScrollArea className="max-h-[50vh]">
                <div className="p-4 rounded-xl bg-muted-foreground/5 border border-border/50">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {analysis}
                  </div>
                </div>
              </ScrollArea>

              {/* Suggested Fix */}
              {suggestedFix && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">الحل المقترح</p>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">{suggestedFix}</p>
                </div>
              )}

              {/* Copy Button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "تم النسخ" : "نسخ التحليل"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}