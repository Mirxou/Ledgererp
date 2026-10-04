"use client";

import React, { useRef, useCallback } from "react";
import {
  Printer, FileDown, X, Banknote, CreditCard, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPi } from "@/lib/pi-amount";
import { fmtDate, fmtTime, copyText } from "@/lib/helpers";
import { useToast } from "@/hooks/use-toast";
import type { LocalSaleData, StoreData } from "@/lib/types";

/* ═══ Invoice Print View ═══ */
export function InvoicePrintView({ sale, store, onClose }: {
  sale: LocalSaleData;
  store: StoreData;
  onClose?: () => void;
}) {
  const toast = useToast().toast;
  const printRef = useRef<HTMLDivElement>(null);

  const paymentLabel = function(method: string): string {
    if (method === "cash") return "نقدي";
    if (method === "card") return "بطاقة";
    if (method === "pi") return "Pi";
    return method;
  };

  const paymentIcon = function(method: string) {
    if (method === "cash") return "💵";
    if (method === "card") return "💳";
    if (method === "pi") return "π";
    return "💰";
  };

  /* ── Print ── */
  const handlePrint = useCallback(function() {
    window.print();
  }, []);

  /* ── Export PDF (via browser print dialog with Save as PDF) ── */
  const handleExportPDF = useCallback(function() {
    window.print();
  }, []);

  /* ── Share Receipt Text ── */
  const receiptText = buildReceiptText(sale, store);
  const handleShare = useCallback(function() {
    copyText(receiptText, toast, "تم نسخ نص الإيصال");
  }, [receiptText, toast]);

  /* ── Barcode-style visual ── */
  const barcodeLines = function(text: string): string {
    return text.split("").map(function(ch) {
      const code = ch.charCodeAt(0);
      return Array.from({ length: 8 }, function(_, i) {
        return (code >> i) & 1 ? "█" : " ";
      }).join("");
    }).join("");
  };

  return (
    <>
      {/* ── Screen-only controls (hidden in print) ── */}
      <div className="print:hidden fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header bar */}
          <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b px-4 py-3 flex items-center justify-between z-10 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-emerald-600" />
              <span className="font-bold text-sm">طباعة الفاتورة</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare} className="text-xs h-8">
                <FileDown className="h-3.5 w-3.5 ml-1" />مشاركة
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-xs h-8">
                <FileDown className="h-3.5 w-3.5 ml-1" />PDF
              </Button>
              <Button size="sm" onClick={handlePrint} className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Printer className="h-3.5 w-3.5 ml-1" />طباعة
              </Button>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* ── Printable receipt content ── */}
          <div ref={printRef} className="print-area px-6 py-5" dir="rtl">
            <ReceiptContent sale={sale} store={store} paymentLabel={paymentLabel} paymentIcon={paymentIcon} barcodeLines={barcodeLines} />
          </div>
        </div>
      </div>

      {/* ── Print-only full page version ── */}
      <div className="hidden print:block print-page" dir="rtl">
        <div ref={printRef} className="p-4 max-w-[80mm] mx-auto">
          <ReceiptContent sale={sale} store={store} paymentLabel={paymentLabel} paymentIcon={paymentIcon} barcodeLines={barcodeLines} />
        </div>
      </div>
    </>
  );
}

