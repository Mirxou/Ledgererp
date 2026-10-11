"use client";

import React, { useCallback, useMemo } from "react";
import {
  FileText, Package, Shield, CheckCircle2, Store as StoreIcon,
  ArrowRightLeft, CreditCard, Truck, Wallet, Clock, ChevronDown, Receipt,
  Share2, Link, Copy, Link2, Globe, Users, AlertTriangle,
  TrendingUp, TrendingDown, CircleDot, Banknote,
  ArrowUpRight, ArrowDownRight, ShoppingCart, Plus, Monitor,
  Zap, Activity, PackageCheck, Box, Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatPi, roundPi } from "@/lib/pi-amount";
import { StatusBadge, copyText, fmtDate, fmtTime } from "@/lib/helpers";
import { useToast } from "@/hooks/use-toast";
import type { StoreData, InvoiceData, TransactionLogData, InventoryData } from "@/lib/types";

/* ═══ Relative Time (Arabic) ═══ */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "منذ لحظة";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return fmtDate(dateStr);
}

/* ═══ Escrow Flow Steps ═══ */
const ESCROW_STEPS = [
  { key: "pending",      label: "قيد الانتظار", icon: FileText,   activeColor: "bg-yellow-500",  ringColor: "ring-yellow-500/40" },
  { key: "paid_escrow",  label: "في الضمان",    icon: CreditCard, activeColor: "bg-blue-500",    ringColor: "ring-blue-500/40" },
  { key: "shipped",      label: "تم الشحن",      icon: Truck,      activeColor: "bg-purple-500",  ringColor: "ring-purple-500/40" },
  { key: "delivered",    label: "تم التسليم",    icon: CheckCircle2, activeColor: "bg-teal-500", ringColor: "ring-teal-500/40" },
  { key: "completed",    label: "مكتمل",         icon: Wallet,     activeColor: "bg-emerald-500", ringColor: "ring-emerald-500/40" },
] as const;

/* ═══ Activity Event Icons ═══ */
const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  invoice_created:  { icon: FileText,     color: "text-blue-500",   bg: "bg-blue-500/10" },
  payment_received: { icon: CreditCard,   color: "text-emerald-500", bg: "bg-emerald-500/10" },
  order_shipped:    { icon: Truck,        color: "text-purple-500", bg: "bg-purple-500/10" },
  stock_alert:      { icon: AlertTriangle, color: "text-amber-500",  bg: "bg-amber-500/10" },
  cash:             { icon: Banknote,     color: "text-emerald-500", bg: "bg-emerald-500/10" },
  pi:               { icon: Shield,       color: "text-blue-500",   bg: "bg-blue-500/10" },
  ousd:             { icon: Banknote,     color: "text-teal-500",   bg: "bg-teal-500/10" },
  expense:          { icon: TrendingDown,  color: "text-red-500",    bg: "bg-red-500/10" },
  refund:           { icon: ArrowDownRight, color: "text-red-500",  bg: "bg-red-500/10" },
};

/* ═══ Placeholder Activity Items ═══ */
const PLACEHOLDER_ACTIVITY = [
  { icon: FileText,      color: "text-blue-400",   bg: "bg-blue-500/10",  label: "فاتورة جديدة تم إنشاؤها",   time: "منذ 5 دقائق" },
  { icon: CreditCard,    color: "text-emerald-400", bg: "bg-emerald-500/10", label: "دفعة مستلمة في الضمان",    time: "منذ 12 دقيقة" },
  { icon: Truck,         color: "text-purple-400", bg: "bg-purple-500/10", label: "طلب تم شحنه",              time: "منذ 30 دقيقة" },
  { icon: AlertTriangle, color: "text-amber-400",  bg: "bg-amber-500/10",  label: "تنبيه مخزون منخفض",        time: "منذ ساعة" },
  { icon: CheckCircle2,  color: "text-teal-400",   bg: "bg-teal-500/10",   label: "ضمان Pi تم إطلاقه",        time: "منذ ساعتين" },
] as const;

