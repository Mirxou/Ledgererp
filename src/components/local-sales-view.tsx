"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Receipt, Plus, Search, Loader2, Banknote, CreditCard, CircleDot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api-client";
import { formatPi, roundPi } from "@/lib/pi-amount";
import { fmtDate } from "@/lib/helpers";
import type { LocalSaleData, LocalSaleItemData, ProductData, CustomerData, InventoryData } from "@/lib/types";

/* ═══ Local Sales ═══ */
export function LocalSalesView({ storeId, piUid, products, customers, inventory }: { storeId: string; piUid: string; products: ProductData[]; customers: CustomerData[]; inventory?: InventoryData[] }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [conflictItems, setConflictItems] = useState<Array<{ product: string; requested: number; available: number; inStock: number; reserved: number }>>([]);

  const detailSaleState = useState<LocalSaleData | null>(null);
  const detailSale = detailSaleState[0];
  const setDetailSale = detailSaleState[1];
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("none");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleNotes, setSaleNotes] = useState("");
  const [saleTax, setSaleTax] = useState("");
  const [saleDiscount, setSaleDiscount] = useState("");
  const [items, setItems] = useState([{ productName: "", quantity: 1, unitPrice: 0, _selectedProductId: "" }]);

  const salesRes = useQuery({
    queryKey: ["localSales", storeId],
    queryFn: function() { return api.get("/api/local-sales?storeId=" + storeId + "&limit=200", piUid).then(function(r) { return r.json(); }); },
    enabled: !!storeId,
    staleTime: 30_000,
  });
  const sales = ((salesRes.data as Record<string, unknown>)?.data || []) as LocalSaleData[];

  const debouncedSearch = useDebounce(search, 250);
  const filtered = debouncedSearch ? sales.filter(function(s) {
    const q = debouncedSearch.toLowerCase();
    return s.invoiceNumber.toLowerCase().indexOf(q) !== -1 || (s.customer && s.customer.name.toLowerCase().indexOf(q) !== -1);
  }) : sales;

  const getProductAvailableQty = function(productId: string): number | null {
    if (!inventory) return null;
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i].productId === productId) {
        const inv = inventory[i];
        return inv.availableQuantity !== undefined ? inv.availableQuantity : inv.quantity - inv.reservedQuantity;
      }
    }
    return null;
  };

  const activeProducts = products.filter(function(p) { return p.isActive; });

  const addItem = function() { setItems(items.concat([{ productName: "", quantity: 1, unitPrice: 0, _selectedProductId: "" }])); };
  const removeItem = function(idx: number) { if (items.length > 1) setItems(items.filter(function(_, i) { return i !== idx; })); };
  const updateItem = function(idx: number, field: string, value: string | number) {
    setItems(function(prev) {
      return prev.map(function(item, i) {
        if (i === idx) { const copy = Object.assign({}, item); (copy as Record<string, unknown>)[field] = value; return copy; }
        return item;
      });
    });
  };

  const subtotal = roundPi(items.reduce(function(s, i) { return s + i.unitPrice * i.quantity; }, 0));
  const taxAmount = roundPi(parseFloat(saleTax) || 0);
  const discountAmount = roundPi(parseFloat(saleDiscount) || 0);
  const total = roundPi(subtotal + taxAmount - discountAmount);

  const handleCreate = function() {
    if (!items.some(function(i) { return i.productName && i.unitPrice > 0; })) return;
    setSaving(true);
    api.post("/api/local-sales", {
      storeId: storeId,
      customerId: selectedCustomerId === "none" ? null : selectedCustomerId,
      paymentMethod: paymentMethod,
      notes: saleNotes.trim(),
      taxAmount: taxAmount,
      discountAmount: discountAmount,
      items: items.map(function(i) { return { productId: (i as Record<string, unknown>)._selectedProductId as string || null, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice }; }),
    }, piUid).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["localSales", storeId] });
        qc.invalidateQueries({ queryKey: ["customers", storeId] });
        qc.invalidateQueries({ queryKey: ["inventory", storeId] });
        qc.invalidateQueries({ queryKey: ["products", storeId] });
        setOpen(false);
        setItems([{ productName: "", quantity: 1, unitPrice: 0, _selectedProductId: "" }]);
        setSelectedCustomerId("none");
        setPaymentMethod("cash");
        setSaleNotes("");
        setSaleTax("");
        setSaleDiscount("");
        setConflictItems([]);
        toast({ title: "تم تسجيل البيع المحلية" });
      } else if (res.status === 409) {
        res.json().catch(function() { return {}; }).then(function(err) {
          setConflictItems(err.details || []);
          toast({ title: "لا يمكن إتمام العملية — مخزون غير كافٍ", description: err.error || "", variant: "destructive" });
        });
      } else {
        res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل التسجيل", description: err.error || "", variant: "destructive" }); });
      }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const paymentMethodBadge = function(method: string) {
    if (method === "cash") return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><Banknote className="h-2.5 w-2.5 ml-0.5" />نقدي</Badge>;
    if (method === "card") return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 border-blue-500/20"><CreditCard className="h-2.5 w-2.5 ml-0.5" />بطاقة</Badge>;
    if (method === "pi") return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-teal-500/10 text-teal-600 border-teal-500/20"><CircleDot className="h-2.5 w-2.5 ml-0.5" />Pi</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{method}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-base">المبيعات المحلية</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0"><Plus className="h-3.5 w-3.5 ml-1.5" />بيع جديدة</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-sm">تسجيل بيع محلية</DialogTitle><DialogDescription className="text-xs">بيع بنقدي أو بطاقة (بدون ضمان Pi)</DialogDescription></DialogHeader>
            <div className="space-y-4">
              {/* Conflict Warning */}
              {conflictItems.length > 0 && (
                <div className="border border-red-500/30 bg-red-50 dark:bg-red-950/20 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-bold text-red-600">لا يمكن إتمام العملية — مخزون غير كافٍ</p>
                  {conflictItems.map(function(ci, i) {
                    return (
                      <div key={i} className="text-[11px] text-red-700 dark:text-red-400 flex items-center justify-between">
                        <span className="truncate">{ci.product}</span>
                        <span className="shrink-0 font-mono">مطلوب: {ci.requested} · متوفر: {ci.available}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">الزبون (اختياري)</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="text-xs h-9"><SelectValue placeholder="بدون زبون" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">بدون زبون</SelectItem>
                      {customers.map(function(c) { return <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>; })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="text-xs">💵 نقدي</SelectItem>
                      <SelectItem value="card" className="text-xs">💳 بطاقة</SelectItem>
                      <SelectItem value="pi" className="text-xs">π Pi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">المنتجات</Label>{items.length < 10 && <Button variant="ghost" size="sm" onClick={addItem} className="h-7 text-xs text-emerald-600"><Plus className="h-3 w-3 ml-1" />إضافة</Button>}</div>
                <div className="space-y-2">
                  {items.map(function(item, idx) {
                    const selectedProductId = (item as Record<string, unknown>)._selectedProductId as string || "";
                    return (
                      <div key={idx} className="grid grid-cols-[1fr_48px_68px_28px] gap-1.5 items-end">
                        <div>
                          {idx === 0 && <span className="text-[10px] text-muted-foreground">المنتج</span>}
                          <select value={selectedProductId} onChange={function(e) { const found = activeProducts.find(function(p) { return p.id === e.target.value; }); setItems(function(prev) { return prev.map(function(it, i) { if (i === idx) return Object.assign({}, it, { _selectedProductId: e.target.value, productName: found ? found.name : "", unitPrice: found ? found.price : 0 }); return it; }); }); }} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                            <option value="">{activeProducts.length > 0 ? "اختر منتج" : "لا توجد منتجات"}</option>
                            {activeProducts.map(function(p) { const avail = getProductAvailableQty(p.id); return <option key={p.id} value={p.id}>{p.name} — {p.price}π{avail !== null ? " (متوفر: " + avail + ")" : ""}</option>; })}
                          </select>
                          {selectedProductId && getProductAvailableQty(selectedProductId) !== null && (
                            <span className={"text-[9px] " + (function() { const a = getProductAvailableQty(selectedProductId)!; const p = activeProducts.find(function(x) { return x.id === selectedProductId; }); if (a <= 0) return "text-red-600"; if (p && a <= p.lowStockThreshold) return "text-amber-600"; return "text-emerald-600"; })()}>متوفر: {getProductAvailableQty(selectedProductId)}</span>
                          )}
                        </div>
                        <div>
                          {idx === 0 && <span className="text-[10px] text-muted-foreground">الكمية</span>}
                          <Input type="number" min="1" inputMode="numeric" value={item.quantity} onChange={function(e) { updateItem(idx, "quantity", parseInt(e.target.value) || 1); }} className="text-xs h-8 text-center" />
                          {selectedProductId && getProductAvailableQty(selectedProductId) !== null && item.quantity > (getProductAvailableQty(selectedProductId) || 0) && (
                            <span className="text-[9px] text-red-600 font-medium">الكمية المطلوبة تتجاوز المخزون المتوفر ({getProductAvailableQty(selectedProductId)} متوفر)</span>
                          )}
                        </div>
                        <div>{idx === 0 && <span className="text-[10px] text-muted-foreground">السعر</span>}<Input type="number" step="0.01" value={item.unitPrice} onChange={function(e) { updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0); }} className="text-xs h-8" dir="ltr" /></div>
                        <Button variant="ghost" size="sm" onClick={function() { removeItem(idx); }} className="h-8 w-8 p-0 text-destructive" disabled={items.length <= 1}>×</Button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">الضريبة (π)</Label><Input type="number" step="0.01" value={saleTax} onChange={function(e) { setSaleTax(e.target.value); }} placeholder="0" className="text-sm" dir="ltr" /></div>
                <div className="space-y-1.5"><Label className="text-xs">الخصم (π)</Label><Input type="number" step="0.01" value={saleDiscount} onChange={function(e) { setSaleDiscount(e.target.value); }} placeholder="0" className="text-sm" dir="ltr" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">ملاحظات</Label><Input value={saleNotes} onChange={function(e) { setSaleNotes(e.target.value); }} placeholder="اختياري..." className="text-sm" /></div>
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span>{formatPi(subtotal)} π</span></div>
                {taxAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>الضريبة</span><span>{formatPi(taxAmount)} π</span></div>}
                {discountAmount > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>الخصم</span><span>-{formatPi(discountAmount)} π</span></div>}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-sm"><span>الإجمالي</span><span className="text-emerald-600">{formatPi(total)} π</span></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!items.some(function(i) { return i.productName && i.unitPrice > 0; }) || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Receipt className="h-3.5 w-3.5 ml-1.5" />}تسجيل</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="بحث برقم الفاتورة أو الزبون..." className="text-sm pr-9" /></div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{search ? "لا توجد نتائج" : "لا توجد مبيعات محلية بعد"}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">سجّل أول بيع</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(function(sale) {
            return (
              <Card key={sale.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={function() { setDetailSale(sale); }}>
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Receipt className="h-4 w-4 text-emerald-600" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate" dir="ltr">{sale.invoiceNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{sale.customer ? sale.customer.name : "زبون عابر"} · {fmtDate(sale.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-left shrink-0 space-y-1">
                      {paymentMethodBadge(sale.paymentMethod)}
                      <p className="text-[11px] font-bold text-emerald-600">{formatPi(sale.total)} π</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailSale} onOpenChange={function(o) { if (!o) setDetailSale(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailSale && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle className="text-sm" dir="ltr">{detailSale.invoiceNumber}</DialogTitle><DialogDescription className="text-xs">{fmtDate(detailSale.createdAt)} — {detailSale.customer ? detailSale.customer.name : "زبون عابر"}</DialogDescription></DialogHeader>
              <div className="flex items-center gap-2">{paymentMethodBadge(detailSale.paymentMethod)}<span className="text-sm font-bold text-emerald-600">{formatPi(detailSale.total)} π</span></div>
              <Separator />
              {detailSale.items && detailSale.items.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground">المنتجات</p>
                  {detailSale.items.map(function(item, i) {
                    return (
                      <div key={item.id || i} className="flex items-center justify-between text-xs py-0.5">
                        <span className="truncate max-w-[50%]">{item.productName}</span>
                        <span className="text-muted-foreground whitespace-nowrap">{item.quantity} × {formatPi(item.unitPrice)}π = <span className="font-medium text-foreground">{formatPi(item.totalPrice)}π</span></span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{formatPi(detailSale.subtotal)} π</span></div>
                {detailSale.taxAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">الضريبة</span><span>{formatPi(detailSale.taxAmount)} π</span></div>}
                {detailSale.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">الخصم</span><span>-{formatPi(detailSale.discountAmount)} π</span></div>}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold"><span>الإجمالي</span><span className="text-emerald-600">{formatPi(detailSale.total)} π</span></div>
              </div>
              {detailSale.notes && <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2"><span className="font-medium">ملاحظات:</span> {detailSale.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