/* ═══ Receipt Content (shared between screen and print) ═══ */
function ReceiptContent({ sale, store, paymentLabel, paymentIcon, barcodeLines }: {
  sale: LocalSaleData;
  store: StoreData;
  paymentLabel: (m: string) => string;
  paymentIcon: (m: string) => string;
  barcodeLines: (t: string) => string;
}) {
  return (
    <div className="space-y-4 text-xs">
      {/* ── Store Header ── */}
      <div className="text-center space-y-1.5">
        {store.avatar && (
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-zinc-200">
              <img src={store.avatar} alt={store.name} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <h1 className="text-base font-bold">{store.name}</h1>
        {store.description && (
          <p className="text-[10px] text-muted-foreground leading-tight">{store.description}</p>
        )}
      </div>

      <div className="border-t border-dashed border-zinc-300" />

      {/* ── Invoice Number (prominent) ── */}
      <div className="text-center space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">فاتورة مبيعات</p>
        <p className="text-sm font-bold tracking-wide" dir="ltr">{sale.invoiceNumber}</p>
      </div>

      <div className="border-t border-dashed border-zinc-300" />

      {/* ── Date & Time ── */}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">التاريخ</span>
        <span className="font-medium">{fmtDate(sale.createdAt)}</span>
      </div>
      <div className="flex justify-between items-center -mt-2.5">
        <span className="text-muted-foreground">الوقت</span>
        <span className="font-medium">{fmtTime(sale.createdAt)}</span>
      </div>

      {/* ── Customer Info ── */}
      {sale.customer && (
        <>
          <div className="border-t border-dashed border-zinc-300" />
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-semibold">الزبون</p>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-medium">{sale.customer.name}</span>
            </div>
            {sale.customer.phone && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">الهاتف</span>
                <span className="font-medium" dir="ltr">{sale.customer.phone}</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="border-t border-dashed border-zinc-300" />

      {/* ── Items Table ── */}
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold">المنتجات</p>

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_36px_52px_52px] gap-1 text-[10px] font-bold text-muted-foreground border-b border-zinc-300 pb-1">
          <span>المنتج</span>
          <span className="text-center">الكمية</span>
          <span className="text-left">السعر</span>
          <span className="text-left">المجموع</span>
        </div>

        {/* Table Rows */}
        {sale.items && sale.items.map(function(item, i) {
          return (
            <div key={item.id || i} className="grid grid-cols-[1fr_36px_52px_52px] gap-1 py-0.5">
              <span className="truncate font-medium">{item.productName}</span>
              <span className="text-center text-muted-foreground">{item.quantity}</span>
              <span className="text-left" dir="ltr">{formatPi(item.unitPrice)}</span>
              <span className="text-left font-medium" dir="ltr">{formatPi(item.totalPrice)}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-dashed border-zinc-300" />

      {/* ── Totals Section ── */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">المجموع الفرعي</span>
          <span dir="ltr">{formatPi(sale.subtotal)} π</span>
        </div>
        {sale.taxAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">الضريبة</span>
            <span dir="ltr">{formatPi(sale.taxAmount)} π</span>
          </div>
        )}
        {sale.discountAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">الخصم</span>
            <span className="text-red-600" dir="ltr">-{formatPi(sale.discountAmount)} π</span>
          </div>
        )}
      </div>

      {/* ── Bold Total ── */}
      <div className="bg-zinc-100 dark:bg-zinc-800 print:bg-zinc-100 rounded-lg p-2.5 text-center">
        <span className="text-[10px] text-muted-foreground">الإجمالي</span>
        <p className="text-lg font-bold mt-0.5" dir="ltr">{formatPi(sale.total)} π</p>
      </div>

      <div className="border-t border-dashed border-zinc-300" />

      {/* ── Payment Method ── */}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">طريقة الدفع</span>
        <span className="font-medium">
          {paymentIcon(sale.paymentMethod)} {paymentLabel(sale.paymentMethod)}
        </span>
      </div>

      {/* ── Notes ── */}
      {sale.notes && !sale.notes.includes("[REFUNDED]") && (
        <>
          <div className="border-t border-dashed border-zinc-300" />
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-semibold">ملاحظات</p>
            <p className="text-[11px] leading-relaxed">{sale.notes}</p>
          </div>
        </>
      )}

      {/* ── Refunded indicator ── */}
      {sale.notes && sale.notes.includes("[REFUNDED]") && (
        <>
          <div className="border-t border-dashed border-zinc-300" />
          <div className="bg-red-50 dark:bg-red-950/20 print:bg-red-50 rounded-lg p-2 text-center">
            <p className="text-red-600 font-bold text-xs">⚠ فاتورة مرجعة</p>
          </div>
        </>
      )}

      <div className="border-t border-dashed border-zinc-300" />

      {/* ── Barcode-style Invoice Number ── */}
      <div className="text-center space-y-1.5">
        <div className="font-mono text-[8px] tracking-[3px] leading-none" dir="ltr">
          {barcodeLines(sale.invoiceNumber.replace(/[^A-Za-z0-9]/g, ""))}
        </div>
        <p className="text-[9px] text-muted-foreground font-mono" dir="ltr">{sale.invoiceNumber}</p>
      </div>

      <div className="border-t border-dashed border-zinc-300" />

      {/* ── Footer ── */}
      <div className="text-center space-y-1 pb-2">
        <p className="font-bold text-xs">شكراً لتعاملكم معنا</p>
        <p className="text-[10px] text-muted-foreground">{store.name}</p>
        {store.piUid && (
          <p className="text-[9px] text-muted-foreground" dir="ltr">Pi: @{store.piUid}</p>
        )}
      </div>
    </div>
  );
}

/* ═══ Build plain text receipt for sharing ═══ */
function buildReceiptText(sale: LocalSaleData, store: StoreData): string {
  const lines: string[] = [];
  const add = function(line: string) { lines.push(line); };

  add("════════════════════════════");
  add("  " + store.name);
  add("════════════════════════════");
  add("");
  add("فاتورة: " + sale.invoiceNumber);
  add("التاريخ: " + fmtDate(sale.createdAt) + " " + fmtTime(sale.createdAt));
  if (sale.customer) {
    add("الزبون: " + sale.customer.name);
    if (sale.customer.phone) add("الهاتف: " + sale.customer.phone);
  }
  add("");
  add("──────────────────────────────");
  add("المنتج          الكمية  السعر  المجموع");
  add("──────────────────────────────");

  if (sale.items) {
    for (let i = 0; i < sale.items.length; i++) {
      const item = sale.items[i];
      const name = item.productName.length > 14 ? item.productName.substring(0, 14) + ".." : item.productName;
      add(name.padEnd(16) + String(item.quantity).padStart(3) + formatPi(item.unitPrice).padStart(7) + formatPi(item.totalPrice).padStart(8));
    }
  }

  add("──────────────────────────────");
  add("المجموع الفرعي:    " + formatPi(sale.subtotal) + " π");
  if (sale.taxAmount > 0) add("الضريبة:           " + formatPi(sale.taxAmount) + " π");
  if (sale.discountAmount > 0) add("الخصم:            -" + formatPi(sale.discountAmount) + " π");
  add("════════════════════════════");
  add("الإجمالي:          " + formatPi(sale.total) + " π");
  add("════════════════════════════");
  add("");

  const methodLabel = sale.paymentMethod === "cash" ? "نقدي" : sale.paymentMethod === "card" ? "بطاقة" : "Pi";
  add("طريقة الدفع: " + methodLabel);
  if (sale.notes && !sale.notes.includes("[REFUNDED]")) add("ملاحظات: " + sale.notes);
  if (sale.notes && sale.notes.includes("[REFUNDED]")) add("⚠ فاتورة مرجعة");

  add("");
  add("شكراً لتعاملكم معنا");
  add(store.name);

  return lines.join("\n");
}

/* ═══ Print CSS (injected once) ═══ */
export function InvoicePrintStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        /* Hide everything except the print page */
        body > *:not(:has(.print-page)) {
          display: none !important;
        }

        /* Reset page for thermal printer */
        .print-page {
          display: block !important;
          width: 100%;
          max-width: 80mm;
          margin: 0 auto;
          padding: 4mm;
        }

        /* Clean print styles */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          background: white !important;
          font-size: 10pt;
          color: black !important;
        }

        /* Remove shadows and backgrounds for print */
        .shadow-2xl, .shadow-md, .shadow-sm {
          box-shadow: none !important;
        }

        .bg-zinc-100 {
          background: #f4f4f5 !important;
        }

        .text-red-600 {
          color: #dc2626 !important;
        }

        /* Hide screen-only elements */
        .print\\:hidden {
          display: none !important;
        }

        /* Page setup */
        @page {
          size: 80mm auto;
          margin: 2mm;
        }
      }
    ` }} />
  );
}
