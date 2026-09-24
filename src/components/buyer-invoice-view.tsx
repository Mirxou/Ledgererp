"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield, Copy, Share2, CheckCircle2, Clock,
  Truck, Wallet, FileCheck, AlertTriangle, Ban,
  Package, ChevronLeft, ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { createPiPayment, type PiPaymentData, type PiPaymentCallbacks } from "@/lib/pi-sdk";
import { api } from "@/lib/api-client";
import { formatPi } from "@/lib/pi-amount";
import { StatusBadge, STATUS_MAP, fmtDate, copyText } from "@/lib/helpers";
import type { InvoiceData } from "@/lib/types";

/* ═══ Escrow Flow Steps ═══ */
const ESCROW_STEPS = [
  { key: "pending",     label: "إنشاء",  icon: FileCheck },
  { key: "paid_escrow", label: "دفع",    icon: Wallet },
  { key: "shipped",     label: "شحن",    icon: Truck },
  { key: "delivered",   label: "تسليم",  icon: Package },
  { key: "completed",   label: "إطلاق",  icon: CheckCircle2 },
] as const;

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    paid_escrow: 1,
    shipped: 2,
    delivered: 3,
    completed: 4,
    releasing: 4,
    cancelled: -1,
    disputed: -1,
  };
  return map[status] ?? 0;
}

/* ═══ Component Props ═══ */
interface BuyerInvoiceViewProps {
  invoiceNumber: string;
}

