"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileDown,
  Share2,
  RefreshCw,
  Plus,
  Loader2,
} from "lucide-react";
import { useIssueStore, type IssueWithStatus } from "@/lib/store";
import { toast } from "sonner";

/* ════════════════════════════════════════════════════════════════════════════
   QUICK ACTIONS FAB
   Floating action button with quick actions for common tasks.
   ════════════════════════════════════════════════════════════════════════════ */

interface QuickActionsProps {
  onQuickAiAnalysis?: (issue: IssueWithStatus) => void;
  onRefresh?: () => void;
}

export function QuickActions({ onQuickAiAnalysis, onRefresh }: QuickActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { issues } = useIssueStore();

  const handleQuickAi = () => {
    const criticalOpen = issues.find(
      (i) => i.severity === "CRITICAL" && i.status === "open"
    );
    if (criticalOpen) {
      onQuickAiAnalysis?.(criticalOpen);
    } else {
      toast.info("لا توجد مشاكل حرجة مفتوحة للتحليل");
    }
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pdf", filters: {} }),
      });
      if (!res.ok) throw new Error();
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("تم فتح التقرير في نافذة جديدة — اضغط Ctrl+P للحفظ كـ PDF");
    } catch {
      toast.error("فشل في إنشاء التقرير");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: "تقرير التدقيق الأمني — Ledgererp",
        text: "تقرير أمني شامل لمشروع Ledgererp على Pi Network",
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("تم نسخ رابط المشاركة");
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-14 w-14 rounded-full pi-gradient text-white border-0 shadow-xl shadow-purple-900/40 hover:shadow-2xl hover:shadow-purple-900/50 hover:-translate-y-1 transition-all duration-300 group"
            size="icon"
            aria-label="إجراءات سريعة"
          >
            <span className="absolute inset-0 rounded-full pi-gradient animate-ping opacity-20" />
            <Plus className="h-6 w-6 transition-transform duration-300 group-hover:rotate-45" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-56 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
        >
          <DropdownMenuItem
            onClick={handleQuickAi}
            className="gap-3 cursor-pointer py-2.5"
          >
            <Sparkles className="h-4 w-4 text-purple-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">تحليل ذكي سريع</span>
              <span className="text-[10px] text-muted-foreground">
                أول مشكلة حرجة مفتوحة
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handlePdfExport}
            disabled={isExporting}
            className="gap-3 cursor-pointer py-2.5"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 text-emerald-500" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium">تقرير PDF</span>
              <span className="text-[10px] text-muted-foreground">
                تصدير التقرير الكامل
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleShare}
            className="gap-3 cursor-pointer py-2.5"
          >
            <Share2 className="h-4 w-4 text-sky-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">مشاركة التقرير</span>
              <span className="text-[10px] text-muted-foreground">
                نسخ الرابط أو مشاركته
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRefresh?.()}
            className="gap-3 cursor-pointer py-2.5"
          >
            <RefreshCw className="h-4 w-4 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">تحديث البيانات</span>
              <span className="text-[10px] text-muted-foreground">
                إعادة تحميل كل البيانات
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}