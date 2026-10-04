"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  DollarSign, Receipt, Users, CreditCard, Banknote,
  Home, Lightbulb, HardHat, Package, Megaphone, Truck, Pin,
  BarChart3, Activity, RotateCcw, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";
import { formatPi, roundPi } from "@/lib/pi-amount";
import type {
  StoreData, InvoiceData, ExpenseData,
  TransactionLogData, LocalSaleData, CustomerData,
} from "@/lib/types";

/* ═══ Props ═══ */
interface FinancialViewProps {
  storeId: string;
  piUid: string;
  store: StoreData;
}

/* ═══ Category Config ═══ */
const EXPENSE_CATEGORIES = [
  { value: "rent", label: "إيجار", icon: Home, color: "text-orange-500", bg: "bg-orange-500/10" },
  { value: "utilities", label: "مرافق", icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { value: "salaries", label: "رواتب", icon: HardHat, color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "supplies", label: "مستلزمات", icon: Package, color: "text-violet-500", bg: "bg-violet-500/10" },
  { value: "marketing", label: "تسويق", icon: Megaphone, color: "text-pink-500", bg: "bg-pink-500/10" },
  { value: "shipping", label: "شحن", icon: Truck, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { value: "other", label: "أخرى", icon: Pin, color: "text-zinc-500", bg: "bg-zinc-500/10" },
] as const;

/* ═══ Revenue Line Config ═══ */
const REVENUE_LINES = [
  { key: "piEscrow", label: "إيرادات ضمان Pi", icon: Shield },
  { key: "localCash", label: "مبيعات نقدية", icon: Banknote },
  { key: "localCard", label: "مبيعات بالبطاقة", icon: CreditCard },
  { key: "localPi", label: "مبيعات Pi محلية", icon: Wallet },
  { key: "ousd", label: "معاملات OUSD", icon: DollarSign },
] as const;

/* ═══ Helpers ═══ */
function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return roundPi((part / total) * 100);
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("ar-DZ", { month: "short", year: "numeric" });
}

function getLast6MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  return keys;
}

