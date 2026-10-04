"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package, AlertTriangle, Search, Loader2, Plus, ArrowUpDown,
  ChevronDown, ChevronUp, RefreshCw, CircleDot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api-client";
import { fmtDate, fmtTime } from "@/lib/helpers";
import type { InventoryData, InventoryMovementData } from "@/lib/types";

/* ═══ Inventory ═══ */
export function InventoryView({ storeId, piUid }: { storeId: string; piUid: string }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [search, setSearch] = useState("");
  const [restockOpen, setRestockOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState<InventoryData | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockReason, setRestockReason] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMovements, setShowMovements] = useState(false);

  const invRes = useQuery({
    queryKey: ["inventory", storeId],
    queryFn: function() { return api.get("/api/inventory?storeId=" + storeId + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const inventory = ((invRes.data as Record<string, unknown>)?.data || []) as InventoryData[];

  const movementRes = useQuery({
    queryKey: ["inventory-movements", storeId],
    queryFn: function() { return api.get("/api/inventory/movement?storeId=" + storeId + "&limit=50", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId && showMovements,
    staleTime: 30_000,
  });
  const movements = ((movementRes.data as Record<string, unknown>)?.data || []) as InventoryMovementData[];

  const debouncedSearch = useDebounce(search, 250);
  const filtered = inventory.filter(function(inv) {
    if (filter === "low" && !inv.isLowStock) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const name = (inv.product?.name || "").toLowerCase();
      const sku = (inv.product?.sku || "").toLowerCase();
      return name.indexOf(q) !== -1 || sku.indexOf(q) !== -1;
    }
    return true;
  });

  const lowStockCount = inventory.filter(function(inv) { return inv.isLowStock; }).length;

  const handleRestock = function() {
    if (!selectedInv || !restockQty || parseInt(restockQty) <= 0) return;
    setSaving(true);
    const qty = parseInt(restockQty);
    api.post("/api/inventory/movement", {
      inventoryId: selectedInv.id,
      type: "in",
      quantity: qty,
      reason: restockReason.trim() || "تزويد المخزون",
    }, piUid).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["inventory", storeId] });
        qc.invalidateQueries({ queryKey: ["inventory-movements", storeId] });
        qc.invalidateQueries({ queryKey: ["products", storeId] });
        setRestockOpen(false);
        setRestockQty("");
        setRestockReason("");
        setSelectedInv(null);
        toast({ title: "تم تزويد المخزون بنجاح" });
      } else {
        res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل التزويد", description: err.error || "", variant: "destructive" }); });
      }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const handleAdjust = function() {
    if (!selectedInv || !adjustQty) return;
    setSaving(true);
    const newQty = parseInt(adjustQty);
    if (isNaN(newQty)) { toast({ title: "أدخل رقماً صحيحاً", variant: "destructive" }); setSaving(false); return; }
    api.patch("/api/inventory", {
      id: selectedInv.id,
      quantity: newQty,
      reason: adjustReason.trim() || "تعديل يدوي",
    }, piUid).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["inventory", storeId] });
        qc.invalidateQueries({ queryKey: ["inventory-movements", storeId] });
        qc.invalidateQueries({ queryKey: ["products", storeId] });
        setAdjustOpen(false);
        setAdjustQty("");
        setAdjustReason("");
        setSelectedInv(null);
        toast({ title: "تم تعديل المخزون" });
      } else {
        res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل التعديل", description: err.error || "", variant: "destructive" }); });
      }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const getAvailable = function(inv: InventoryData) {
    return inv.availableQuantity !== undefined ? inv.availableQuantity : inv.quantity - inv.reservedQuantity;
  };

  const statusColor = function(inv: InventoryData) {
    const avail = getAvailable(inv);
    if (avail <= 0) return "text-red-500";
    if (avail <= inv.lowStockThreshold) return "text-amber-500";
    return "text-emerald-500";
  };

  const statusLabel = function(inv: InventoryData) {
    const avail = getAvailable(inv);
    if (avail <= 0) return "غير متوفر";
    if (avail <= inv.lowStockThreshold) return "منخفض";
    return "متوفر";
  };

  const statusBg = function(inv: InventoryData) {
    const avail = getAvailable(inv);
    if (avail <= 0) return "bg-red-500/10 border-red-500/20 text-red-600";
    if (avail <= inv.lowStockThreshold) return "bg-amber-500/10 border-amber-500/20 text-amber-600";
    return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-base">المخزون</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={function() { qc.invalidateQueries({ queryKey: ["inventory", storeId] }); }} className="text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />تحديث
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Package className="h-4 w-4 text-emerald-500" /></div>
            <div><p className="text-[10px] text-muted-foreground">إجمالي المنتجات</p><p className="font-bold text-sm">{inventory.length}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-amber-500" /></div>
            <div><p className="text-[10px] text-muted-foreground">مخزون منخفض</p><p className="font-bold text-sm">{lowStockCount}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><CircleDot className="h-4 w-4 text-amber-500" /></div>
            <div><p className="text-[10px] text-muted-foreground">محجوز ضمان</p><p className="font-bold text-sm text-amber-600">{inventory.reduce(function(s, inv) { return s + inv.reservedQuantity; }, 0)}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center"><CircleDot className="h-4 w-4 text-teal-500" /></div>
            <div><p className="text-[10px] text-muted-foreground">إجمالي الوحدات</p><p className="font-bold text-sm">{inventory.reduce(function(s, inv) { return s + inv.quantity; }, 0)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="بحث بالاسم أو SKU..." className="text-sm pr-9" /></div>
        <div className="flex rounded-lg border p-0.5 bg-muted/50">
          <button onClick={function() { setFilter("all"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors" + (filter === "all" ? " bg-emerald-600 text-white" : " text-muted-foreground")}>الكل</button>
          <button onClick={function() { setFilter("low"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors" + (filter === "low" ? " bg-emerald-600 text-white" : " text-muted-foreground")}>منخفض</button>
        </div>
      </div>

      {/* Inventory Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{search || filter === "low" ? "لا توجد نتائج" : "لا توجد سجلات مخزون"}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{filter === "low" ? "جميع المنتجات فوق الحد الأدنى" : "أضف منتجات أولاً"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(function(inv) {
            return (
              <Card key={inv.id} className="border-0 shadow-sm">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + (function() { const a = getAvailable(inv); if (a <= 0) return "bg-red-500/10"; if (a <= inv.lowStockThreshold) return "bg-amber-500/10"; return "bg-emerald-500/10"; })()}>
                        <Package className={"h-4 w-4 " + statusColor(inv)} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate">{inv.product?.name || "منتج غير معروف"}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {inv.product?.sku && <span className="font-mono" dir="ltr">SKU: {inv.product.sku}</span>}
                          {inv.product?.category && <span className="text-emerald-600">{inv.product.category.nameAr}</span>}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={"text-[9px] px-1.5 py-0 h-4 border " + statusBg(inv)}>{statusLabel(inv)}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div><p className="text-muted-foreground">المتوفر</p><p className={"font-bold text-xs " + (function() { const a = getAvailable(inv); if (a <= 0) return "text-red-600"; if (a <= inv.lowStockThreshold) return "text-amber-600"; return "text-emerald-600"; })()}>{getAvailable(inv)}</p></div>
                    <div><p className="text-muted-foreground">المحجوز</p><p className="font-bold text-xs text-amber-600">{inv.reservedQuantity}</p></div>
                    <div><p className="text-muted-foreground">الإجمالي</p><p className="font-bold text-xs">{inv.quantity}</p></div>
                  </div>
                  {inv.reservedQuantity > 0 && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20">{inv.reservedQuantity} محجوز ضمان</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 border-emerald-500/30 text-emerald-600" onClick={function() { setSelectedInv(inv); setRestockOpen(true); }}>
                      <Plus className="h-3 w-3" />تزويد
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={function() { setSelectedInv(inv); setAdjustQty(String(inv.quantity)); setAdjustOpen(true); }}>
                      <ArrowUpDown className="h-3 w-3" />تعديل
                    </Button>
                    {inv.lastRestockedAt && <span className="text-[9px] text-muted-foreground mr-auto">آخر تزويد: {fmtDate(inv.lastRestockedAt)}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Movements Log */}
      <div className="border-t pt-4">
        <button onClick={function() { setShowMovements(!showMovements); }} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          {showMovements ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          سجل حركات المخزون
        </button>
        {showMovements && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد حركات مسجلة</p>
            ) : movements.map(function(m) {
              const movTypeMap: Record<string, string> = { in: "تزويد", out: "صرف", adjustment: "تعديل", return: "إرجاع", sale: "بيع", sale_return: "إرجاع بيع" };
              return (
                <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={"text-[9px] px-1 py-0 h-4 " + (m.quantity > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20")}>
                      {movTypeMap[m.type] || m.type}
                    </Badge>
                    <span className="truncate">{m.inventory?.product?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={"font-mono font-bold " + (m.quantity > 0 ? "text-emerald-600" : "text-red-500")}>{m.quantity > 0 ? "+" : ""}{m.quantity}</span>
                    <span className="text-[10px] text-muted-foreground">{fmtDate(m.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restock Dialog */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-sm">تزويد المخزون</DialogTitle><DialogDescription className="text-xs">أضف كمية جديدة لـ {selectedInv?.product?.name || ""}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            {selectedInv && selectedInv.reservedQuantity > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                {selectedInv.reservedQuantity} وحدة محجوزة في الضمان حالياً — لا تؤثر على الكمية المضافة
              </div>
            )}
            <div className="space-y-1.5"><Label className="text-xs">الكمية المضافة *</Label><Input type="number" min="1" inputMode="numeric" value={restockQty} onChange={function(e) { setRestockQty(e.target.value); }} placeholder="مثال: 50" className="text-sm" dir="ltr" /></div>
            <div className="space-y-1.5"><Label className="text-xs">السبب (اختياري)</Label><Input value={restockReason} onChange={function(e) { setRestockReason(e.target.value); }} placeholder="مثال: شحنة جديدة" className="text-sm" /></div>
          </div>
          <DialogFooter><Button onClick={handleRestock} disabled={!restockQty || parseInt(restockQty) <= 0 || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Plus className="h-3.5 w-3.5 ml-1.5" />}تزويد</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-sm">تعديل المخزون</DialogTitle><DialogDescription className="text-xs">عيّن الكمية الجديدة لـ {selectedInv?.product?.name || ""}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">الكمية الجديدة *</Label><Input type="number" min="0" inputMode="numeric" value={adjustQty} onChange={function(e) { setAdjustQty(e.target.value); }} className="text-sm" dir="ltr" /></div>
            <div className="space-y-1.5"><Label className="text-xs">السبب (اختياري)</Label><Input value={adjustReason} onChange={function(e) { setAdjustReason(e.target.value); }} placeholder="مثال: جرد يدوي" className="text-sm" /></div>
          </div>
          <DialogFooter><Button onClick={handleAdjust} disabled={!adjustQty || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <ArrowUpDown className="h-3.5 w-3.5 ml-1.5" />}تعديل</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
