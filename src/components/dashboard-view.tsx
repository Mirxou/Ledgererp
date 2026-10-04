"use client";

import React, { useCallback } from "react";
import {
  FileText, Package, Shield, CheckCircle2, Store as StoreIcon,
  ArrowRightLeft, CreditCard, Truck, Wallet, Clock, ChevronDown, Receipt,
  Share2, Link, Copy, Link2, Globe, Users, AlertTriangle,
  TrendingUp, TrendingDown, CircleDot, Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPi, roundPi } from "@/lib/pi-amount";
import { StatusBadge, copyText, fmtDate, fmtTime } from "@/lib/helpers";
import { useToast } from "@/hooks/use-toast";
import type { StoreData, InvoiceData, TransactionLogData, InventoryData } from "@/lib/types";

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

  const cards = [
    { label: "إجمالي الفواتير", value: String(stats.totalInvoices || 0), icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "المنتجات", value: String(stats.totalProducts || 0), icon: Package, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "π في الضمان", value: formatPi(Number(stats.escrowedPi || 0)), icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "π مكتمل", value: formatPi(Number(stats.completedPi || 0)), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "الزبائن", value: String(stats.totalCustomers || 0), icon: Users, color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "تنبيهات مخزون", value: String(stats.lowStockCount || 0), icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "محجوز ضمان", value: String(totalReserved), icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const recent = (stats.recentOrders || []) as InvoiceData[];
  const logs = transactionLogs || [];

  // Revenue & Expenses
  const localSalesRevenue = Number(stats.localSalesRevenue || 0);
  const piEscrowRevenue = Number(stats.escrowedPi || 0);
  const piCompletedRevenue = Number(stats.completedPi || 0);
  const totalRevenue = roundPi(localSalesRevenue + piCompletedRevenue);
  const totalExpenses = Number(stats.totalExpenses || 0);
  const profitEstimate = roundPi(totalRevenue - totalExpenses);

  return (
    <div className="space-y-4">
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

      {/* Store Link Sharing */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map(function(c) {
          return (
            <Card key={c.label} className="border-0 shadow-sm">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className={"w-9 h-9 rounded-xl " + c.bg + " flex items-center justify-center shrink-0"}><c.icon className={"h-4 w-4 " + c.color} /></div>
                <div className="min-w-0"><p className="text-[11px] text-muted-foreground truncate">{c.label}</p><p className="font-bold text-base leading-tight">{c.value}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Inventory Alerts */}
      {(Number(stats.lowStockCount || 0) > 0 || reservedItemsCount > 0) && (
        <Card className="border-0 shadow-sm border-l-4" style={{ borderLeftColor: reservedItemsCount > 0 ? "var(--color-amber-500, #f59e0b)" : "var(--color-red-500, #ef4444)" }}>
          <CardContent className="p-3.5 space-y-1.5">
            <p className="text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              تنبيهات المخزون
            </p>
            {Number(stats.lowStockCount || 0) > 0 && (
              <p className="text-[11px] text-muted-foreground">{stats.lowStockCount} منتجات منخفضة المخزون</p>
            )}
            {reservedItemsCount > 0 && (
              <p className="text-[11px] text-amber-600 font-medium">{reservedItemsCount} عناصر محجوزة في الضمان ({totalReserved} وحدة)</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Revenue & Expenses */}
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
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
            <div className="min-w-0"><p className="text-[11px] text-muted-foreground truncate">إجمالي الإيرادات</p><p className="font-bold text-base leading-tight text-emerald-600">{formatPi(totalRevenue)} π</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0"><TrendingDown className="h-4 w-4 text-red-500" /></div>
            <div className="min-w-0"><p className="text-[11px] text-muted-foreground truncate">إجمالي المصروفات</p><p className="font-bold text-base leading-tight text-red-500">{formatPi(totalExpenses)} π</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Estimate */}
      <Card className="border-0 shadow-sm border-l-4" style={{ borderLeftColor: profitEstimate >= 0 ? "var(--color-emerald-500, #10b981)" : "var(--color-red-500, #ef4444)" }}>
        <CardContent className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={"w-9 h-9 rounded-xl flex items-center justify-center " + (profitEstimate >= 0 ? "bg-emerald-500/10" : "bg-red-500/10")}>
              <Wallet className={"h-4 w-4 " + (profitEstimate >= 0 ? "text-emerald-500" : "text-red-500")} />
            </div>
            <div><p className="text-[11px] text-muted-foreground">تقدير الربح (إيرادات - مصروفات)</p><p className={"font-bold text-lg " + (profitEstimate >= 0 ? "text-emerald-600" : "text-red-500")}>{formatPi(Math.abs(profitEstimate))} π {profitEstimate >= 0 ? "" : "(خسارة)"}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Escrow Flow */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" />مسار الضمان</CardTitle></CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="flex items-center justify-around text-[10px] gap-1">
            {[["إنشاء", FileText, "text-slate-500 bg-slate-100 dark:bg-slate-800"], ["دفع", CreditCard, "text-blue-500 bg-blue-50 dark:bg-blue-950/50"], ["شحن", Truck, "text-purple-500 bg-purple-50 dark:bg-purple-950/50"], ["تسليم", CheckCircle2, "text-teal-500 bg-teal-50 dark:bg-teal-950/50"], ["إطلاق", Wallet, "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50"]].map(function(step, i, arr) {
              const stepLabel = step[0] as string;
              const StepIcon = step[1] as React.ElementType;
              const stepColor = step[2] as string;
              return (
                <div key={stepLabel} className="flex items-center gap-1 shrink-0">
                  <div className={"w-7 h-7 rounded-lg " + stepColor + " flex items-center justify-center"}><StepIcon className="h-3.5 w-3.5" /></div>
                  <span className="text-muted-foreground whitespace-nowrap hidden sm:block">{stepLabel}</span>
                  {i < arr.length - 1 && <ChevronDown className="h-3 w-3 text-muted-foreground/30 hidden sm:block" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
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

      {/* Recent Activity (Transaction Logs) */}
      {logs.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-bold flex items-center gap-2"><CircleDot className="h-3.5 w-3.5 text-emerald-500" />النشاط الأخير</CardTitle></CardHeader>
          <CardContent className="pb-3 px-4 space-y-2">
            {logs.slice(0, 5).map(function(log) {
              const typeMap: Record<string, string> = { cash: "💵 نقدي", pi: "π Pi", ousd: "💲 OUSD", expense: "📉 مصروف", refund: "↩️ إرجاع" };
              return (
                <div key={log.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs shrink-0">{typeMap[log.type] || log.type}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{log.description}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={"text-[11px] font-semibold " + (log.type === "expense" || log.type === "refund" ? "text-red-500" : "text-emerald-600")}>
                      {log.type === "expense" || log.type === "refund" ? "-" : "+"}{formatPi(log.amount)} π
                    </span>
                    <span className="text-[10px] text-muted-foreground">{fmtTime(log.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
