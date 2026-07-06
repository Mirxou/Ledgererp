"use client";

import { Badge } from "@/components/ui/badge";
import { XCircle, AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   SEVERITY BADGE
   ════════════════════════════════════════════════════════════════════════════ */

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    CRITICAL: {
      cls: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400 dark:border-red-500/40",
      icon: <XCircle className="h-3 w-3" />,
      label: "حرج",
    },
    HIGH: {
      cls: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:border-orange-500/40",
      icon: <AlertTriangle className="h-3 w-3" />,
      label: "مرتفع",
    },
    MEDIUM: {
      cls: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/40",
      icon: <ShieldAlert className="h-3 w-3" />,
      label: "متوسط",
    },
    LOW: {
      cls: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400 dark:border-sky-500/40",
      icon: <ShieldCheck className="h-3 w-3" />,
      label: "منخفض",
    },
  };
  const v = map[severity] || map.LOW;
  return (
    <Badge variant="outline" className={`${v.cls} gap-1 text-[10px] font-semibold px-2 py-0.5`}>
      {v.icon}{v.label}
    </Badge>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SOURCE BADGE
   ════════════════════════════════════════════════════════════════════════════ */

export function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = { Backend: "الخادم", Frontend: "الواجهة", "Pi Network": "شبكة بي" };
  const c: Record<string, string> = {
    Backend: "bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400",
    Frontend: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400",
    "Pi Network": "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
  };
  return (
    <Badge variant="outline" className={`${c[source] || ""} text-[10px] font-semibold px-2 py-0.5`}>
      {labels[source] || source}
    </Badge>
  );
}