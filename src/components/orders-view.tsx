"use client";

import React, { useState } from "react";
import {
  ShoppingCart, Store, Search, Receipt, Package,
  CreditCard, Truck, CheckCircle2, Wallet, AlertTriangle,
  Ban, ChevronDown, ChevronUp, Loader2, Copy, Share2,
  Scale, RotateCcw, XCircle, CheckCheck, MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatPi } from "@/lib/pi-amount";
import { useDebounce } from "@/hooks/use-debounce";
import { StatusBadge, fmtDate, fmtTime, copyText } from "@/lib/helpers";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import type { StoreData, InvoiceData } from "@/lib/types";

/* ═══ Orders ═══ */
export function OrdersView({ merchantInvoices, customerInvoices, store, customerUid, onPay, onShip, onConfirmDelivery, onRelease, onDispute, onCancel, onRefresh }: {
  merchantInvoices: InvoiceData[]; customerInvoices: InvoiceData[];
  store: StoreData; customerUid: string;
  onPay: (i: InvoiceData) => void; onShip: (i: InvoiceData) => void;
  onConfirmDelivery: (i: InvoiceData) => void; onRelease: (i: InvoiceData) => void;
  onDispute: (i: InvoiceData) => void; onCancel: (i: InvoiceData) => void;
  onRefresh?: () => void;
}) {
  /* Pass customerUid down to OrderCard for buyer-action API calls */
  const [view, setView] = useState<string>("merchant");
  const [filter, setFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const invoices = view === "merchant" ? merchantInvoices : customerInvoices;
  const statusFiltered = filter ? invoices.filter(function(inv) { return inv.status === filter; }) : invoices;
  const debouncedOrderSearch = useDebounce(orderSearch, 250);
  const filtered = debouncedOrderSearch ? statusFiltered.filter(function(inv) {
    const q = debouncedOrderSearch.toLowerCase();
    return inv.invoiceNumber.toLowerCase().indexOf(q) !== -1 || inv.customerName.toLowerCase().indexOf(q) !== -1 || (inv.store && inv.store.name.toLowerCase().indexOf(q) !== -1);
  }) : statusFiltered;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-base shrink-0">الطلبات</h2>
          <div className="flex gap-2">
            <div className="flex rounded-lg border p-0.5 bg-muted/50">
              <button onClick={function() { setView("merchant"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors" + (view === "merchant" ? " bg-emerald-600 text-white" : " text-muted-foreground")}><Store className="h-3 w-3 inline ml-1" />بائع</button>
              <button onClick={function() { setView("customer"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors" + (view === "customer" ? " bg-emerald-600 text-white" : " text-muted-foreground")}><ShoppingCart className="h-3 w-3 inline ml-1" />مشتري</button>
            </div>
          </div>
        </div>
        <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={orderSearch} onChange={function(e) { setOrderSearch(e.target.value); }} placeholder="بحث عن طلب..." className="text-sm pr-9" /></div>
      </div>

      {merchantInvoices.length === 0 && customerInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">لا توجد طلبات بعد</p>
          <p className="text-xs text-muted-foreground/70 mt-1">ستظهر الطلبات هنا عند إنشاء فواتير</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground"><ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد طلبات بهذا التصنيف</p></CardContent></Card>
      ) : (
        <div className="space-y-2.5 max-h-[70vh] overflow-y-auto">
          {filtered.map(function(inv) {
            return (
              <OrderCard key={inv.id} invoice={inv} view={view} store={store} customerUid={customerUid} onPay={onPay} onShip={onShip} onConfirmDelivery={onConfirmDelivery} onRelease={onRelease} onDispute={onDispute} onCancel={onCancel} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderCard({ invoice: inv, view, store, customerUid, onPay, onShip, onConfirmDelivery, onRelease, onDispute, onCancel, onRefresh }: {
  invoice: InvoiceData; view: string; store: StoreData; customerUid: string;
  onPay: (i: InvoiceData) => void; onShip: (i: InvoiceData) => void;
  onConfirmDelivery: (i: InvoiceData) => void; onRelease: (i: InvoiceData) => void;
  onDispute: (i: InvoiceData) => void; onCancel: (i: InvoiceData) => void;
  onRefresh?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveAction, setResolveAction] = useState<"refund" | "fulfill" | "reject">("refund");
  const [resolveReason, setResolveReason] = useState("");
  const [shipOpen, setShipOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const toast = useToast().toast;
  const qc = React.useRef<ReturnType<typeof import("@tanstack/react-query").useQueryClient> | null>(null);

  const invoiceLink = typeof window !== "undefined" ? window.location.origin + "?invoice=" + inv.invoiceNumber : "";

  const canPay = view === "customer" && inv.status === "pending";
  const canShip = view === "merchant" && inv.status === "paid_escrow";
  const canConfirm = view === "customer" && inv.status === "shipped";
  const canRelease = view === "merchant" && inv.status === "delivered";
  const canDispute = view === "customer" && (inv.status === "paid_escrow" || inv.status === "shipped");
  const canCancel = inv.status === "pending";
  const canResolve = view === "merchant" && inv.status === "disputed";
  const canCancelDispute = view === "customer" && inv.status === "disputed";

  const handleResolveDispute = function() {
    setLoading(true);
    api.post("/api/invoices/resolve-dispute", {
      invoiceId: inv.id,
      action: resolveAction,
      reason: resolveReason.trim(),
    }, view === "merchant" ? store.piUid : customerUid).then(function(res) {
      if (res.ok) {
        toast({ title: resolveAction === "refund" ? "تم الموافقة على الاسترجاع" : resolveAction === "fulfill" ? "تم تأكيد التسليم" : "تم رفض النزاع" });
        if (onRefresh) onRefresh();
      } else {
        res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل حل النزاع", description: err.error || "", variant: "destructive" }); });
      }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setLoading(false); setResolveOpen(false); });
  };

  const handleCancelDispute = function() {
    setLoading(true);
    api.post("/api/invoices/buyer-action", { invoiceId: inv.id, action: "cancelDispute" }, customerUid).then(function(res) {
      if (res.ok) {
        toast({ title: "تم سحب النزاع" });
        if (onRefresh) onRefresh();
      } else {
        res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل سحب النزاع", description: err.error || "", variant: "destructive" }); });
      }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() { setLoading(false); });
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0"><Receipt className="h-4 w-4 text-emerald-600" /></div>
            <div className="min-w-0">
              <p className="font-semibold text-xs truncate" dir="ltr">{inv.invoiceNumber}</p>
              <p className="text-[10px] text-muted-foreground">{view === "merchant" ? (inv.customerName || inv.customerPiUid) : (inv.store ? inv.store.name : "—")} · {fmtDate(inv.createdAt)}</p>
            </div>
          </div>
          <div className="text-left shrink-0"><StatusBadge status={inv.status} /><p className="text-xs font-bold mt-0.5 text-emerald-600">{formatPi(inv.total)} π</p></div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Package className="h-3 w-3" /><span>{inv.items ? inv.items.length : 0} منتج</span><span>·</span><span>{formatPi(inv.subtotal)} π</span>
          {inv.escrowFee > 0 && <><span>·</span><span>ضمان {formatPi(inv.escrowFee)} π</span></>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {canPay && <ActionBtn icon={<CreditCard className="h-3 w-3 ml-1" />} label="دفع بالـ Pi" onClick={function() { onPay(inv); }} primary />}
          {canShip && <ActionBtn icon={<Truck className="h-3 w-3 ml-1" />} label="شحن" onClick={function() { setShipOpen(true); }} outline="border-blue-500/30 text-blue-600" />}
          {canConfirm && <ActionBtn icon={<CheckCircle2 className="h-3 w-3 ml-1" />} label="تأكيد التسليم" onClick={function() { onConfirmDelivery(inv); }} outline="border-teal-500/30 text-teal-600" />}
          {canRelease && <ActionBtn icon={<Wallet className="h-3 w-3 ml-1" />} label="إطلاق Pi" onClick={function() { setLoading(true); onRelease(inv); setLoading(false); }} primary loading={loading} />}
          {canDispute && <ActionBtn icon={<AlertTriangle className="h-3 w-3 ml-1" />} label="فتح نزاع" onClick={function() { setDisputeOpen(true); }} outline="border-red-500/30 text-red-500" />}
          {canResolve && <ActionBtn icon={<Scale className="h-3 w-3 ml-1" />} label="حل النزاع" onClick={function() { setResolveOpen(true); }} outline="border-amber-500/30 text-amber-600" />}
          {canCancelDispute && <ActionBtn icon={<RotateCcw className="h-3 w-3 ml-1" />} label="سحب النزاع" onClick={handleCancelDispute} outline="border-teal-500/30 text-teal-600" loading={loading} />}
          {canCancel && (
            <AlertDialog><AlertDialogTrigger asChild><ActionBtn icon={<Ban className="h-3 w-3 ml-1" />} label="إلغاء" outline="border-red-500/30 text-red-500" /></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">إلغاء الطلب</AlertDialogTitle><AlertDialogDescription className="text-xs">هل تريد إلغاء هذا الطلب؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">لا</AlertDialogCancel><AlertDialogAction onClick={function() { onCancel(inv); }} className="text-xs bg-red-600 hover:bg-red-700">نعم، إلغاء</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          )}
          <button onClick={function() { setExpanded(!expanded); }} className="h-7 px-2 text-[11px] text-muted-foreground mr-auto rounded-md hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}التفاصيل
          </button>
          <button onClick={function() { copyText(invoiceLink, toast, "تم نسخ رابط الفاتورة"); }} className="h-7 px-2 text-[11px] text-emerald-600 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors" title="نسخ رابط الفاتورة للمشتري">
            <Share2 className="h-3 w-3" />
          </button>
        </div>

        {/* Dispute Resolution Panel — shown for disputed invoices */}
        {inv.status === "disputed" && (
          <DisputeResolutionPanel
            invoice={inv}
            view={view}
            store={store}
            customerUid={customerUid}
            loading={loading}
            setLoading={setLoading}
            onRefresh={onRefresh}
            toast={toast}
          />
        )}

        {expanded && (
          <div className="border-t pt-2.5 space-y-3">
            {/* Escrow Flow Status Indicator */}
            <EscrowFlowIndicator status={inv.status} />

            {/* Escrow Progress Bar */}
            <EscrowProgressBar status={inv.status} />

            <p className="text-[10px] font-semibold text-muted-foreground">المنتجات</p>
            {inv.items && inv.items.map(function(item, i) {
              return (
                <div key={item.id || i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-foreground truncate max-w-[50%]">{item.productName}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{item.quantity} × {formatPi(item.unitPrice)}π = <span className="font-medium text-foreground">{formatPi(item.totalPrice)}π</span></span>
                </div>
              );
            })}
            {inv.notes && <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mt-1"><span className="font-medium">ملاحظات:</span> {inv.notes}</div>}
            {inv.paymentTxId && <div className="text-[9px] text-muted-foreground font-mono bg-muted/50 rounded-lg p-1.5 mt-1 break-all" dir="ltr">TX: {inv.paymentTxId}</div>}
            {/* Status timeline */}
            <div className="text-[10px] space-y-0.5 mt-2 pt-2 border-t">
              <div className="flex justify-between"><span className="text-muted-foreground">إنشاء</span><span>{fmtDate(inv.createdAt)} {fmtTime(inv.createdAt)}</span></div>
              {inv.paidAt && <div className="flex justify-between"><span className="text-blue-500">في الضمان</span><span>{fmtDate(inv.paidAt)} {fmtTime(inv.paidAt)}</span></div>}
              {inv.shippedAt && <div className="flex justify-between"><span className="text-purple-500">تم الشحن</span><span>{fmtDate(inv.shippedAt)} {fmtTime(inv.shippedAt)}</span></div>}
              {inv.deliveredAt && <div className="flex justify-between"><span className="text-teal-500">تم التسليم</span><span>{fmtDate(inv.deliveredAt)} {fmtTime(inv.deliveredAt)}</span></div>}
              {inv.completedAt && <div className="flex justify-between"><span className="text-emerald-500">مكتمل</span><span>{fmtDate(inv.completedAt)} {fmtTime(inv.completedAt)}</span></div>}
            </div>
          </div>
        )}
      </CardContent>

      {/* Dispute Dialog — enhanced with evidence field */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />فتح نزاع</DialogTitle>
            <DialogDescription className="text-xs">أخبرنا سبب النزاع على هذا الطلب</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">السبب</Label>
              <Textarea value={disputeReason} onChange={function(e) { setDisputeReason(e.target.value); }} placeholder="مثال: المنتج لم يصل، المنتج مختلف عن الوصف..." className="text-sm min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">وصف الأدلة</Label>
              <Textarea value={disputeEvidence} onChange={function(e) { setDisputeEvidence(e.target.value); }} placeholder="أرفق وصفاً للأدلة الداعمة لنزاعك (صور، رسائل، إيصالات...)" className="text-sm min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={function() { setDisputeOpen(false); }} className="text-xs">إلغاء</Button>
            <Button size="sm" disabled={disputeSubmitting || !disputeReason.trim()} onClick={function() {
              setDisputeSubmitting(true);
              api.post("/api/invoices/resolve-dispute", {
                invoiceId: inv.id,
                action: "open",
                reason: disputeReason.trim() + (disputeEvidence.trim() ? " | أدلة: " + disputeEvidence.trim() : ""),
              }, customerUid).then(function(res) {
                if (res.ok) {
                  toast({ title: "تم فتح النزاع بنجاح" });
                  if (onRefresh) onRefresh();
                } else {
                  res.json().catch(function() { return {}; }).then(function(err) { toast({ title: "فشل فتح النزاع", description: err.error || "", variant: "destructive" }); });
                }
              }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() {
                setDisputeSubmitting(false);
                setDisputeOpen(false);
                setDisputeReason("");
                setDisputeEvidence("");
              });
            }} className="bg-red-600 hover:bg-red-700 text-white text-xs">
              {disputeSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <AlertTriangle className="h-3.5 w-3.5 ml-1.5" />}فتح النزاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dispute Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4 text-amber-500" />حل النزاع</DialogTitle>
            <DialogDescription className="text-xs">اختر كيف تريد حل النزاع على هذا الطلب</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {[
                { action: "refund" as const, icon: <XCircle className="h-4 w-4 text-red-500" />, label: "موافقة الاسترجاع", desc: "أوافق على إرجاع الأموال للمشتري" },
                { action: "fulfill" as const, icon: <CheckCheck className="h-4 w-4 text-teal-500" />, label: "تأكيد التسليم", desc: "المنتج وصل فعلاً، أؤكد التسليم" },
                { action: "reject" as const, icon: <RotateCcw className="h-4 w-4 text-amber-500" />, label: "رفض النزاع", desc: "النزاع غير مبرر، أستأنف الطلب" },
              ].map(function(opt) {
                return (
                  <button
                    key={opt.action}
                    onClick={function() { setResolveAction(opt.action); }}
                    className={"w-full text-right p-3 rounded-lg border-2 transition-all " + (resolveAction === opt.action ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border hover:border-emerald-500/20")}
                  >
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span className="font-medium text-sm">{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 mr-6">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ملاحظة (اختياري)</Label>
              <Textarea value={resolveReason} onChange={function(e) { setResolveReason(e.target.value); }} placeholder="سبب قرارك..." className="text-sm min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={function() { setResolveOpen(false); }} className="text-xs">إلغاء</Button>
            <Button size="sm" onClick={handleResolveDispute} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" /> : <Scale className="h-3.5 w-3.5 ml-1.5" />}
              حل النزاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ship Dialog — Tracking Details */}
      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2"><Truck className="h-4 w-4 text-blue-500" />شحن الطلب</DialogTitle>
            <DialogDescription className="text-xs">أضف تفاصيل الشحن ليتمكن المشتري من تتبع طلبه</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />رقم التتبع (اختياري)</Label>
              <Input value={trackingNumber} onChange={function(e) { setTrackingNumber(e.target.value); }} placeholder="مثال: TRK-123456789" className="text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">شركة الشحن (اختياري)</Label>
              <Input value={carrier} onChange={function(e) { setCarrier(e.target.value); }} placeholder="مثال: DHL, Aramex, البريد الوطني" className="text-sm" />
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/10">
              <Truck className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed">
                سيتم إعلام المشتري بتحديث الحالة وتفاصيل الشحن
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={function() { setShipOpen(false); setTrackingNumber(""); setCarrier(""); }} className="text-xs">إلغاء</Button>
            <Button size="sm" onClick={function() {
              const trackingNote = (trackingNumber.trim() || carrier.trim()) ? "شحن: " + carrier.trim() + (trackingNumber.trim() ? " — تتبع: " + trackingNumber.trim() : "") : "";
              onShip(inv);
              if (trackingNote) {
                api.patch("/api/invoices", { id: inv.id, notes: (inv.notes ? inv.notes + " | " : "") + trackingNote }, store.piUid).catch(function() {});
              }
              setShipOpen(false);
              setTrackingNumber("");
              setCarrier("");
            }} className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
              <Truck className="h-3.5 w-3.5" />تأكيد الشحن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ActionBtn({ icon, label, onClick, primary, outline, loading }: { icon: React.ReactNode; label: string; onClick?: () => void; primary?: boolean; outline?: string; loading?: boolean }) {
  if (primary) {
    return <Button size="sm" onClick={onClick} disabled={loading} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">{loading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : icon}{label}</Button>;
  }
  return <Button size="sm" variant="outline" onClick={onClick} className={"h-7 text-[11px] " + (outline || "")}>{icon}{label}</Button>;
}

/* ═══ Escrow Flow Step Definitions ═══ */
const ESCROW_STEPS = [
  { key: "pending", label: "في الانتظار" },
  { key: "paid_escrow", label: "في الضمان" },
  { key: "shipped", label: "تم الشحن" },
  { key: "delivered", label: "تم التسليم" },
  { key: "completed", label: "مكتمل" },
] as const;

function getEscrowStepIndex(status: string): number {
  const idx = ESCROW_STEPS.findIndex(function(s) { return s.key === status; });
  return idx >= 0 ? idx : -1;
}

/* ═══ Escrow Flow Status Indicator — mini step dots ═══ */
function EscrowFlowIndicator({ status }: { status: string }) {
  const isDisputed = status === "disputed";
  const isCancelled = status === "cancelled";
  const currentIdx = getEscrowStepIndex(status);

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground">مسار الضمان</p>
      <div className="flex items-center gap-1" dir="ltr">
        {ESCROW_STEPS.map(function(step, i) {
          const isPast = currentIdx >= 0 && i < currentIdx;
          const isCurrent = currentIdx >= 0 && i === currentIdx;
          const isFuture = currentIdx >= 0 && i > currentIdx;

          let dotClass: string;
          if (isDisputed) {
            /* For disputed: show up to current step in amber, rest gray */
            dotClass = i <= currentIdx
              ? "h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30"
              : "h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 ring-1 ring-zinc-300 dark:ring-zinc-600";
          } else if (isCancelled) {
            dotClass = i === 0
              ? "h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-500/30"
              : "h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 ring-1 ring-zinc-300 dark:ring-zinc-600";
          } else if (isPast) {
            dotClass = "h-2.5 w-2.5 rounded-full bg-emerald-400 ring-1 ring-emerald-400/30";
          } else if (isCurrent) {
            dotClass = "h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-600/30";
          } else if (isFuture) {
            dotClass = "h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 ring-1 ring-zinc-300 dark:ring-zinc-600";
          } else {
            /* Unknown status: all gray */
            dotClass = "h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 ring-1 ring-zinc-300 dark:ring-zinc-600";
          }

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-0.5">
                <div className={dotClass + " transition-all duration-300"} />
                <span className={"text-[8px] leading-none " + (isCurrent ? "text-emerald-600 font-bold" : isPast ? "text-emerald-400" : isDisputed && i <= currentIdx ? "text-amber-500 font-medium" : "text-zinc-400 dark:text-zinc-500")}>
                  {step.label}
                </span>
              </div>
              {i < ESCROW_STEPS.length - 1 && (
                <div className={"flex-1 h-0.5 rounded-full min-w-[12px] transition-colors duration-300 " +
                  (isDisputed && i < currentIdx ? "bg-amber-400" :
                   isCancelled ? "bg-zinc-200 dark:bg-zinc-700" :
                   isPast || isCurrent ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-700")} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {isDisputed && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 mt-1">
          <AlertTriangle className="h-3 w-3" /><span className="font-medium">هذه الفاتورة في وضع النزاع</span>
        </div>
      )}
      {isCancelled && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-500 mt-1">
          <Ban className="h-3 w-3" /><span className="font-medium">تم إلغاء هذه الفاتورة</span>
        </div>
      )}
    </div>
  );
}

/* ═══ Escrow Progress Bar ═══ */
function EscrowProgressBar({ status }: { status: string }) {
  const config: Record<string, { value: number; color: string; label: string }> = {
    pending:      { value: 0,  color: "bg-zinc-300",        label: "في الانتظار" },
    paid_escrow:  { value: 25, color: "bg-blue-500",        label: "في الضمان" },
    shipped:      { value: 50, color: "bg-purple-500",      label: "تم الشحن" },
    delivered:    { value: 75, color: "bg-teal-500",        label: "تم التسليم" },
    completed:    { value: 100,color: "bg-emerald-500",     label: "مكتمل" },
    disputed:     { value: 50, color: "bg-amber-500",       label: "نزاع" },
    cancelled:    { value: 0,  color: "bg-red-500",         label: "ملغى" },
    releasing:    { value: 90, color: "bg-amber-500",       label: "جارٍ الإطلاق" },
  };
  const c = config[status] || config.pending;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground font-medium">تقدم الضمان</span>
        <span className={status === "disputed" ? "text-amber-600 font-semibold" : status === "cancelled" ? "text-red-500 font-semibold" : "text-emerald-600 font-semibold"}>{c.value}% — {c.label}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={"h-full rounded-full transition-all duration-500 ease-out " + c.color}
          style={{ width: c.value + "%" }}
        />
      </div>
    </div>
  );
}

/* ═══ Dispute Resolution Panel ═══ */
function DisputeResolutionPanel({ invoice: inv, view, store, customerUid, loading, setLoading, onRefresh, toast }: {
  invoice: InvoiceData; view: string; store: StoreData; customerUid: string;
  loading: boolean; setLoading: (l: boolean) => void;
  onRefresh?: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const disputeReasonText = inv.notes || "لم يتم تقديم سبب";

  const handleResolve = function(action: "resolve_for_buyer" | "resolve_for_merchant" | "withdraw") {
    setLoading(true);
    const callerUid = view === "merchant" ? store.piUid : customerUid;
    api.post("/api/invoices/resolve-dispute", {
      invoiceId: inv.id,
      action: action,
    }, callerUid).then(function(res) {
      if (res.ok) {
        const msgs: Record<string, string> = {
          resolve_for_buyer: "تم حل النزاع لصالح المشتري",
          resolve_for_merchant: "تم حل النزاع لصالح التاجر",
          withdraw: "تم سحب النزاع",
        };
        toast({ title: msgs[action] || "تم حل النزاع" });
        if (onRefresh) onRefresh();
      } else {
        res.json().catch(function() { return {}; }).then(function(err) {
          toast({ title: "فشل حل النزاع", description: err.error || "", variant: "destructive" });
        });
      }
    }).catch(function() { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }).finally(function() {
      setLoading(false);
    });
  };

  return (
    <Card className="border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-amber-700 dark:text-amber-400 font-bold">هذه الفاتورة في وضع النزاع</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium">سبب النزاع:</p>
          <p className="text-xs text-foreground bg-background/60 rounded-md p-2 border border-amber-500/10">{disputeReasonText}</p>
        </div>

        {view === "merchant" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={function() { handleResolve("resolve_for_buyer"); }}
              disabled={loading}
              className="h-7 text-[11px] bg-teal-600 hover:bg-teal-700 text-white"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <CheckCircle2 className="h-3 w-3 ml-1" />}
              حل النزاع لصالح المشتري
            </Button>
            <Button
              size="sm"
              onClick={function() { handleResolve("resolve_for_merchant"); }}
              disabled={loading}
              className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Scale className="h-3 w-3 ml-1" />}
              حل النزاع لصالح التاجر
            </Button>
          </div>
        )}

        {view === "customer" && (
          <Button
            size="sm"
            onClick={function() { handleResolve("withdraw"); }}
            disabled={loading}
            className="h-7 text-[11px] bg-zinc-600 hover:bg-zinc-700 text-white"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <RotateCcw className="h-3 w-3 ml-1" />}
            سحب النزاع
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
