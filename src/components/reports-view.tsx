"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, PieChart,
  Calendar, Download, FileDown, ArrowUpRight, ArrowDownRight,
  Package, Receipt, Loader2, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { microToPi, roundPi, formatPi } from "@/lib/pi-amount";
import { fmtDate } from "@/lib/helpers";
import type {
  TransactionLogData, LocalSaleData, ExpenseData, ProductData, InvoiceData,
} from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════ */
interface ReportsViewProps {
  storeId: string;
  piUid: string;
}

/* ═══════════════════════════════════════════════════════════════
   Date Range Presets
   ═══════════════════════════════════════════════════════════════ */
type DatePreset = "today" | "week" | "month" | "3months" | "custom";

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "week", label: "هذا الأسبوع" },
  { key: "month", label: "هذا الشهر" },
  { key: "3months", label: "آخر 3 أشهر" },
];

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const from = new Date();

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      from.setDate(now.getDate() - now.getDay());
      return { from: from.toISOString().slice(0, 10), to: today };
    case "month":
      from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: today };
    case "3months":
      from.setMonth(now.getMonth() - 3);
      from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: today };
    default:
      return { from: today, to: today };
  }
}

/* ═══════════════════════════════════════════════════════════════
   Payment Method Colors
   ═══════════════════════════════════════════════════════════════ */
const PAYMENT_COLORS: Record<string, string> = {
  pi: "bg-emerald-500",
  cash: "bg-amber-500",
  card: "bg-blue-500",
  ousd: "bg-violet-500",
};

const PAYMENT_LABELS: Record<string, string> = {
  pi: "Pi",
  cash: "نقدي",
  card: "بطاقة",
  ousd: "OUSD",
};

/* ═══════════════════════════════════════════════════════════════
   Category Colors (for bar chart)
   ═══════════════════════════════════════════════════════════════ */
const CATEGORY_PALETTE = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-blue-500",
  "bg-pink-500",
  "bg-lime-500",
];

/* ═══════════════════════════════════════════════════════════════
   Mini bar chart (pure CSS, defined outside component)
   ═══════════════════════════════════════════════════════════════ */
function MiniBarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  if (data.length === 0) return null;
  const m = maxVal || Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map(function(v, i) {
        const h = Math.max(2, (v / m) * 100);
        return (
          <div
            key={i}
            className={"flex-1 rounded-t-sm min-w-[3px] transition-all hover:opacity-80 " + color}
            style={{ height: h + "%" }}
            title={v.toFixed(7) + " π"}
          />
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ReportsView Component
   ═══════════════════════════════════════════════════════════════ */
export function ReportsView({ storeId, piUid }: ReportsViewProps) {
  /* ── Date range state ── */
  const [preset, setPreset] = useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const dateRange = useMemo(function() {
    if (preset === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  /* ── Data Queries ── */
  const invRes = useQuery({
    queryKey: ["invoices", storeId],
    queryFn: function() { return api.get("/api/invoices?storeId=" + storeId, piUid).then(function(r) { return r.json(); }); },
    staleTime: 60_000,
  });

  const salesRes = useQuery({
    queryKey: ["local-sales", storeId],
    queryFn: function() { return api.get("/api/local-sales?storeId=" + storeId, piUid).then(function(r) { return r.json(); }); },
    staleTime: 60_000,
  });

  const expRes = useQuery({
    queryKey: ["expenses", storeId],
    queryFn: function() { return api.get("/api/expenses?storeId=" + storeId, piUid).then(function(r) { return r.json(); }); },
    staleTime: 60_000,
  });

  const prodRes = useQuery({
    queryKey: ["products", storeId],
    queryFn: function() { return api.get("/api/products?storeId=" + storeId, piUid).then(function(r) { return r.json(); }); },
    staleTime: 60_000,
  });

  const txRes = useQuery({
    queryKey: ["transaction-logs", storeId],
    queryFn: function() { return api.get("/api/transaction-logs?storeId=" + storeId, piUid).then(function(r) { return r.json(); }); },
    staleTime: 60_000,
  });

  /* ── Extract data arrays ── */
  const invoices = (((invRes.data as Record<string, unknown>)?.data || []) as InvoiceData[]);
  const localSales = (((salesRes.data as Record<string, unknown>)?.data || []) as LocalSaleData[]);
  const expenses = (((expRes.data as Record<string, unknown>)?.data || []) as ExpenseData[]);
  const products = (((prodRes.data as Record<string, unknown>)?.data || []) as ProductData[]);
  const txLogs = (((txRes.data as Record<string, unknown>)?.data || []) as TransactionLogData[]);

  /* ── Date range filtering ── */
  const fromDate = new Date(dateRange.from + "T00:00:00");
  const toDate = new Date(dateRange.to + "T23:59:59");

  function inRange(dateStr: string): boolean {
    const d = new Date(dateStr);
    return d >= fromDate && d <= toDate;
  }

  const filteredInvoices = invoices.filter(function(inv) { return inRange(inv.createdAt); });
  const filteredSales = localSales.filter(function(s) { return inRange(s.createdAt); });
  const filteredExpenses = expenses.filter(function(e) { return inRange(e.date || e.createdAt); });
  const filteredTx = txLogs.filter(function(t) { return inRange(t.createdAt); });

  /* ── KPIs ── */
  const piRevenue = filteredInvoices
    .filter(function(inv) { return inv.status === "completed"; })
    .reduce(function(sum, inv) { return sum + microToPi(inv.total); }, 0);

  const localRevenue = filteredSales.reduce(function(sum, s) { return sum + microToPi(s.total); }, 0);
  const totalRevenue = piRevenue + localRevenue;
  const totalExpenses = filteredExpenses.reduce(function(sum, e) { return sum + microToPi(e.amount); }, 0);
  const netProfit = totalRevenue - totalExpenses;

  /* ── Revenue by payment method ── */
  const revenueByMethod: Record<string, number> = {};
  for (const inv of filteredInvoices.filter(function(i) { return i.status === "completed"; })) {
    const method = "pi";
    revenueByMethod[method] = (revenueByMethod[method] || 0) + microToPi(inv.subtotal);
  }
  for (const sale of filteredSales) {
    const method = sale.paymentMethod || "cash";
    revenueByMethod[method] = (revenueByMethod[method] || 0) + microToPi(sale.total);
  }

  /* ── Expense by category ── */
  const expByCategory: Record<string, number> = {};
  for (const exp of filteredExpenses) {
    expByCategory[exp.category] = (expByCategory[exp.category] || 0) + microToPi(exp.amount);
  }

  /* ── Invoice status distribution ── */
  const statusDist: Record<string, number> = {};
  for (const inv of filteredInvoices) {
    statusDist[inv.status] = (statusDist[inv.status] || 0) + 1;
  }

  /* ── Top products by revenue ── */
  const productRevenue: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const inv of filteredInvoices) {
    for (const item of inv.items) {
      const key = item.productId || item.productName;
      if (!productRevenue[key]) {
        productRevenue[key] = { name: item.productName, qty: 0, revenue: 0 };
      }
      productRevenue[key].qty += item.quantity;
      productRevenue[key].revenue += microToPi(item.totalPrice);
    }
  }
  const topProducts = Object.values(productRevenue).sort(function(a, b) { return b.revenue - a.revenue; }).slice(0, 5);

  /* ── Low stock products ── */
  const lowStock = products.filter(function(p) { return p.stockQuantity <= p.lowStockThreshold && p.isActive; });

  /* ── Daily revenue trend ── */
  const trendDays = Math.min(
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    30
  );
  const dailyTrend: { date: string; revenue: number; expenses: number }[] = [];
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(toDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const dayRevenue = filteredSales
      .filter(function(s) { return s.createdAt.startsWith(dateStr); })
      .reduce(function(sum, s) { return sum + microToPi(s.total); }, 0)
      + filteredInvoices
        .filter(function(inv) { return inv.status === "completed" && inv.completedAt && inv.completedAt.startsWith(dateStr); })
        .reduce(function(sum, inv) { return sum + microToPi(inv.subtotal); }, 0);

    const dayExpenses = filteredExpenses
      .filter(function(e) { return (e.date || e.createdAt).startsWith(dateStr); })
      .reduce(function(sum, e) { return sum + microToPi(e.amount); }, 0);

    dailyTrend.push({ date: dateStr, revenue: dayRevenue, expenses: dayExpenses });
  }

  /* ── Refresh handler ── */
  const refresh = useCallback(function() {
    invRes.refetch();
    salesRes.refetch();
    expRes.refetch();
    prodRes.refetch();
    txRes.refetch();
  }, [invRes, salesRes, expRes, prodRes, txRes]);

  const isLoading = invRes.isLoading || salesRes.isLoading || expRes.isLoading;

  /* ── Status labels ── */
  const STATUS_LABELS: Record<string, string> = {
    pending: "قيد الانتظار", paid_escrow: "في الضمان", shipped: "تم الشحن",
    delivered: "تم التسليم", completed: "مكتمل", disputed: "نزاع",
    cancelled: "ملغي", releasing: "تحرير",
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    paid_escrow: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    shipped: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    delivered: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    completed: "bg-emerald-600/10 text-emerald-700 border-emerald-600/20",
    disputed: "bg-red-500/10 text-red-600 border-red-500/20",
    cancelled: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
    releasing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };

  /* ═══════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-4">
      {/* Header with period selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <PieChart className="h-4 w-4 text-emerald-500" />
            التقارير والتحليلات
          </h3>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            {DATE_PRESETS.find(function(p) { return p.key === preset; })?.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {DATE_PRESETS.map(function(p) {
            return (
              <Button
                key={p.key}
                variant={preset === p.key ? "default" : "ghost"}
                size="sm"
                onClick={function() { setPreset(p.key); }}
                className={preset === p.key ? "text-[10px] h-6 bg-emerald-600 hover:bg-emerald-700 text-white" : "text-[10px] h-6 text-muted-foreground"}
              >
                {p.label}
              </Button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(function(i) {
            return (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          {/* Overview KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">إجمالي الإيرادات</span>
                </div>
                <p className="text-lg font-bold">{formatPi(totalRevenue)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Pi: {formatPi(piRevenue)} · محلي: {formatPi(localRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className={"h-3.5 w-3.5 " + (netProfit >= 0 ? "text-emerald-500" : "text-red-500")} />
                  <span className="text-[10px] text-muted-foreground">صافي الربح</span>
                </div>
                <p className={"text-lg font-bold " + (netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>{formatPi(netProfit)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  هامش: {totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[10px] text-muted-foreground">إجمالي المصروفات</span>
                </div>
                <p className="text-lg font-bold text-amber-600">{formatPi(totalExpenses)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {filteredExpenses.length} مصروف
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-3.5 w-3.5 text-sky-500" />
                  <span className="text-[10px] text-muted-foreground">المعاملات</span>
                </div>
                <p className="text-lg font-bold">{filteredInvoices.length + filteredSales.length}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[8px] h-4 px-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {filteredInvoices.length} Pi
                  </Badge>
                  <Badge variant="outline" className="text-[8px] h-4 px-1 bg-sky-500/10 text-sky-600 border-sky-500/20">
                    {filteredSales.length} محلي
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Mini Chart */}
          {dailyTrend.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                    اتجاه الإيرادات والمصروفات
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] bg-muted/50">
                    {dailyTrend.length} يوم
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">الإيرادات</p>
                    <MiniBarChart
                      data={dailyTrend.map(function(d) { return d.revenue; })}
                      maxVal={Math.max(...dailyTrend.map(function(d) { return d.revenue; }), 0.01)}
                      color="bg-emerald-500/60"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">المصروفات</p>
                    <MiniBarChart
                      data={dailyTrend.map(function(d) { return d.expenses; })}
                      maxVal={Math.max(...dailyTrend.map(function(d) { return d.revenue; }), 0.01)}
                      color="bg-amber-500/60"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Status Distribution */}
          {Object.keys(statusDist).length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-sky-500" />
                  توزيع حالات الفواتير
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-2">
                  {Object.entries(statusDist).sort(function(a, b) { return b[1] - a[1]; }).map(function([status, count]) {
                    const total = Object.values(statusDist).reduce(function(s, c) { return s + c; }, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <Badge variant="outline" className={"text-[9px] min-w-[70px] justify-center " + (STATUS_COLORS[status] || "")}>
                          {STATUS_LABELS[status] || status}
                        </Badge>
                        <div className="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: pct + "%" }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-8 text-left">{count}</span>
                        <span className="text-[10px] text-muted-foreground w-8 text-left">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Products by Revenue */}
          {topProducts.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-amber-500" />
                  أفضل المنتجات حسب الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-2">
                  {topProducts.map(function(p, i) {
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.qty} قطعة</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">{formatPi(p.revenue)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue by Payment Method */}
          {Object.keys(revenueByMethod).length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-violet-500" />
                  الإيرادات حسب طريقة الدفع
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(revenueByMethod).sort(function(a, b) { return b[1] - a[1]; }).map(function([method, amount]) {
                    return (
                      <div key={method} className={"p-3 rounded-lg " + (PAYMENT_COLORS[method] ? PAYMENT_COLORS[method] + "/10" : "bg-muted/30")}>
                        <p className="text-[10px] text-muted-foreground">{PAYMENT_LABELS[method] || method}</p>
                        <p className="text-sm font-bold">{formatPi(amount)}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expense Breakdown */}
          {Object.keys(expByCategory).length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
                  توزيع المصروفات
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-2">
                  {Object.entries(expByCategory).sort(function(a, b) { return b[1] - a[1]; }).map(function([cat, amount]) {
                    const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
                    const CATEGORY_LABELS: Record<string, string> = {
                      rent: "إيجار", utilities: "مرافق", salaries: "رواتب",
                      supplies: "مستلزمات", marketing: "تسويق", shipping: "شحن", other: "أخرى",
                    };
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-[10px] min-w-[60px] text-muted-foreground">{CATEGORY_LABELS[cat] || cat}</span>
                        <div className="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: pct + "%" }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{formatPi(amount)}</span>
                        <span className="text-[10px] text-muted-foreground w-8">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Alert */}
          {lowStock.length > 0 && (
            <Card className="border-0 shadow-sm border-amber-500/20">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-amber-600">
                  <Package className="h-3.5 w-3.5" />
                  تنبيه المخزون المنخفض ({lowStock.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {lowStock.map(function(p) {
                    return (
                      <div key={p.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-amber-500/5">
                        <span className="truncate flex-1">{p.name}</span>
                        <span className="font-mono text-amber-600 ml-2">{p.stockQuantity} / {p.lowStockThreshold}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions Table */}
          {filteredTx.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Receipt className="h-3.5 w-3.5 text-sky-500" />
                  آخر المعاملات المالية
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] h-7">النوع</TableHead>
                        <TableHead className="text-[10px] h-7">الوصف</TableHead>
                        <TableHead className="text-[10px] h-7 text-left">المبلغ</TableHead>
                        <TableHead className="text-[10px] h-7">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTx.slice(0, 20).map(function(tx) {
                        const typeLabels: Record<string, string> = {
                          payment: "دفع", release: "تحرير", refund: "استرداد",
                          escrow_fee: "رسوم ضمان", expense: "مصروف",
                        };
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-[10px] py-1">{typeLabels[tx.type] || tx.type}</TableCell>
                            <TableCell className="text-[10px] py-1 max-w-[120px] truncate">{tx.description}</TableCell>
                            <TableCell className={"text-[10px] py-1 text-left font-mono " + (tx.amount > 0 ? "text-emerald-600" : "text-red-600")}>
                              {formatPi(microToPi(tx.amount))}
                            </TableCell>
                            <TableCell className="text-[10px] py-1">{fmtDate(tx.createdAt)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Refresh */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          className="text-xs text-muted-foreground gap-1.5"
        >
          <Loader2 className={"h-3 w-3 " + (invRes.isFetching ? "animate-spin" : "")} />
          تحديث البيانات
        </Button>
      </div>
    </div>
  );
}
