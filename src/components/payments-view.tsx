"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote, CircleDot, DollarSign, RotateCcw, TrendingDown,
  Plus, Search, Loader2, CheckCircle2, XCircle, Clock, Shield,
  ArrowLeft, ArrowRight, Wallet, ChevronLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPi, roundPi } from "@/lib/pi-amount";
import { fmtDate, fmtTime } from "@/lib/helpers";
import type { TransactionLogData } from "@/lib/types";

/* ═══ Types ═══ */

interface PaymentsViewProps {
  storeId: string;
  piUid: string;
}

type TxType = "cash" | "pi" | "ousd" | "refund" | "expense";
type TxStatus = "pending" | "approved" | "completed" | "failed";
type Currency = "Pi" | "USD" | "OUSD";

/* ═══ Constants ═══ */

const TX_TYPES: { value: TxType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "cash", label: "نقدي", icon: Banknote, color: "text-emerald-600" },
  { value: "pi", label: "Pi", icon: CircleDot, color: "text-violet-600" },
  { value: "ousd", label: "OUSD", icon: DollarSign, color: "text-sky-600" },
  { value: "refund", label: "استرجاع", icon: RotateCcw, color: "text-orange-600" },
  { value: "expense", label: "مصروف", icon: TrendingDown, color: "text-red-600" },
];