/* ═══ Dashboard ═══ */
export function DashboardView({ stats, store, transactionLogs, inventory }: {
  stats: Record<string, unknown>;
  store: StoreData;
  transactionLogs?: TransactionLogData[];
  inventory?: InventoryData[];
}) {
  const toast = useToast().toast;

  const storeLink = typeof window !== "undefined" ? window.location.origin + "?store=" + store.id : "";
  const storesDirLink = typeof window !== "undefined" ? window.location.origin + "?stores" : "";

  const handleCopyStoreLink = useCallback(function() {
    copyText(storeLink, toast, "تم نسخ رابط المتجر");
  }, [storeLink, toast]);

  const handleCopyStoresDir = useCallback(function() {
    copyText(storesDirLink, toast, "تم نسخ رابط الدليل");
  }, [storesDirLink, toast]);

  const totalReserved = inventory ? inventory.reduce(function(s, inv) { return s + inv.reservedQuantity; }, 0) : 0;
  const reservedItemsCount = inventory ? inventory.filter(function(inv) { return inv.reservedQuantity > 0; }).length : 0;

  // ─── Revenue & Expenses ───
  const localSalesRevenue = Number(stats.localSalesRevenue || 0);
  const piEscrowRevenue = Number(stats.escrowedPi || 0);
  const piCompletedRevenue = Number(stats.completedPi || 0);
  const totalRevenue = roundPi(localSalesRevenue + piCompletedRevenue);
  const totalExpenses = Number(stats.totalExpenses || 0);
  const profitEstimate = roundPi(totalRevenue - totalExpenses);

  // ─── Escrow step counts ───
  const statusCounts = useMemo(function() {
    return (stats.statusCounts || {}) as Record<string, number>;
  }, [stats.statusCounts]);

  // Determine the "most advanced active step" for highlighting
  const activeStepIndex = useMemo(function() {
    const order = ["pending", "paid_escrow", "shipped", "delivered", "completed"];
    for (let i = order.length - 1; i >= 0; i--) {
      if ((statusCounts[order[i]] || 0) > 0) return i;
    }
    return -1;
  }, [statusCounts]);

  // ─── KPI Cards with trends & gradients ───
  const escrowCount = Number(stats.activeEscrowCount || 0);
  const cards = [
    {
      label: "إجمالي الفواتير", value: String(stats.totalInvoices || 0),
      icon: FileText, color: "text-blue-500", gradientFrom: "from-blue-500/20", gradientTo: "to-blue-600/5",
      trend: Number(stats.totalInvoices || 0) > 0 ? "up" : "neutral" as const,
    },
    {
      label: "المنتجات", value: String(stats.totalProducts || 0),
      icon: Package, color: "text-violet-500", gradientFrom: "from-violet-500/20", gradientTo: "to-violet-600/5",
      trend: Number(stats.totalProducts || 0) > 0 ? "up" : "neutral" as const,
    },
    {
      label: "π في الضمان", value: formatPi(Number(stats.escrowedPi || 0)),
      icon: Shield, color: "text-amber-500", gradientFrom: "from-amber-500/20", gradientTo: "to-amber-600/5",
      trend: Number(stats.escrowedPi || 0) > 0 ? "up" : "neutral" as const,
      pulse: true,
    },
    {
      label: "π مكتمل", value: formatPi(Number(stats.completedPi || 0)),
      icon: CheckCircle2, color: "text-emerald-500", gradientFrom: "from-emerald-500/20", gradientTo: "to-emerald-600/5",
      trend: Number(stats.completedPi || 0) > 0 ? "up" : "neutral" as const,
    },
    {
      label: "الزبائن", value: String(stats.totalCustomers || 0),
      icon: Users, color: "text-teal-500", gradientFrom: "from-teal-500/20", gradientTo: "to-teal-600/5",
      trend: Number(stats.totalCustomers || 0) > 0 ? "up" : "neutral" as const,
    },
    {
      label: "تنبيهات مخزون", value: String(stats.lowStockCount || 0),
      icon: AlertTriangle, color: "text-red-500", gradientFrom: "from-red-500/20", gradientTo: "to-red-600/5",
      trend: Number(stats.lowStockCount || 0) > 0 ? "down" : "neutral" as const,
    },
    {
      label: "محجوز ضمان", value: String(totalReserved),
      icon: Shield, color: "text-amber-500", gradientFrom: "from-amber-500/20", gradientTo: "to-amber-600/5",
      trend: totalReserved > 0 ? "up" : "neutral" as const,
    },
  ];

  const recent = (stats.recentOrders || []) as InvoiceData[];
  const logs = transactionLogs || [];

  // ─── Revenue progress (target: 1000π) ───
  const REVENUE_TARGET = 1000;
  const revenueProgressPct = Math.min(100, (totalRevenue / REVENUE_TARGET) * 100);

  return (
    <div className="space-y-4">
      {/* ─── Store Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            {store.name}
            {store.source === "pi_connected" && (
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-teal-500/15 text-teal-600 border-teal-500/20 border">
                <Link2 className="h-2.5 w-2.5 ml-0.5" />متجر Pi مربوط
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">{store.description || "متجرك على Ledgererp"}</p>
          {store.piAppUrl && (
            <a href={store.piAppUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-teal-500 hover:text-teal-600 flex items-center gap-1 mt-0.5">
              <Globe className="h-3 w-3" />{store.piAppUrl}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><StoreIcon className="h-3 w-3 ml-1" />نشط</Badge>
        </div>
      </div>

      {/* ─── Quick Action Buttons ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm"
        >
          <FileText className="h-4 w-4" />
          فاتورة جديدة
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          إضافة منتج
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 border-teal-500/30 text-teal-600 hover:bg-teal-500/10 shadow-sm"
        >
          <Monitor className="h-4 w-4" />
          نقطة بيع
        </Button>
      </div>

      {/* ─── Store Link Sharing ─── */}
      <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500/40">
        <CardHeader className="pb-2 pt-3.5 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5 text-emerald-500" />
            شارك رابط متجرك
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3.5 px-4 space-y-2.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            أرسل هذا الرابط للمشترين ليتمكنوا من تصفح منتجاتك وطلبها مع ضمان الدفع بالـ Pi
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-[11px] font-mono truncate border border-border/50" dir="ltr">
              {storeLink}
            </div>
            <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs gap-1.5" onClick={handleCopyStoreLink}>
              <Copy className="h-3 w-3" />نسخ
            </Button>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Link className="h-3 w-3" />
              <span>رابط الدليل:</span>
            </div>
            <div className="flex-1 bg-muted/30 rounded px-2 py-1 text-[10px] font-mono truncate" dir="ltr">
              {storesDirLink}
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 h-6 text-[10px] gap-1 px-2" onClick={handleCopyStoresDir}>
              <Copy className="h-2.5 w-2.5" />نسخ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Animated KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map(function(c) {
          const Icon = c.icon;
          return (
            <Card
              key={c.label}
              className="border-0 shadow-sm transition-transform duration-200 hover:scale-[1.03] cursor-default"
            >
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " +
                  "bg-gradient-to-br " + c.gradientFrom + " " + c.gradientTo +
                  (c.pulse && escrowCount > 0 ? " animate-pulse" : "")
                }>
                  <Icon className={"h-4 w-4 " + c.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground truncate">{c.label}</p>
                  <p className="font-bold text-base leading-tight flex items-center gap-1">
                    {c.value}
                    {c.trend === "up" && (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    {c.trend === "down" && (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Revenue Progress Bar ─── */}
      <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500/30">
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              إيرادات الشهر الحالي
            </p>
            <span className="text-xs font-semibold text-emerald-600">
              {formatPi(totalRevenue)}π من {REVENUE_TARGET}π
            </span>
          </div>
          <Progress
            value={revenueProgressPct}
            className="h-2.5 bg-emerald-500/10 [&>[data-slot=progress-indicator]]:bg-gradient-to-l [&>[data-slot=progress-indicator]]:from-emerald-600 [&>[data-slot=progress-indicator]]:to-emerald-400"
          />
          <p className="text-[10px] text-muted-foreground text-left">
            {revenueProgressPct.toFixed(1)}% من الهدف الشهري
          </p>
        </CardContent>
      </Card>

      {/* ─── Inventory Alerts ─── */}
      {(Number(stats.lowStockCount || 0) > 0 || reservedItemsCount > 0) && (
        <Card className="border-0 shadow-sm border-l-4" style={{ borderLeftColor: reservedItemsCount > 0 ? "var(--color-amber-500, #f59e0b)" : "var(--color-red-500, #ef4444)" }}>
          <CardContent className="p-3.5 space-y-1.5">
            <p className="text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              تنبيهات المخزون
            </p>
            {Number(stats.lowStockCount || 0) > 0 && (
              <p className="text-[11px] text-muted-foreground">{String(stats.lowStockCount)} منتجات منخفضة المخزون</p>
            )}
            {reservedItemsCount > 0 && (
              <p className="text-[11px] text-amber-600 font-medium">{reservedItemsCount} عناصر محجوزة في الضمان ({totalReserved} وحدة)</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Revenue & Expenses ─── */}
      <div className="grid grid-cols-2 gap-3">
        {reservedItemsCount > 0 && (
          <Card className="border-0 shadow-sm border-l-4" style={{ borderLeftColor: "var(--color-amber-500, #f59e0b)" }}>
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0"><Shield className="h-4 w-4 text-amber-500" /></div>
              <div className="min-w-0"><p className="text-[11px] text-muted-foreground truncate">عناصر محجوزة في الضمان</p><p className="font-bold text-base leading-tight text-amber-600">{reservedItemsCount} <span className="text-xs font-normal text-muted-foreground">عنصر</span></p></div>
            </CardContent>
          </Card>
        )}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 flex items-center justify-center shrink-0"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
            <div className="min-w-0"><p className="text-[11px] text-muted-foreground truncate">إجمالي الإيرادات</p><p className="font-bold text-base leading-tight text-emerald-600">{formatPi(totalRevenue)} π</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/5 flex items-center justify-center shrink-0"><TrendingDown className="h-4 w-4 text-red-500" /></div>
            <div className="min-w-0"><p className="text-[11px] text-muted-foreground truncate">إجمالي المصروفات</p><p className="font-bold text-base leading-tight text-red-500">{formatPi(totalExpenses)} π</p></div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Profit Estimate ─── */}
      <Card className="border-0 shadow-sm border-l-4" style={{ borderLeftColor: profitEstimate >= 0 ? "var(--color-emerald-500, #10b981)" : "var(--color-red-500, #ef4444)" }}>
        <CardContent className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={"w-9 h-9 rounded-xl flex items-center justify-center " + (profitEstimate >= 0 ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/5" : "bg-gradient-to-br from-red-500/20 to-red-600/5")}>
              <Wallet className={"h-4 w-4 " + (profitEstimate >= 0 ? "text-emerald-500" : "text-red-500")} />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">تقدير الربح (إيرادات - مصروفات)</p>
              <p className={"font-bold text-lg flex items-center gap-1 " + (profitEstimate >= 0 ? "text-emerald-600" : "text-red-500")}>
                {formatPi(Math.abs(profitEstimate))} π {profitEstimate >= 0 ? "" : "(خسارة)"}
                {profitEstimate >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Escrow Flow Timeline ─── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />
            مسار الضمان
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="flex items-center justify-between" dir="ltr">
            {ESCROW_STEPS.map(function(step, i) {
              const StepIcon = step.icon;
              const count = statusCounts[step.key] || 0;
              const isActive = i === activeStepIndex;
              const isPast = i < activeStepIndex;
              const isFuture = i > activeStepIndex;

              return (
                <React.Fragment key={step.key}>
                  {/* Step circle */}
                  <div className="flex flex-col items-center gap-1.5 relative">
                    <div className={
                      "w-9 h-9 rounded-full flex items-center justify-center relative " +
                      (isPast
                        ? "bg-emerald-500 text-white"
                        : isActive
                          ? step.activeColor + " text-white ring-4 " + step.ringColor + " animate-pulse"
                          : "bg-muted/50 text-muted-foreground"
                      ) +
                      " transition-all duration-300"
                    }>
                      <StepIcon className="h-4 w-4" />
                      {/* Count badge */}
                      {count > 0 && (
                        <span className={
                          "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full " +
                          "flex items-center justify-center text-[9px] font-bold px-1 " +
                          (isActive
                            ? "bg-emerald-500 text-white ring-2 ring-white"
                            : isPast
                              ? "bg-emerald-400 text-white"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          )
                        }>
                          {count}
                        </span>
                      )}
                    </div>
                    <span className={
                      "text-[10px] whitespace-nowrap font-medium " +
                      (isPast ? "text-emerald-600" : isActive ? "text-foreground" : "text-muted-foreground")
                    }>
                      {step.label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {i < ESCROW_STEPS.length - 1 && (
                    <div className={
                      "flex-1 h-0.5 min-w-[16px] mx-1 rounded-full transition-colors duration-300 " +
                      (isPast ? "bg-emerald-500" : isActive ? "bg-gradient-to-l from-muted-foreground/20 to-emerald-500" : "bg-muted-foreground/15")
                    } />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Recent Orders ─── */}
      {recent.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-emerald-500" />آخر الطلبات</CardTitle></CardHeader>
          <CardContent className="pb-3 px-4 space-y-2">
            {recent.map(function(inv) {
              return (
                <div key={inv.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs truncate">{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{inv.customerName || inv.customerPiUid}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={inv.status} />
                    <span className="text-[11px] font-semibold text-emerald-600">{formatPi(inv.total)}π</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Recent Activity Feed (Enhanced) ─── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            النشاط الأخير
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-4 space-y-1">
          {logs.length > 0 ? (
            logs.slice(0, 8).map(function(log) {
              const iconInfo = ACTIVITY_ICONS[log.type] || ACTIVITY_ICONS.pi;
              const LogIcon = iconInfo.icon;
              const isDebit = log.type === "expense" || log.type === "refund";
              return (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <div className={"w-7 h-7 rounded-lg flex items-center justify-center shrink-0 " + iconInfo.bg}>
                    <LogIcon className={"h-3.5 w-3.5 " + iconInfo.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{log.description}</p>
                    <p className="text-[10px] text-muted-foreground">{relativeTime(log.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={"text-[11px] font-semibold " + (isDebit ? "text-red-500" : "text-emerald-600")}>
                      {isDebit ? "-" : "+"}{formatPi(log.amount)} π
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            /* Placeholder activity when no logs */
            PLACEHOLDER_ACTIVITY.map(function(item, idx) {
              const ItemIcon = item.icon;
              return (
                <div key={idx} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0 opacity-40">
                  <div className={"w-7 h-7 rounded-lg flex items-center justify-center shrink-0 " + item.bg}>
                    <ItemIcon className={"h-3.5 w-3.5 " + item.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
