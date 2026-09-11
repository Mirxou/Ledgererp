"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Search, Loader2, Receipt, XCircle, Download, Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api-client";
import { formatPi } from "@/lib/pi-amount";
import { StatusBadge, STATUS_MAP, fmtDate, fmtTime, copyText } from "@/lib/helpers";
import { ESCROW_FEE_RATE } from "@/lib/constants";
import type { StoreData, ProductData, InvoiceData } from "@/lib/types";

/* ═══ Invoices ═══ */
export function InvoicesView({ store, products, piUid }: { store: StoreData; products: ProductData[]; piUid: string }) {
  const qc = useQueryClient();
  const toast = useToast().toast;
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerUid, setCustomerUid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([{ productName: "", quantity: 1, unitPrice: 0 }]);
  const [detail, setDetail] = useState<InvoiceData | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const addItem = function() { setItems(items.concat([{ productName: "", quantity: 1, unitPrice: 0 }])); };
  const removeItem = function(idx: number) { setItems(items.filter(function(_, i) { return i !== idx; })); };
  const updateItem = function(idx: number, field: string, value: string | number) {
    const u = items.map(function(item, i) { if (i === idx) { const copy = Object.assign({}, item); (copy as Record<string, unknown>)[field] = value; return copy; } return item; });
    setItems(u);
  };

  const subtotal = items.reduce(function(s, i) { return s + i.unitPrice * i.quantity; }, 0);
  const escrowFee = subtotal * ESCROW_FEE_RATE;
  const total = subtotal + escrowFee;
  const canCreate = customerUid.trim() !== "" && items.some(function(i) { return i.productName && i.unitPrice > 0; });

  const handleCreate = function() {
    if (!canCreate) return;
    setSaving(true);
    api.post("/api/invoices", { storeId: store.id, customerPiUid: customerUid.trim(), customerName: customerName.trim(), items: items, notes: notes, escrowFee: escrowFee }, piUid).then(function(res) {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["invoices"] });
        setOpen(false); setCustomerName(""); setCustomerUid(""); setNotes("");
        setItems([{ productName: "", quantity: 1, unitPrice: 0 }]);
        toast({ title: "تم إنشاء الفاتورة" });
      } else { res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل إنشاء الفاتورة", description: err.error || "خطأ غير معروف", variant: "destructive" }); }); }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setSaving(false); });
  };

  const invRes = useQuery({
    queryKey: ["invoices", "merchant", store.id],
    queryFn: function() { return api.get("/api/invoices?storeId=" + store.id + "&page=1&limit=100", piUid).then(function(r) { return r.json(); }); },
    staleTime: 30_000,
  });
  const invoiceList = ((invRes.data as Record<string, unknown>)?.data || []) as InvoiceData[];
  const debouncedInvoiceSearch = useDebounce(invoiceSearch, 250);
  const filteredInvoices = debouncedInvoiceSearch ? invoiceList.filter(function(inv) {
    const q = debouncedInvoiceSearch.toLowerCase();
    return inv.invoiceNumber.toLowerCase().indexOf(q) !== -1 || inv.customerName.toLowerCase().indexOf(q) !== -1 || inv.customerPiUid.toLowerCase().indexOf(q) !== -1;
  }) : invoiceList;

  const handleExport = useCallback(function() {
    const csv = [
      ["\u200F\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629", "\u0627\u0644\u0632\u0628\u0648\u0646", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639", "\u0627\u0644\u062D\u0627\u0644\u0629", "\u0627\u0644\u062A\u0627\u0631\u064A\u062E"].join(","),
      ...filteredInvoices.map(function(inv) {
        return [inv.invoiceNumber, inv.customerName, formatPi(inv.total), STATUS_MAP[inv.status]?.label || inv.status, fmtDate(inv.createdAt)].join(",");
      })
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredInvoices]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={invoiceSearch} onChange={function(e) { setInvoiceSearch(e.target.value); }} placeholder="بحث عن فاتورة..." className="text-sm pr-9" /></div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredInvoices.length === 0} className="text-xs shrink-0"><Download className="h-3.5 w-3.5 ml-1.5" />تصدير</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0"><Plus className="h-3.5 w-3.5 ml-1.5" />فاتورة جديدة</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-sm">فاتورة جديدة</DialogTitle><DialogDescription className="text-xs">إنشاء فاتورة مع ضمان الدفع</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">اسم المشتري</Label><Input value={customerName} onChange={function(e) { setCustomerName(e.target.value); }} placeholder="اختياري" className="text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">UID المشتري *</Label><Input value={customerUid} onChange={function(e) { setCustomerUid(e.target.value); }} placeholder="من Pi" className="text-sm" dir="ltr" /></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">المنتجات</Label>{items.length < 10 && <Button variant="ghost" size="sm" onClick={addItem} className="h-7 text-xs text-emerald-600"><Plus className="h-3 w-3 ml-1" />إضافة</Button>}</div>
                <div className="space-y-2">
                  {items.map(function(item, idx) {
                    const activeProducts = products.filter(function(p) { return p.isActive; });
                    return (
                      <div key={idx} className="grid grid-cols-[1fr_48px_68px_28px] gap-1.5 items-end">
                        <div>
                          {idx === 0 && <span className="text-[10px] text-muted-foreground">المنتج</span>}
                          {idx === 0 ? (
                            <Input value={item.productName} onChange={function(e) { updateItem(idx, "productName", e.target.value); }} placeholder="اسم المنتج" className="text-xs h-8" />
                          ) : (
                            <select value={item.productName} onChange={function(e) { updateItem(idx, "productName", e.target.value); let found: ProductData | null = null; for (let k = 0; k < activeProducts.length; k++) { if (activeProducts[k].name === e.target.value) { found = activeProducts[k]; break; } } if (found) updateItem(idx, "unitPrice", found.price); }} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
                              <option value="">اختر</option>
                              {activeProducts.map(function(p) { return <option key={p.id} value={p.name}>{p.name} — {p.price}π</option>; })}
                            </select>
                          )}
                        </div>
                        <div>{idx === 0 && <span className="text-[10px] text-muted-foreground">الكمية</span>}<Input type="number" min="1" inputMode="numeric" value={item.quantity} onChange={function(e) { updateItem(idx, "quantity", parseInt(e.target.value) || 1); }} className="text-xs h-8 text-center" /></div>
                        <div>{idx === 0 && <span className="text-[10px] text-muted-foreground">السعر</span>}<Input type="number" step="0.01" value={item.unitPrice} onChange={function(e) { updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0); }} className="text-xs h-8" dir="ltr" /></div>
                        <Button variant="ghost" size="sm" onClick={function() { removeItem(idx); }} className="h-8 w-8 p-0 text-destructive" disabled={items.length <= 1}><XCircle className="h-3.5 w-3.5" /></Button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">ملاحظات</Label><Textarea value={notes} onChange={function(e) { setNotes(e.target.value); }} placeholder="اختياري..." className="text-sm min-h-[56px]" /></div>
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground"><span>المجموع الفرعي</span><span>{formatPi(subtotal)} π</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>رسوم الضمان ({(ESCROW_FEE_RATE * 100).toFixed(0)}%)</span><span>{formatPi(escrowFee)} π</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-sm"><span>الإجمالي</span><span className="text-emerald-600">{formatPi(total)} π</span></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!canCreate || saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Receipt className="h-3.5 w-3.5 ml-1.5" />}إنشاء</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filteredInvoices.length === 0 ? (
        invoiceSearch ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد نتائج</p>
            <p className="text-xs text-muted-foreground/70 mt-1">جرب بحثاً آخر</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">لا توجد فواتير بعد</p>
            <p className="text-xs text-muted-foreground/70 mt-1">أنشئ أول فاتورة</p>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {filteredInvoices.map(function(inv) {
            return (
              <Card key={inv.id} className="border-0 shadow-sm">
                <CardContent className="p-3.5 space-y-2 cursor-pointer" onClick={function() { setDetail(inv); }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Receipt className="h-4 w-4 text-emerald-600" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate" dir="ltr">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.customerName || inv.customerPiUid} · {fmtDate(inv.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-left shrink-0"><StatusBadge status={inv.status} /><p className="text-[11px] font-bold mt-0.5 text-emerald-600">{formatPi(inv.total)} π</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={function(open) { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle className="text-sm" dir="ltr">{detail.invoiceNumber}</DialogTitle><DialogDescription className="text-xs">{fmtDate(detail.createdAt)} — {detail.customerName || detail.customerPiUid}</DialogDescription></DialogHeader>
              <div className="flex items-center gap-2"><StatusBadge status={detail.status} /><span className="text-sm font-bold text-emerald-600">{formatPi(detail.total)} π</span></div>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground">المنتجات</p>
                {detail.items.map(function(item, i) {
                  return (
                    <div key={item.id || i} className="flex items-center justify-between text-xs py-0.5">
                      <span className="truncate max-w-[50%]">{item.productName}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{item.quantity} × {formatPi(item.unitPrice)}π = <span className="font-medium text-foreground">{formatPi(item.totalPrice)}π</span></span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{formatPi(detail.subtotal)} π</span></div>
                {detail.escrowFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">رسوم الضمان</span><span>{formatPi(detail.escrowFee)} π</span></div>}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold"><span>الإجمالي</span><span className="text-emerald-600">{formatPi(detail.total)} π</span></div>
              </div>
              {detail.notes && <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2"><span className="font-medium">ملاحظات:</span> {detail.notes}</div>}
              {detail.paymentTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/30 rounded-lg p-2 break-all" dir="ltr">TX الدفع: {detail.paymentTxId}</div>}
              {detail.releaseTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/30 rounded-lg p-2 break-all" dir="ltr">TX الإطلاق: {detail.releaseTxId}</div>}
              {/* Timeline */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground">تاريخ الحالة</p>
                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">إنشاء</span><span>{fmtDate(detail.createdAt)} {fmtTime(detail.createdAt)}</span></div>
                  {detail.paidAt && <div className="flex justify-between"><span className="text-blue-500">دفع الضمان</span><span>{fmtDate(detail.paidAt)} {fmtTime(detail.paidAt)}</span></div>}
                  {detail.shippedAt && <div className="flex justify-between"><span className="text-purple-500">شحن</span><span>{fmtDate(detail.shippedAt)} {fmtTime(detail.shippedAt)}</span></div>}
                  {detail.deliveredAt && <div className="flex justify-between"><span className="text-teal-500">تسليم</span><span>{fmtDate(detail.deliveredAt)} {fmtTime(detail.deliveredAt)}</span></div>}
                  {detail.completedAt && <div className="flex justify-between"><span className="text-emerald-500">إكمال</span><span>{fmtDate(detail.completedAt)} {fmtTime(detail.completedAt)}</span></div>}
                  {detail.cancelledAt && <div className="flex justify-between"><span className="text-zinc-500">إلغاء</span><span>{fmtDate(detail.cancelledAt)} {fmtTime(detail.cancelledAt)}</span></div>}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={function() { copyText(detail!.invoiceNumber, toast, "تم نسخ رقم الفاتورة"); }}><Copy className="h-3 w-3 ml-1" />نسخ الرقم</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
