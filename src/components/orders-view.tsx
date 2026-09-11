"use client";

import React, { useState } from "react";
import {
  ShoppingCart, Store, Search, Receipt, Package,
  CreditCard, Truck, CheckCircle2, Wallet, AlertTriangle,
  Ban, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatPi } from "@/lib/pi-amount";
import { useDebounce } from "@/hooks/use-debounce";
import { StatusBadge, fmtDate, fmtTime } from "@/lib/helpers";
import type { StoreData, InvoiceData } from "@/lib/types";

/* ═══ Orders ═══ */
export function OrdersView({ merchantInvoices, customerInvoices, store, customerUid, onPay, onShip, onConfirmDelivery, onRelease, onDispute, onCancel }: {
  merchantInvoices: InvoiceData[]; customerInvoices: InvoiceData[];
  store: StoreData; customerUid: string;
  onPay: (i: InvoiceData) => void; onShip: (i: InvoiceData) => void;
  onConfirmDelivery: (i: InvoiceData) => void; onRelease: (i: InvoiceData) => void;
  onDispute: (i: InvoiceData) => void; onCancel: (i: InvoiceData) => void;
}) {
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
              <OrderCard key={inv.id} invoice={inv} view={view} store={store} onPay={onPay} onShip={onShip} onConfirmDelivery={onConfirmDelivery} onRelease={onRelease} onDispute={onDispute} onCancel={onCancel} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderCard({ invoice: inv, view, store, onPay, onShip, onConfirmDelivery, onRelease, onDispute, onCancel }: {
  invoice: InvoiceData; view: string; store: StoreData;
  onPay: (i: InvoiceData) => void; onShip: (i: InvoiceData) => void;
  onConfirmDelivery: (i: InvoiceData) => void; onRelease: (i: InvoiceData) => void;
  onDispute: (i: InvoiceData) => void; onCancel: (i: InvoiceData) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const canPay = view === "customer" && inv.status === "pending";
  const canShip = view === "merchant" && inv.status === "paid_escrow";
  const canConfirm = view === "customer" && inv.status === "shipped";
  const canRelease = view === "merchant" && inv.status === "delivered";
  const canDispute = view === "customer" && (inv.status === "paid_escrow" || inv.status === "shipped");
  const canCancel = inv.status === "pending";

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
          {canShip && <ActionBtn icon={<Truck className="h-3 w-3 ml-1" />} label="شحن" onClick={function() { onShip(inv); }} outline="border-blue-500/30 text-blue-600" />}
          {canConfirm && <ActionBtn icon={<CheckCircle2 className="h-3 w-3 ml-1" />} label="تأكيد التسليم" onClick={function() { onConfirmDelivery(inv); }} outline="border-teal-500/30 text-teal-600" />}
          {canRelease && <ActionBtn icon={<Wallet className="h-3 w-3 ml-1" />} label="إطلاق Pi" onClick={function() { setLoading(true); onRelease(inv); setLoading(false); }} primary loading={loading} />}
          {canDispute && <ActionBtn icon={<AlertTriangle className="h-3 w-3 ml-1" />} label="فتح نزاع" onClick={function() { onDispute(inv); }} outline="border-red-500/30 text-red-500" />}
          {canCancel && (
            <AlertDialog><AlertDialogTrigger asChild><ActionBtn icon={<Ban className="h-3 w-3 ml-1" />} label="إلغاء" outline="border-red-500/30 text-red-500" /></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-sm">إلغاء الطلب</AlertDialogTitle><AlertDialogDescription className="text-xs">هل تريد إلغاء هذا الطلب؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-xs">لا</AlertDialogCancel><AlertDialogAction onClick={function() { onCancel(inv); }} className="text-xs bg-red-600 hover:bg-red-700">نعم، إلغاء</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          )}
          <button onClick={function() { setExpanded(!expanded); }} className="h-7 px-2 text-[11px] text-muted-foreground mr-auto rounded-md hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}التفاصيل
          </button>
        </div>

        {expanded && (
          <div className="border-t pt-2.5 space-y-2">
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
    </Card>
  );
}

function ActionBtn({ icon, label, onClick, primary, outline, loading }: { icon: React.ReactNode; label: string; onClick?: () => void; primary?: boolean; outline?: string; loading?: boolean }) {
  if (primary) {
    return <Button size="sm" onClick={onClick} disabled={loading} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">{loading ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : icon}{label}</Button>;
  }
  return <Button size="sm" variant="outline" onClick={onClick} className={"h-7 text-[11px] " + (outline || "")}>{icon}{label}</Button>;
}
