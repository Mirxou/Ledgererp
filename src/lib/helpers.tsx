"use client";

import React from "react";
import {
  Clock, Shield, Truck, CheckCircle2, FileCheck,
  AlertTriangle, Ban, Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

/* ═══ Status Map ═══ */
export const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:      { label: "في الانتظار",  color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",      icon: Clock },
  paid_escrow:  { label: "في الضمان",    color: "bg-blue-500/15 text-blue-600 border-blue-500/30",           icon: Shield },
  shipped:      { label: "تم الشحن",     color: "bg-purple-500/15 text-purple-600 border-purple-500/30",     icon: Truck },
  delivered:    { label: "تم التسليم",   color: "bg-teal-500/15 text-teal-600 border-teal-500/30",           icon: CheckCircle2 },
  completed:    { label: "مكتمل",        color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: FileCheck },
  releasing:    { label: "جارٍ الإطلاق", color: "bg-amber-500/15 text-amber-600 border-amber-500/30",       icon: Wallet },
  disputed:     { label: "نزاع",         color: "bg-red-500/15 text-red-600 border-red-500/30",              icon: AlertTriangle },
  cancelled:    { label: "ملغى",         color: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",           icon: Ban },
};

/* ═══ StatusBadge ═══ */
export const StatusBadge = React.memo(function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={s.color + " gap-1 font-medium text-[10px]"}>
      <Icon className="h-3 w-3" />{s.label}
    </Badge>
  );
});

/* ═══ Date/Time Formatters ═══ */
export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-DZ", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtTime(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
}

/* ═══ Copy Text ═══ */
export function copyText(text: string, toast: ReturnType<typeof useToast>["toast"], label?: string) {
  navigator.clipboard.writeText(text).then(function() {
    toast({ title: label || "تم النسخ" });
  }).catch(function() {
    toast({ title: "فشل النسخ", variant: "destructive" });
  });
}