const TX_STATUSES: { value: TxStatus; label: string; color: string; icon: React.ElementType }[] = [
  { value: "pending", label: "في الانتظار", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", icon: Clock },
  { value: "approved", label: "تمت الموافقة", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: Shield },
  { value: "completed", label: "مكتمل", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  { value: "failed", label: "فشل", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "Pi", label: "Pi" },
  { value: "USD", label: "USD" },
  { value: "OUSD", label: "OUSD" },
];

/* ═══ Helpers ═══ */

/** Extract status from reference field (convention: "pending:xxx", "approved:xxx", etc.) */
function getTxStatus(reference: string): TxStatus {
  if (reference.startsWith("pending:")) return "pending";
  if (reference.startsWith("approved:")) return "approved";
  if (reference.startsWith("completed:")) return "completed";
  if (reference.startsWith("failed:")) return "failed";
  return "completed"; // default for old entries without status prefix
}

/** Extract the actual reference value after the status prefix */
function getRefValue(reference: string): string {
  const colonIdx = reference.indexOf(":");
  if (colonIdx === -1) return reference;
  const prefix = reference.substring(0, colonIdx);
  if (["pending", "approved", "completed", "failed"].includes(prefix)) {
    return reference.substring(colonIdx + 1);
  }
  return reference;
}

function getTypeInfo(type: string) {
  return TX_TYPES.find(function(t) { return t.value === type; }) || TX_TYPES[0];
}

function getStatusInfo(status: string) {
  return TX_STATUSES.find(function(s) { return s.value === status; }) || TX_STATUSES[0];
}

function getCurrencySymbol(currency: string): string {
  if (currency === "Pi") return "π";
  if (currency === "OUSD") return "O$";
  return "$";
}

/* ═══ Status Badge ═══ */
const TxStatusBadge = React.memo(function TxStatusBadge({ status }: { status: string }) {
  const s = getStatusInfo(status);
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={s.color + " gap-1 font-medium text-[10px]"}>
      <Icon className="h-3 w-3" />{s.label}
    </Badge>
  );
});

/* ═══ Type Icon ═══ */
const TxTypeIcon = React.memo(function TxTypeIcon({ type }: { type: string }) {
  const t = getTypeInfo(type);
  const Icon = t.icon;
  return (
    <div className={"w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0"}>
      <Icon className={"h-4 w-4 " + t.color} />
    </div>
  );
});

/* ═══ Payment Flow Visualization ═══ */
function PaymentFlowViz({ transactions }: { transactions: TransactionLogData[] }) {
  // Count transactions per status
  const statusCounts = useMemo(function() {
    const counts: Record<TxStatus, number> = { pending: 0, approved: 0, completed: 0, failed: 0 };
    for (let i = 0; i < transactions.length; i++) {
      const status = getTxStatus(transactions[i].reference);
      counts[status]++;
    }
    return counts;
  }, [transactions]);

  const flowSteps = [
    { key: "created", label: "تم الإنشاء", icon: Wallet, color: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30", count: transactions.length, ringColor: "ring-zinc-400" },
    { key: "pending", label: "في الانتظار", icon: Clock, color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30", count: statusCounts.pending, ringColor: "ring-yellow-400" },
    { key: "approved", label: "تمت الموافقة", icon: Shield, color: "bg-blue-500/15 text-blue-600 border-blue-500/30", count: statusCounts.approved, ringColor: "ring-blue-400" },
    { key: "completed", label: "مكتمل", icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", count: statusCounts.completed, ringColor: "ring-emerald-400" },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-3.5 px-4">
        <CardTitle className="text-xs font-bold">مسار تدفق الدفع — Pi / OUSD</CardTitle>
      </CardHeader>
      <CardContent className="pb-3.5 px-4">
        {/* Flow diagram — horizontal on sm+, vertical on mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
          {flowSteps.map(function(step, idx) {
            const Icon = step.icon;
            const isActive = step.count > 0;
            return (
              <React.Fragment key={step.key}>
                {/* Arrow between steps */}
                {idx > 0 && (
                  <div className="hidden sm:flex items-center justify-center px-1 shrink-0">
                    <ArrowLeft className={"h-4 w-4 " + (isActive ? "text-emerald-500" : "text-muted-foreground/30")} />
                  </div>
                )}
                {idx > 0 && (
                  <div className="sm:hidden flex items-center justify-center py-0.5 shrink-0 mr-auto ml-4">
                    <ChevronLeft className={"h-3.5 w-3.5 rotate-90 " + (isActive ? "text-emerald-500" : "text-muted-foreground/30")} />
                  </div>
                )}
                {/* Step node */}
                <div className={
                  "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all flex-1 " +
                  (isActive
                    ? step.color + " " + step.ringColor + " ring-1"
                    : "bg-muted/20 text-muted-foreground/50 border-muted/30")
                }>
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium truncate">{step.label}</p>
                    <p className="text-xs font-bold">{step.count}</p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Failed branch */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 border-t border-dashed border-red-300/50" />
          <div className={
            "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all " +
            (statusCounts.failed > 0
              ? "bg-red-500/15 text-red-600 border-red-500/30 ring-1 ring-red-400"
              : "bg-muted/20 text-muted-foreground/50 border-muted/30")
          }>
            <XCircle className="h-4 w-4 shrink-0" />
            <div>
              <p className="text-[10px] font-medium">فشل</p>
              <p className="text-xs font-bold">{statusCounts.failed}</p>
            </div>
          </div>
        </div>

        {/* Real-time Pi payment status summary */}
        {transactions.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">Pi</p>
              <p className="text-xs font-bold">{transactions.filter(function(t) { return t.type === "pi"; }).length}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">OUSD</p>
              <p className="text-xs font-bold">{transactions.filter(function(t) { return t.type === "ousd"; }).length}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">نقدي</p>
              <p className="text-xs font-bold">{transactions.filter(function(t) { return t.type === "cash"; }).length}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <p className="text-[10px] text-muted-foreground">استرجاع</p>
              <p className="text-xs font-bold">{transactions.filter(function(t) { return t.type === "refund"; }).length}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══ Main Component ═══ */
export function PaymentsView({ storeId, piUid }: PaymentsViewProps) {
  const qc = useQueryClient();
  const toast = useToast().toast;

  /* ── Local State ── */
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form
  const [formType, setFormType] = useState<TxType>("cash");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState<Currency>("Pi");
  const [formDescription, setFormDescription] = useState("");
  const [formReference, setFormReference] = useState("");

  /* ── Queries ── */
  const txRes = useQuery({
    queryKey: ["transaction-logs", storeId],
    queryFn: function() {
      return api.get("/api/transaction-logs?storeId=" + storeId + "&limit=200", piUid)
        .then(function(r) { return r.json(); });
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const transactions = ((txRes.data as Record<string, unknown>)?.data || []) as TransactionLogData[];

  const statsRes = useQuery({
    queryKey: ["transaction-logs-stats", storeId],
    queryFn: function() {
      return api.get("/api/transaction-logs?storeId=" + storeId + "&stats=true", piUid)
        .then(function(r) { return r.json(); });
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const stats = (statsRes.data as Record<string, unknown>) || {};

  /* ── Derived Data ── */
  const pendingCount = useMemo(function() {
    return transactions.filter(function(t) { return getTxStatus(t.reference) === "pending"; }).length;
  }, [transactions]);

  const approvedCount = useMemo(function() {
    return transactions.filter(function(t) { return getTxStatus(t.reference) === "approved"; }).length;
  }, [transactions]);

  const completedCount = useMemo(function() {
    return transactions.filter(function(t) { return getTxStatus(t.reference) === "completed"; }).length;
  }, [transactions]);

  const failedCount = useMemo(function() {
    return transactions.filter(function(t) { return getTxStatus(t.reference) === "failed"; }).length;
  }, [transactions]);

  const refundTotal = useMemo(function() {
    return roundPi(
      transactions
        .filter(function(t) { return t.type === "refund"; })
        .reduce(function(s, t) { return s + t.amount; }, 0)
    );
  }, [transactions]);

  const totalRevenue = useMemo(function() {
    const byType = stats.totalByType as Record<string, number> | undefined;
    if (!byType) return 0;
    return roundPi(
      (byType.cash || 0) + (byType.pi || 0) + (byType.ousd || 0)
    );
  }, [stats]);

  /* ── Filtering ── */
  const filtered = useMemo(function() {
    let result = transactions;

    if (typeFilter !== "all") {
      result = result.filter(function(t) { return t.type === typeFilter; });
    }

    if (statusFilter !== "all") {
      result = result.filter(function(t) { return getTxStatus(t.reference) === statusFilter; });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(function(t) {
        return t.description.toLowerCase().includes(q) ||
               t.reference.toLowerCase().includes(q) ||
               t.type.toLowerCase().includes(q) ||
               t.currency.toLowerCase().includes(q);
      });
    }

    return result;
  }, [transactions, typeFilter, statusFilter, searchQuery]);

  /* ── Mutations / Actions ── */
  const invalidateAll = function() {
    qc.invalidateQueries({ queryKey: ["transaction-logs", storeId] });
    qc.invalidateQueries({ queryKey: ["transaction-logs-stats", storeId] });
  };

  const handleStatusUpdate = function(id: string, newStatus: string) {
    setActionLoading(id);
    api.put("/api/transaction-logs", { id: id, status: newStatus }, piUid).then(function(res) {
      if (res.ok) {
        invalidateAll();
        const statusLabel = getStatusInfo(newStatus).label;
        toast({ title: "تم تحديث الحالة: " + statusLabel });
      } else {
        res.json().catch(function() { return {}; }).then(function(err) {
          toast({ title: "فشل التحديث", description: (err as Record<string, unknown>).error as string || "", variant: "destructive" });
        });
      }
    }).catch(function() {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }).finally(function() {
      setActionLoading(null);
    });
  };

  const handleCreate = function() {
    if (!formAmount || parseFloat(formAmount) <= 0) {
      toast({ title: "أدخل مبلغ صحيح", variant: "destructive" });
      return;
    }
    setSaving(true);
    api.post("/api/transaction-logs", {
      storeId: storeId,
      type: formType,
      amount: parseFloat(formAmount),
      currency: formCurrency,
      description: formDescription.trim(),
      reference: formReference.trim(),
    }, piUid).then(function(res) {
      if (res.ok) {
        invalidateAll();
        setCreateOpen(false);
        // Reset form
        setFormType("cash");
        setFormAmount("");
        setFormCurrency("Pi");
        setFormDescription("");
        setFormReference("");
        toast({ title: "تم إنشاء المعاملة" });
      } else {
        res.json().catch(function() { return {}; }).then(function(err) {
          toast({ title: "فشل الإنشاء", description: (err as Record<string, unknown>).error as string || "", variant: "destructive" });
        });
      }
    }).catch(function() {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    }).finally(function() {
      setSaving(false);
    });
  };

  /* ── Loading / Error ── */
  if (txRes.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map(function(_, i) {
            return <Skeleton key={i} className="h-20 rounded-xl" />;
          })}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (txRes.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <XCircle className="h-12 w-12 text-red-400/50 mb-3" />
        <p className="text-sm font-medium text-red-500">خطأ في تحميل المعاملات</p>
        <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={function() { invalidateAll(); }}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  /* ═══ Render ═══ */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-base">المعاملات المالية</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0">
              <Plus className="h-3.5 w-3.5 ml-1.5" />معاملة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm">إنشاء معاملة</DialogTitle>
              <DialogDescription className="text-xs">سجّل معاملة مالية جديدة</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">النوع *</Label>
                <Select value={formType} onValueChange={function(v) { setFormType(v as TxType); }}>
                  <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TX_TYPES.map(function(t) {
                      const Icon = t.icon;
                      return (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          <span className="inline-flex items-center gap-1.5"><Icon className={"h-3.5 w-3.5 " + t.color} />{t.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">المبلغ *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={formAmount}
                    onChange={function(e) { setFormAmount(e.target.value); }}
                    placeholder="0.00"
                    className="text-sm"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">العملة *</Label>
                  <Select value={formCurrency} onValueChange={function(v) { setFormCurrency(v as Currency); }}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(function(c) {
                        return <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs">الوصف</Label>
                <Input
                  value={formDescription}
                  onChange={function(e) { setFormDescription(e.target.value); }}
                  placeholder="وصف المعاملة..."
                  className="text-sm"
                />
              </div>
              {/* Reference */}
              <div className="space-y-1.5">
                <Label className="text-xs">المرجع</Label>
                <Input
                  value={formReference}
                  onChange={function(e) { setFormReference(e.target.value); }}
                  placeholder="رقم المرجع أو الإيصال"
                  className="text-sm"
                  dir="ltr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!formAmount || parseFloat(formAmount) <= 0 || saving}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs: Overview | Transactions | Create | Flow */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full h-auto p-1 bg-muted/50 grid grid-cols-4">
          <TabsTrigger value="overview" className="text-[11px] py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-[11px] py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            المعاملات
          </TabsTrigger>
          <TabsTrigger value="create" className="text-[11px] py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            إنشاء
          </TabsTrigger>
          <TabsTrigger value="flow" className="text-[11px] py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            مسار الدفع
          </TabsTrigger>
        </TabsList>

        {/* ═══ 1. Overview Tab ═══ */}
        <TabsContent value="overview" className="space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Revenue */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">إجمالي الإيرادات</p>
                  <p className="font-bold text-sm">{formatPi(totalRevenue)} π</p>
                </div>
              </CardContent>
            </Card>

            {/* Pending */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">في الانتظار</p>
                  <p className="font-bold text-sm">{pendingCount}</p>
                </div>
              </CardContent>
            </Card>

            {/* Completed */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">مكتملة</p>
                  <p className="font-bold text-sm">{completedCount}</p>
                </div>
              </CardContent>
            </Card>

            {/* Refund Total */}
            <Card className="border-0 shadow-sm col-span-2 sm:col-span-1">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <RotateCcw className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">إجمالي الاسترجاع</p>
                  <p className="font-bold text-sm">{formatPi(refundTotal)} π</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Type */}
          {stats.totalByType && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3.5 px-4">
                <CardTitle className="text-xs font-bold">الإيرادات حسب نوع الدفع</CardTitle>
              </CardHeader>
              <CardContent className="pb-3.5 px-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {TX_TYPES.map(function(t) {
                    const amount = Number((stats.totalByType as Record<string, unknown>)[t.value] || 0);
                    const Icon = t.icon;
                    return (
                      <div key={t.value} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                        <Icon className={"h-4 w-4 shrink-0 " + t.color} />
                        <div>
                          <p className="text-[10px] text-muted-foreground">{t.label}</p>
                          <p className="text-xs font-bold">{formatPi(amount)} π</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue by Currency */}
          {stats.totalByCurrency && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3.5 px-4">
                <CardTitle className="text-xs font-bold">الإيرادات حسب العملة</CardTitle>
              </CardHeader>
              <CardContent className="pb-3.5 px-4">
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.map(function(c) {
                    const amount = Number((stats.totalByCurrency as Record<string, unknown>)[c.value] || 0);
                    return (
                      <div key={c.value} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                        <span className="text-sm font-bold text-muted-foreground">{getCurrencySymbol(c.value)}</span>
                        <div>
                          <p className="text-[10px] text-muted-foreground">{c.label}</p>
                          <p className="text-xs font-bold">{formatPi(amount)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Breakdown */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-3.5 px-4">
              <CardTitle className="text-xs font-bold">توزيع الحالات</CardTitle>
            </CardHeader>
            <CardContent className="pb-3.5 px-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/10">
                  <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-yellow-600">في الانتظار</p>
                    <p className="text-xs font-bold">{pendingCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10">
                  <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-600">تمت الموافقة</p>
                    <p className="text-xs font-bold">{approvedCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-emerald-600">مكتملة</p>
                    <p className="text-xs font-bold">{completedCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-red-600">فشل</p>
                    <p className="text-xs font-bold">{failedCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent transactions (quick preview) */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-3.5 px-4">
              <CardTitle className="text-xs font-bold">آخر المعاملات</CardTitle>
            </CardHeader>
            <CardContent className="pb-3.5 px-4">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Wallet className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">لا توجد معاملات بعد</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.slice(0, 5).map(function(tx) {
                    const txStatus = getTxStatus(tx.reference);
                    return (
                      <div key={tx.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <TxTypeIcon type={tx.type} />
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate">{tx.description || "—"}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <TxStatusBadge status={txStatus} />
                              <span>{fmtDate(tx.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-left" dir="ltr">
                          <span className={"font-bold text-xs " + (tx.type === "refund" || tx.type === "expense" ? "text-red-500" : "text-emerald-600")}>
                            {tx.type === "refund" || tx.type === "expense" ? "-" : "+"}{formatPi(tx.amount)} {getCurrencySymbol(tx.currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ 2. Transactions Tab ═══ */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={function(e) { setSearchQuery(e.target.value); }}
                placeholder="بحث بالوصف أو المرجع..."
                className="text-xs h-9 pr-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 text-xs h-9"><SelectValue placeholder="جميع الأنواع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">جميع الأنواع</SelectItem>
                {TX_TYPES.map(function(t) {
                  return <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 text-xs h-9"><SelectValue placeholder="جميع الحالات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">جميع الحالات</SelectItem>
                {TX_STATUSES.map(function(s) {
                  return <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction List */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {transactions.length === 0 ? "لا توجد معاملات" : "لا توجد نتائج مطابقة"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {transactions.length === 0 ? "سجّل أول معاملة مالية" : "جرّب تغيير عوامل التصفية"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {filtered.map(function(tx) {
                const txStatus = getTxStatus(tx.reference);
                const refValue = getRefValue(tx.reference);
                const isActing = actionLoading === tx.id;

                return (
                  <Card key={tx.id} className="border-0 shadow-sm">
                    <CardContent className="p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: icon + info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <TxTypeIcon type={tx.type} />
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate">{tx.description || "—"}</p>
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground mt-0.5">
                              <TxStatusBadge status={txStatus} />
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                {getTypeInfo(tx.type).label}
                              </Badge>
                              {refValue && (
                                <span className="truncate max-w-[100px]" dir="ltr">#{refValue}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: amount + date + actions */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="text-left" dir="ltr">
                            <span className={"font-bold text-xs " + (tx.type === "refund" || tx.type === "expense" ? "text-red-500" : "text-emerald-600")}>
                              {tx.type === "refund" || tx.type === "expense" ? "-" : "+"}{formatPi(tx.amount)} {getCurrencySymbol(tx.currency)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDate(tx.createdAt)} {fmtTime(tx.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-muted/50">
                        {txStatus === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2.5 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            disabled={isActing}
                            onClick={function() { handleStatusUpdate(tx.id, "approved"); }}
                          >
                            {isActing ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Shield className="h-3 w-3 ml-1" />}
                            موافقة
                          </Button>
                        )}
                        {txStatus === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            disabled={isActing}
                            onClick={function() { handleStatusUpdate(tx.id, "completed"); }}
                          >
                            {isActing ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <CheckCircle2 className="h-3 w-3 ml-1" />}
                            إكمال
                          </Button>
                        )}
                        {(txStatus === "pending" || txStatus === "approved") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2.5 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                            disabled={isActing}
                            onClick={function() { handleStatusUpdate(tx.id, "failed"); }}
                          >
                            {isActing ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <XCircle className="h-3 w-3 ml-1" />}
                            فشل
                          </Button>
                        )}
                        {txStatus === "completed" && (
                          <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />مكتمل
                          </span>
                        )}
                        {txStatus === "failed" && (
                          <span className="text-[10px] text-red-500 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />فاشل
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Count */}
          <p className="text-[10px] text-muted-foreground text-center">
            عرض {filtered.length} من {transactions.length} معاملة
          </p>
        </TabsContent>

        {/* ═══ 3. Create Tab (inline form) ═══ */}
        <TabsContent value="create" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-3.5 px-4">
              <CardTitle className="text-xs font-bold">إنشاء معاملة جديدة</CardTitle>
            </CardHeader>
            <CardContent className="pb-3.5 px-4 space-y-3">
              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">النوع *</Label>
                <Select value={formType} onValueChange={function(v) { setFormType(v as TxType); }}>
                  <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TX_TYPES.map(function(t) {
                      const Icon = t.icon;
                      return (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          <span className="inline-flex items-center gap-1.5"><Icon className={"h-3.5 w-3.5 " + t.color} />{t.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">المبلغ *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={formAmount}
                    onChange={function(e) { setFormAmount(e.target.value); }}
                    placeholder="0.00"
                    className="text-sm"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">العملة *</Label>
                  <Select value={formCurrency} onValueChange={function(v) { setFormCurrency(v as Currency); }}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(function(c) {
                        return <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs">الوصف</Label>
                <Input
                  value={formDescription}
                  onChange={function(e) { setFormDescription(e.target.value); }}
                  placeholder="وصف المعاملة..."
                  className="text-sm"
                />
              </div>
              {/* Reference */}
              <div className="space-y-1.5">
                <Label className="text-xs">المرجع</Label>
                <Input
                  value={formReference}
                  onChange={function(e) { setFormReference(e.target.value); }}
                  placeholder="رقم المرجع أو الإيصال"
                  className="text-sm"
                  dir="ltr"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!formAmount || parseFloat(formAmount) <= 0 || saving}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}
                إنشاء المعاملة
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ 4. Payment Flow Tab ═══ */}
        <TabsContent value="flow" className="space-y-4">
          <PaymentFlowViz transactions={transactions} />

          {/* Detailed Pi/OUSD payment flow per transaction */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-3.5 px-4">
              <CardTitle className="text-xs font-bold">تفاصيل مسار الدفع لكل معاملة</CardTitle>
            </CardHeader>
            <CardContent className="pb-3.5 px-4">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Wallet className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">لا توجد معاملات لعرض المسار</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {transactions.map(function(tx) {
                    const txStatus = getTxStatus(tx.reference);
                    const steps = ["pending", "approved", "completed"];
                    const currentIdx = steps.indexOf(txStatus);
                    const isFailed = txStatus === "failed";

                    return (
                      <div key={tx.id} className="p-3 rounded-lg border bg-muted/10">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TxTypeIcon type={tx.type} />
                            <p className="font-semibold text-xs truncate">{tx.description || "—"}</p>
                          </div>
                          <div className="shrink-0 text-left" dir="ltr">
                            <span className="font-bold text-xs">{formatPi(tx.amount)} {getCurrencySymbol(tx.currency)}</span>
                          </div>
                        </div>
                        {/* Mini progress bar */}
                        <div className="flex items-center gap-1">
                          {steps.map(function(step, idx) {
                            const stepInfo = getStatusInfo(step);
                            const StepIcon = stepInfo.icon;
                            const isReached = isFailed ? false : idx <= currentIdx;
                            const isCurrent = isFailed ? false : idx === currentIdx;
                            return (
                              <React.Fragment key={step}>
                                {idx > 0 && (
                                  <div className={
                                    "flex-1 h-0.5 rounded-full " +
                                    (isReached ? "bg-emerald-500" : "bg-muted-foreground/15")
                                  } />
                                )}
                                <div className={
                                  "flex items-center gap-1 px-2 py-1 rounded-md text-[9px] shrink-0 " +
                                  (isCurrent
                                    ? stepInfo.color + " ring-1 ring-current font-bold"
                                    : isReached
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-muted/30 text-muted-foreground/40")
                                }>
                                  <StepIcon className="h-2.5 w-2.5" />
                                  {stepInfo.label}
                                </div>
                              </React.Fragment>
                            );
                          })}
                          {/* Failed indicator */}
                          {isFailed && (
                            <>
                              <div className="flex-1 h-0.5 rounded-full bg-red-400" />
                              <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] shrink-0 bg-red-500/15 text-red-600 font-bold">
                                <XCircle className="h-2.5 w-2.5" />
                                فشل
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