/* ═══ Financial View ═══ */
export function FinancialView({ storeId, piUid }: FinancialViewProps) {
  /* ── Data Fetching ── */
  const txLogsRes = useQuery({
    queryKey: ["transaction-logs", storeId, "financial"],
    queryFn: function() { return api.get("/api/transaction-logs?storeId=" + storeId + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const txLogs = ((txLogsRes.data as Record<string, unknown>)?.data || []) as TransactionLogData[];

  const expensesRes = useQuery({
    queryKey: ["expenses", storeId, "financial"],
    queryFn: function() { return api.get("/api/expenses?storeId=" + storeId + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const expenses = ((expensesRes.data as Record<string, unknown>)?.data || []) as ExpenseData[];

  const localSalesRes = useQuery({
    queryKey: ["localSales", storeId, "financial"],
    queryFn: function() { return api.get("/api/local-sales?storeId=" + storeId + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const localSales = ((localSalesRes.data as Record<string, unknown>)?.data || []) as LocalSaleData[];

  const invoicesRes = useQuery({
    queryKey: ["invoices", "financial", storeId],
    queryFn: function() { return api.get("/api/invoices?storeId=" + storeId + "&page=1&limit=100", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const invoices = ((invoicesRes.data as Record<string, unknown>)?.data || []) as InvoiceData[];

  const customersRes = useQuery({
    queryKey: ["customers", storeId, "financial"],
    queryFn: function() { return api.get("/api/customers?storeId=" + storeId + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const customers = ((customersRes.data as Record<string, unknown>)?.data || []) as CustomerData[];

  const isLoading = txLogsRes.isLoading || expensesRes.isLoading || localSalesRes.isLoading || invoicesRes.isLoading || customersRes.isLoading;

  /* ── Computed: Revenue Sources ── */
  const revenue = useMemo(function() {
    const piCompleted = invoices.filter(function(inv) { return inv.status === "completed"; });
    const piEscrowRevenue = roundPi(piCompleted.reduce(function(s, inv) { return s + inv.subtotal; }, 0));
    const localCashSales = roundPi(localSales.filter(function(s) { return s.paymentMethod === "cash"; }).reduce(function(s, sale) { return s + sale.total; }, 0));
    const localCardSales = roundPi(localSales.filter(function(s) { return s.paymentMethod === "card"; }).reduce(function(s, sale) { return s + sale.total; }, 0));
    const localPiSales = roundPi(localSales.filter(function(s) { return s.paymentMethod === "pi"; }).reduce(function(s, sale) { return s + sale.total; }, 0));
    const ousdRevenue = roundPi(txLogs.filter(function(t) { return t.type === "ousd"; }).reduce(function(s, t) { return s + t.amount; }, 0));
    const totalRevenue = roundPi(piEscrowRevenue + localCashSales + localCardSales + localPiSales + ousdRevenue);
    return {
      piEscrowRevenue: piEscrowRevenue,
      localCashSales: localCashSales,
      localCardSales: localCardSales,
      localPiSales: localPiSales,
      ousdRevenue: ousdRevenue,
      totalRevenue: totalRevenue,
    };
  }, [invoices, localSales, txLogs]);

  /* ── Computed: Expenses ── */
  const expenseBreakdown = useMemo(function() {
    const totalExpenses = roundPi(expenses.reduce(function(s, e) { return s + e.amount; }, 0));
    const byCategory: Record<string, number> = {};
    expenses.forEach(function(e) {
      byCategory[e.category] = roundPi((byCategory[e.category] || 0) + e.amount);
    });
    return { totalExpenses: totalExpenses, byCategory: byCategory };
  }, [expenses]);

  /* ── Computed: P&L ── */
  const pnl = useMemo(function() {
    const grossProfit = roundPi(revenue.totalRevenue - expenseBreakdown.totalExpenses);
    const profitMargin = revenue.totalRevenue > 0 ? roundPi((grossProfit / revenue.totalRevenue) * 100) : 0;
    return { grossProfit: grossProfit, profitMargin: profitMargin, isProfit: grossProfit >= 0 };
  }, [revenue.totalRevenue, expenseBreakdown.totalExpenses]);

  /* ── Computed: Cash Flow Timeline (last 6 months) ── */
  const cashFlow = useMemo(function() {
    const monthKeys = getLast6MonthKeys();
    const monthlyInvoiceRevenue: Record<string, number> = {};
    invoices.forEach(function(inv) {
      if (inv.status === "completed") {
        const key = getMonthKey(inv.completedAt || inv.createdAt);
        monthlyInvoiceRevenue[key] = roundPi((monthlyInvoiceRevenue[key] || 0) + inv.subtotal);
      }
    });
    const monthlyLocalRevenue: Record<string, number> = {};
    localSales.forEach(function(sale) {
      const key = getMonthKey(sale.createdAt);
      monthlyLocalRevenue[key] = roundPi((monthlyLocalRevenue[key] || 0) + sale.total);
    });
    const monthlyOusdRevenue: Record<string, number> = {};
    txLogs.forEach(function(t) {
      if (t.type === "ousd") {
        const key = getMonthKey(t.createdAt);
        monthlyOusdRevenue[key] = roundPi((monthlyOusdRevenue[key] || 0) + t.amount);
      }
    });
    const monthlyExpenses: Record<string, number> = {};
    expenses.forEach(function(e) {
      const key = getMonthKey(e.date);
      monthlyExpenses[key] = roundPi((monthlyExpenses[key] || 0) + e.amount);
    });
    return monthKeys.map(function(key) {
      const rev = roundPi((monthlyInvoiceRevenue[key] || 0) + (monthlyLocalRevenue[key] || 0) + (monthlyOusdRevenue[key] || 0));
      const exp = roundPi(monthlyExpenses[key] || 0);
      return { key: key, label: getMonthLabel(key), revenue: rev, expenses: exp };
    });
  }, [invoices, localSales, txLogs, expenses]);

  /* ── Computed: Top Customers ── */
  const topCustomers = useMemo(function() {
    return customers
      .filter(function(c) { return c.totalSpent > 0; })
      .sort(function(a, b) { return b.totalSpent - a.totalSpent; })
      .slice(0, 5)
      .map(function(c) {
        return {
          id: c.id,
          name: c.name,
          totalSpent: c.totalSpent,
          totalOrders: c.totalOrders,
          avgOrderValue: c.totalOrders > 0 ? roundPi(c.totalSpent / c.totalOrders) : 0,
        };
      });
  }, [customers]);

  /* ── Computed: Financial Health Indicators ── */
  const health = useMemo(function() {
    const now = new Date();
    const thisMonthKey = getMonthKey(now.toISOString());
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = getMonthKey(prevMonth.toISOString());

    const thisMonthInvoices = invoices.filter(function(inv) {
      if (inv.status !== "completed") return false;
      return getMonthKey(inv.completedAt || inv.createdAt) === thisMonthKey;
    });
    const thisMonthLocalSales = localSales.filter(function(s) { return getMonthKey(s.createdAt) === thisMonthKey; });
    const thisMonthOusd = txLogs.filter(function(t) { return t.type === "ousd" && getMonthKey(t.createdAt) === thisMonthKey; });
    const thisMonthRevenue = roundPi(
      thisMonthInvoices.reduce(function(s, inv) { return s + inv.subtotal; }, 0) +
      thisMonthLocalSales.reduce(function(s, sale) { return s + sale.total; }, 0) +
      thisMonthOusd.reduce(function(s, t) { return s + t.amount; }, 0)
    );

    const prevMonthInvoices = invoices.filter(function(inv) {
      if (inv.status !== "completed") return false;
      return getMonthKey(inv.completedAt || inv.createdAt) === prevMonthKey;
    });
    const prevMonthLocalSales = localSales.filter(function(s) { return getMonthKey(s.createdAt) === prevMonthKey; });
    const prevMonthOusd = txLogs.filter(function(t) { return t.type === "ousd" && getMonthKey(t.createdAt) === prevMonthKey; });
    const prevMonthRevenue = roundPi(
      prevMonthInvoices.reduce(function(s, inv) { return s + inv.subtotal; }, 0) +
      prevMonthLocalSales.reduce(function(s, sale) { return s + sale.total; }, 0) +
      prevMonthOusd.reduce(function(s, t) { return s + t.amount; }, 0)
    );

    const revenueTrendUp = thisMonthRevenue >= prevMonthRevenue;
    const revenueChangePercent = prevMonthRevenue > 0 ? roundPi(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : 0;
    const expenseRatio = revenue.totalRevenue > 0 ? roundPi((expenseBreakdown.totalExpenses / revenue.totalRevenue) * 100) : 0;

    const allTransactions = txLogs.filter(function(t) { return t.type !== "expense" && t.type !== "refund"; });
    const avgTransactionValue = allTransactions.length > 0
      ? roundPi(allTransactions.reduce(function(s, t) { return s + t.amount; }, 0) / allTransactions.length)
      : 0;

    const refundCount = txLogs.filter(function(t) { return t.type === "refund"; }).length;
    const totalTxCount = txLogs.length;
    const refundRate = totalTxCount > 0 ? roundPi((refundCount / totalTxCount) * 100) : 0;

    return {
      thisMonthRevenue: thisMonthRevenue,
      prevMonthRevenue: prevMonthRevenue,
      revenueTrendUp: revenueTrendUp,
      revenueChangePercent: revenueChangePercent,
      expenseRatio: expenseRatio,
      avgTransactionValue: avgTransactionValue,
      refundRate: refundRate,
    };
  }, [invoices, localSales, txLogs, revenue.totalRevenue, expenseBreakdown.totalExpenses]);

  /* ── Max for cash flow bars ── */
  const cashFlowMax = useMemo(function() {
    let max = 0;
    cashFlow.forEach(function(m) {
      if (m.revenue > max) max = m.revenue;
      if (m.expenses > max) max = m.expenses;
    });
    return max || 1;
  }, [cashFlow]);

  /* Revenue amounts array for breakdown */
  const revenueAmounts = useMemo(function(): Record<string, number> {
    return {
      piEscrow: revenue.piEscrowRevenue,
      localCash: revenue.localCashSales,
      localCard: revenue.localCardSales,
      localPi: revenue.localPiSales,
      ousd: revenue.ousdRevenue,
    };
  }, [revenue]);

  /* ── Loading State ── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(function(i) {
            return <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /></CardContent></Card>;
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(function(i) {
            return <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-20 w-full" /></CardContent></Card>;
          })}
        </div>
      </div>
    );
  }

  /* ═══ Render ═══ */
  return (
    <div className="space-y-4" dir="rtl">

      {/* ═══ 1. P&L Summary ═══ */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-3.5 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            الربح والخسارة
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3.5 px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Revenue */}
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/15 dark:bg-emerald-500/8">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground">إجمالي الإيرادات</span>
              </div>
              <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatPi(revenue.totalRevenue)} π</p>
            </div>
            {/* Total Expenses */}
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/15 dark:bg-red-500/8">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                <span className="text-[10px] text-muted-foreground">إجمالي المصروفات</span>
              </div>
              <p className="font-bold text-lg text-red-500">{formatPi(expenseBreakdown.totalExpenses)} π</p>
            </div>
            {/* Gross Profit */}
            <div className={pnl.isProfit
              ? "p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/15 dark:bg-emerald-500/8"
              : "p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/15 dark:bg-red-500/8"
            }>
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className={pnl.isProfit ? "h-3.5 w-3.5 text-emerald-500" : "h-3.5 w-3.5 text-red-500"} />
                <span className="text-[10px] text-muted-foreground">الربح الإجمالي</span>
              </div>
              <p className={pnl.isProfit ? "font-bold text-lg text-emerald-600 dark:text-emerald-400" : "font-bold text-lg text-red-500"}>
                {pnl.isProfit ? "" : "-"}{formatPi(Math.abs(pnl.grossProfit))} π
              </p>
            </div>
            {/* Profit Margin */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">هامش الربح</span>
              </div>
              <p className={pnl.isProfit ? "font-bold text-lg text-emerald-600 dark:text-emerald-400" : "font-bold text-lg text-red-500"}>
                {pnl.isProfit ? "" : "-"}{formatPi(Math.abs(pnl.profitMargin))}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ═══ 2. Revenue Breakdown ═══ */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-3.5 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              تفصيل الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3.5 px-4 space-y-2.5">
            {REVENUE_LINES.map(function(line) {
              const amount = revenueAmounts[line.key] || 0;
              const percentage = pct(amount, revenue.totalRevenue);
              const Icon = line.icon;
              return (
                <div key={line.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-emerald-500/10">
                        <Icon className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <span className="text-xs font-medium">{line.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatPi(amount)} π</span>
                      <span className="text-[10px] text-muted-foreground">{percentage}%</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-1.5 bg-emerald-500/10 [&>[data-slot=progress-indicator]]:bg-emerald-400" />
                </div>
              );
            })}
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold">الإجمالي</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatPi(revenue.totalRevenue)} π</span>
            </div>
          </CardContent>
        </Card>

        {/* ═══ 3. Expense Breakdown ═══ */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-3.5 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              تفصيل المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3.5 px-4 space-y-2.5">
            {EXPENSE_CATEGORIES.map(function(cat) {
              const amount = expenseBreakdown.byCategory[cat.value] || 0;
              if (amount === 0) return null;
              const percentage = pct(amount, expenseBreakdown.totalExpenses);
              const Icon = cat.icon;
              return (
                <div key={cat.value} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={"w-6 h-6 rounded-md flex items-center justify-center " + cat.bg}>
                        <Icon className={"h-3 w-3 " + cat.color} />
                      </div>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-500">{formatPi(amount)} π</span>
                      <span className="text-[10px] text-muted-foreground">{percentage}%</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-1.5 bg-red-500/10 [&>[data-slot=progress-indicator]]:bg-red-400" />
                </div>
              );
            })}
            {expenseBreakdown.totalExpenses === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد مصروفات مسجّلة</p>
            )}
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold">الإجمالي</span>
              <span className="text-sm font-bold text-red-500">{formatPi(expenseBreakdown.totalExpenses)} π</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ 4. Cash Flow Timeline ═══ */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-3.5 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-teal-500" />
            التدفق النقدي — آخر 6 أشهر
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3.5 px-4">
          <div className="space-y-3">
            {cashFlow.map(function(month) {
              const revPct = cashFlowMax > 0 ? (month.revenue / cashFlowMax) * 100 : 0;
              const expPct = cashFlowMax > 0 ? (month.expenses / cashFlowMax) * 100 : 0;
              const net = roundPi(month.revenue - month.expenses);
              return (
                <div key={month.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{month.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      صافي: <span className={net >= 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-red-500 font-bold"}>{formatPi(net)} π</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    {/* Revenue bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-8 shrink-0">إيراد</span>
                      <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                        <div className="h-full bg-emerald-400/70 rounded-sm transition-all" style={{ width: revPct + "%" }} />
                      </div>
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 w-16 text-left shrink-0">{formatPi(month.revenue)}</span>
                    </div>
                    {/* Expenses bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground w-8 shrink-0">مصروف</span>
                      <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
                        <div className="h-full bg-red-400/70 rounded-sm transition-all" style={{ width: expPct + "%" }} />
                      </div>
                      <span className="text-[10px] font-medium text-red-500 w-16 text-left shrink-0">{formatPi(month.expenses)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-2 border-t">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400/70" /><span className="text-[10px] text-muted-foreground">إيرادات</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400/70" /><span className="text-[10px] text-muted-foreground">مصروفات</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* ═══ 5. Top Customers by Revenue ═══ */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-3.5 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-500" />
              أفضل الزبائن حسب الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3.5 px-4">
            {topCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد بيانات زبائن</p>
            ) : (
              <div className="space-y-2.5">
                {topCustomers.map(function(customer, idx) {
                  return (
                    <div key={customer.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <span className={
                          idx === 0 ? "text-sm font-bold text-amber-500" :
                          idx === 1 ? "text-sm font-bold text-zinc-400" :
                          idx === 2 ? "text-sm font-bold text-orange-600" :
                          "text-sm font-bold text-muted-foreground"
                        }>{idx + 1}</span>
                        <div>
                          <p className="text-xs font-semibold">{customer.name}</p>
                          <p className="text-[10px] text-muted-foreground">{customer.totalOrders} طلب · متوسط {formatPi(customer.avgOrderValue)} π</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatPi(customer.totalSpent)} π</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══ 6. Financial Health Indicators ═══ */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-3.5 px-4">
            <CardTitle className="text-xs font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-500" />
              مؤشرات الصحة المالية
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3.5 px-4 space-y-3">
            {/* Revenue Trend */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                {health.revenueTrendUp
                  ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  : <ArrowDownRight className="h-4 w-4 text-red-500" />
                }
                <div>
                  <p className="text-xs font-medium">اتجاه الإيرادات</p>
                  <p className="text-[10px] text-muted-foreground">هذا الشهر مقابل السابق</p>
                </div>
              </div>
              <div className="text-left">
                <p className={health.revenueTrendUp ? "text-xs font-bold text-emerald-600 dark:text-emerald-400" : "text-xs font-bold text-red-500"}>
                  {health.revenueChangePercent > 0 ? "+" : ""}{formatPi(health.revenueChangePercent)}%
                </p>
                <p className="text-[10px] text-muted-foreground">{formatPi(health.thisMonthRevenue)} π</p>
              </div>
            </div>

            {/* Expense Ratio */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium">نسبة المصروفات</span>
                </div>
                <span className={
                  health.expenseRatio > 80 ? "text-xs font-bold text-red-500" :
                  health.expenseRatio > 50 ? "text-xs font-bold text-amber-500" :
                  "text-xs font-bold text-emerald-600 dark:text-emerald-400"
                }>
                  {formatPi(health.expenseRatio)}%
                </span>
              </div>
              <Progress
                value={Math.min(health.expenseRatio, 100)}
                className={
                  health.expenseRatio > 80
                    ? "h-2 bg-red-500/10 [&>[data-slot=progress-indicator]]:bg-red-400"
                    : health.expenseRatio > 50
                    ? "h-2 bg-amber-500/10 [&>[data-slot=progress-indicator]]:bg-amber-400"
                    : "h-2 bg-emerald-500/10 [&>[data-slot=progress-indicator]]:bg-emerald-400"
                }
              />
              <p className="text-[10px] text-muted-foreground">مصروفات ÷ إيرادات</p>
            </div>

            {/* Average Transaction Value */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-teal-500" />
                <div>
                  <p className="text-xs font-medium">متوسط قيمة المعاملة</p>
                  <p className="text-[10px] text-muted-foreground">لكل معاملة</p>
                </div>
              </div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{formatPi(health.avgTransactionValue)} π</span>
            </div>

            {/* Refund Rate */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs font-medium">معدل الاسترجاع</p>
                  <p className="text-[10px] text-muted-foreground">استرجاعات ÷ معاملات</p>
                </div>
              </div>
              <span className={health.refundRate > 5 ? "text-xs font-bold text-red-500" : "text-xs font-bold text-emerald-600 dark:text-emerald-400"}>
                {formatPi(health.refundRate)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