/* ═══ BuyerInvoiceView ═══ */
export function BuyerInvoiceView({ invoiceNumber }: BuyerInvoiceViewProps) {
  const toast = useToast().toast;
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* ── Fetch invoice data ── */
  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/invoices?invoiceNumber=${encodeURIComponent(invoiceNumber)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("لم يتم العثور على الفاتورة");
        } else {
          setError("فشل في تحميل الفاتورة");
        }
        return;
      }
      const json = await res.json();
      const data = json.data as InvoiceData[];
      if (!data || data.length === 0) {
        setError("لم يتم العثور على الفاتورة");
        return;
      }
      setInvoice(data[0]);
    } catch {
      setError("فشل في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, [invoiceNumber]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  /* ── Auto-refresh every 15s for active invoices ── */
  useEffect(() => {
    if (!invoice) return;
    const isActive = ["pending", "paid_escrow", "shipped", "delivered", "releasing"].includes(invoice.status);
    if (!isActive) return;
    const interval = setInterval(fetchInvoice, 15000);
    return () => clearInterval(interval);
  }, [invoice, fetchInvoice]);

  /* ── Pay with Pi ── */
  const handlePayWithPi = useCallback(() => {
    if (!invoice) return;
    setPaying(true);

    const callbacks: PiPaymentCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        api.post("/api/pi_payment/approve", {
          paymentId,
          invoiceId: invoice.id,
        }).catch(() => {
          toast({ title: "فشل الموافقة على الدفعة", variant: "destructive" });
        });
      },
      onReadyForServerCompletion: (paymentId, txid) => {
        api.post("/api/pi_payment/complete", {
          paymentId,
          txid,
          invoiceId: invoice.id,
        }).then(() => {
          toast({ title: "تم الدفع بنجاح! الأموال في الضمان" });
          fetchInvoice();
        }).catch(() => {
          toast({ title: "فشل إكمال الدفعة", variant: "destructive" });
        }).finally(() => setPaying(false));
      },
      onCancel: () => {
        setPaying(false);
        toast({ title: "تم إلغاء الدفع" });
      },
      onError: () => {
        setPaying(false);
        toast({ title: "خطأ في الدفع", variant: "destructive" });
      },
    };

    const paymentData: PiPaymentData = {
      amount: invoice.total,
      memo: `فاتورة ${invoice.invoiceNumber} — ${invoice.store?.name || "Ledgererp"}`,
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    };

    createPiPayment(paymentData, callbacks);
  }, [invoice, toast, fetchInvoice]);

  /* ── Confirm Delivery ── */
  const handleConfirmDelivery = useCallback(async () => {
    if (!invoice) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/invoices/buyer-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id, action: "confirmDelivery" }),
      });
      if (res.ok) {
        toast({ title: "تم تأكيد الاستلام" });
        fetchInvoice();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "فشل تأكيد الاستلام", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  }, [invoice, toast, fetchInvoice]);

  /* ── Share Invoice Link ── */
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?invoice=${invoiceNumber}`;
    if (navigator.share) {
      navigator.share({ title: `فاتورة ${invoiceNumber}`, url }).catch(() => {});
    } else {
      copyText(url, toast, "تم نسخ رابط الفاتورة");
    }
  }, [invoiceNumber, toast]);

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
            <Separator />
            <Skeleton className="h-32 w-full" />
            <Separator />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Error State ── */
  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-lg">{error || "لم يتم العثور على الفاتورة"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                تأكد من صحة رقم الفاتورة وحاول مرة أخرى
              </p>
            </div>
            <p className="text-xs text-muted-foreground" dir="ltr">{invoiceNumber}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Computed ── */
  const currentStep = getStepIndex(invoice.status);
  const storeName = invoice.store?.name || "متجر";
  const invoiceDate = fmtDate(invoice.createdAt);

  /* ═══ RENDER ═══ */
  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">Ledgererp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">مشاركة</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 space-y-4">
        {/* Store & Invoice Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{storeName}</CardTitle>
                <CardDescription>فاتورة ضمان</CardDescription>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">رقم الفاتورة</span>
              <span className="font-mono font-medium" dir="ltr">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">التاريخ</span>
              <span>{invoiceDate}</span>
            </div>
            {invoice.customerName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">العميل</span>
                <span>{invoice.customerName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">البنود</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {invoice.items.map((item, idx) => (
              <React.Fragment key={item.id || idx}>
                <div className="flex items-start justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {item.quantity} × {formatPi(item.unitPrice)}π
                    </p>
                  </div>
                  <p className="text-sm font-semibold ml-3" dir="ltr">
                    {formatPi(item.totalPrice)}π
                  </p>
                </div>
                {idx < invoice.items.length - 1 && <Separator />}
              </React.Fragment>
            ))}

            <Separator className="my-2" />

            {/* Totals */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span dir="ltr">{formatPi(invoice.subtotal)}π</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">رسوم الضمان (2%)</span>
                <span dir="ltr">{formatPi(invoice.escrowFee)}π</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-bold">
                <span>الإجمالي</span>
                <span className="text-emerald-600 text-lg" dir="ltr">{formatPi(invoice.total)}π</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Escrow Flow Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              مسار الضمان
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-1">
              {ESCROW_STEPS.map((step, idx) => {
                const isActive = idx <= currentStep && currentStep >= 0;
                const isCurrent = idx === currentStep;
                const isCancelled = invoice.status === "cancelled" || invoice.status === "disputed";
                const Icon = step.icon;

                return (
                  <React.Fragment key={step.key}>
                    {idx > 0 && (
                      <div className="flex-1 h-0.5 rounded-full mx-0.5">
                        <div
                          className={`h-full rounded-full transition-all ${
                            idx <= currentStep && currentStep >= 0
                              ? "bg-emerald-500"
                              : isCancelled
                              ? "bg-red-300"
                              : "bg-muted"
                          }`}
                        />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-1.5 min-w-[44px]">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isCurrent
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                            : isActive
                            ? "bg-emerald-500/15 text-emerald-600"
                            : isCancelled
                            ? "bg-red-500/10 text-red-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span
                        className={`text-[10px] font-medium text-center leading-tight ${
                          isCurrent
                            ? "text-emerald-600"
                            : isActive
                            ? "text-emerald-600/80"
                            : isCancelled
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            {(invoice.status === "cancelled" || invoice.status === "disputed") && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-500">
                {invoice.status === "cancelled" ? <Ban className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                <span>{invoice.status === "cancelled" ? "تم إلغاء المعاملة" : "نزاع مفتوح"}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Area */}
        <Card>
          <CardContent className="pt-6">
            {invoice.status === "pending" && (
              <div className="space-y-3">
                <Button
                  className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
                  onClick={handlePayWithPi}
                  disabled={paying}
                  size="lg"
                >
                  {paying ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جارٍ الدفع...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-5 w-5" />
                      ادفع بالـ Pi
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  سيتم تحويل المبلغ إلى حساب ضمان آمن
                </p>
              </div>
            )}

            {invoice.status === "paid_escrow" && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-blue-600">في الضمان — بانتظار الشحن</p>
                <p className="text-xs text-muted-foreground text-center">
                  أموالك محفوظة في الضمان حتى يتم شحن الطلب
                </p>
              </div>
            )}

            {invoice.status === "shipped" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-purple-600 mb-2">
                  <Truck className="h-4 w-4" />
                  <span>تم الشحن — بانتظار تأكيد الاستلام</span>
                </div>
                <Button
                  className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleConfirmDelivery}
                  disabled={confirming}
                  size="lg"
                >
                  {confirming ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جارٍ التأكيد...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      تأكيد الاستلام
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  سيتم إطلاق الأموال للبائع بعد التأكيد
                </p>
              </div>
            )}

            {invoice.status === "delivered" && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-teal-500" />
                </div>
                <p className="text-sm font-medium text-teal-600">تم التسليم — بانتظار إطلاق الأموال</p>
                <p className="text-xs text-muted-foreground text-center">
                  سيقوم البائع بإطلاق الأموال من الضمان قريباً
                </p>
              </div>
            )}

            {invoice.status === "completed" && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-emerald-600">تمت المعاملة بنجاح ✅</p>
                <p className="text-xs text-muted-foreground text-center">
                  تم إطلاق الأموال للبائع وإغلاق الفاتورة
                </p>
              </div>
            )}

            {invoice.status === "cancelled" && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-10 h-10 rounded-full bg-zinc-500/10 flex items-center justify-center">
                  <Ban className="h-5 w-5 text-zinc-500" />
                </div>
                <p className="text-sm font-medium text-zinc-500">تم إلغاء الفاتورة</p>
              </div>
            )}

            {invoice.status === "disputed" && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-sm font-medium text-red-600">نزاع مفتوح</p>
                <p className="text-xs text-muted-foreground text-center">
                  تم فتح نزاع — سيتم مراجعة الأمر
                </p>
              </div>
            )}

            {invoice.status === "releasing" && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-amber-600">جارٍ إطلاق الأموال...</p>
                <p className="text-xs text-muted-foreground text-center">
                  يتم تحويل الأموال من الضمان إلى البائع
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
              <p className="text-sm">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Escrow Info */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground py-2">
          <Shield className="h-3 w-3 text-emerald-500" />
          <span>ضمان Ledgererp — معاملات آمنة ومشفرة</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-3 bg-muted/30">
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Ledgererp — منصة الفواتير والضمان الآمن</span>
          <span>v2.0</span>
        </div>
      </footer>
    </div>
  );
}
