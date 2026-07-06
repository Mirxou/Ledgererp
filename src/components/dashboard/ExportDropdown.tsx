"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileSpreadsheet, ClipboardList, Check } from "lucide-react";
import { AuditReport } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   EXPORT DROPDOWN
   ════════════════════════════════════════════════════════════════════════════ */

export function ExportDropdown({
  report,
  copied,
  onExport,
}: {
  report: AuditReport;
  copied: boolean;
  onExport: (format: "json" | "csv" | "clipboard") => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">تصدير</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport("json")}>
          <FileJson className="h-4 w-4 ml-2" />تصدير JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("csv")}>
          <FileSpreadsheet className="h-4 w-4 ml-2" />تصدير CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("clipboard")}>
          {copied ? <Check className="h-4 w-4 ml-2" /> : <ClipboardList className="h-4 w-4 ml-2" />}
          {copied ? "تم النسخ!" : "نسخ إلى الحافظة"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}