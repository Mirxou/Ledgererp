/**
 * Notification helper — creates DB-backed notifications for escrow events.
 * All notifications are persisted in the Notification table (never mock/in-memory).
 */
import { db } from "@/lib/db";

export type NotifyType = "payment" | "order" | "escrow" | "delivery" | "dispute" | "system" | "store";
export type NotifySeverity = "critical" | "high" | "medium" | "low" | "info";

interface CreateNotificationParams {
  userId: string;
  type: NotifyType;
  title: string;
  message: string;
  severity?: NotifySeverity;
  actionUrl?: string;
  invoiceId?: string;
  storeId?: string;
}

/** Create a single notification in the database */
export async function createNotification(params: CreateNotificationParams) {
  return db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity || "info",
      actionUrl: params.actionUrl || "",
      invoiceId: params.invoiceId,
      storeId: params.storeId,
    },
  });
}

/** Create notifications for both merchant and buyer about an escrow event */
export async function notifyBoth(params: {
  merchantUserId: string;
  buyerUserId: string;
  type: NotifyType;
  merchantTitle: string;
  merchantMessage: string;
  buyerTitle: string;
  buyerMessage: string;
  severity?: NotifySeverity;
  invoiceId?: string;
  storeId?: string;
}) {
  return Promise.all([
    createNotification({
      userId: params.merchantUserId,
      type: params.type,
      title: params.merchantTitle,
      message: params.merchantMessage,
      severity: params.severity || "info",
      invoiceId: params.invoiceId,
      storeId: params.storeId,
    }),
    createNotification({
      userId: params.buyerUserId,
      type: params.type,
      title: params.buyerTitle,
      message: params.buyerMessage,
      severity: params.severity || "info",
      invoiceId: params.invoiceId,
      storeId: params.storeId,
    }),
  ]);
}

/** Convenience: notify when invoice status changes */
export async function notifyInvoiceStatusChange(params: {
  merchantUserId: string;
  buyerUserId: string;
  invoiceNumber: string;
  newStatus: string;
  amount: number;
  storeId?: string;
  invoiceId?: string;
}) {
  const statusMessages: Record<string, { merchant: { title: string; msg: string }; buyer: { title: string; msg: string }; severity: NotifySeverity }> = {
    paid_escrow: {
      merchant: { title: "دفعة جديدة في الضمان", msg: `فاتورة ${params.invoiceNumber} — ${params.amount}π في الضمان` },
      buyer: { title: "تم الدفع بنجاح", msg: `فاتورة ${params.invoiceNumber} — ${params.amount}π في الضمان` },
      severity: "info",
    },
    shipped: {
      merchant: { title: "تم شحن الطلب", msg: `فاتورة ${params.invoiceNumber} — تم تأكيد الشحن` },
      buyer: { title: "تم شحن طلبك!", msg: `فاتورة ${params.invoiceNumber} — البائع أكد الشحن` },
      severity: "info",
    },
    delivered: {
      merchant: { title: "تم تأكيد التسليم", msg: `فاتورة ${params.invoiceNumber} — المشتري أكد الاستلام` },
      buyer: { title: "تم تأكيد التسليم", msg: `فاتورة ${params.invoiceNumber} — شكراً لتأكيدك!` },
      severity: "info",
    },
    completed: {
      merchant: { title: "إطلاق الأموال ✅", msg: `فاتورة ${params.invoiceNumber} — ${params.amount}π أُطلقت لحسابك` },
      buyer: { title: "عملية مكتملة ✅", msg: `فاتورة ${params.invoiceNumber} — تم إطلاق الضمان للبائع` },
      severity: "info",
    },
    disputed: {
      merchant: { title: "⚠ نزاع جديد", msg: `فاتورة ${params.invoiceNumber} — المشتري فتح نزاع` },
      buyer: { title: "تم فتح نزاع", msg: `فاتورة ${params.invoiceNumber} — نزاعك قيد المراجعة` },
      severity: "high",
    },
    cancelled: {
      merchant: { title: "طلب ملغى", msg: `فاتورة ${params.invoiceNumber} — تم الإلغاء` },
      buyer: { title: "طلب ملغى", msg: `فاتورة ${params.invoiceNumber} — تم إلغاء الطلب` },
      severity: "medium",
    },
  };

  const info = statusMessages[params.newStatus];
  if (!info) return [];

  return notifyBoth({
    merchantUserId: params.merchantUserId,
    buyerUserId: params.buyerUserId,
    type: params.newStatus === "disputed" ? "dispute" : params.newStatus === "completed" ? "escrow" : "order",
    merchantTitle: info.merchant.title,
    merchantMessage: info.merchant.msg,
    buyerTitle: info.buyer.title,
    buyerMessage: info.buyer.msg,
    severity: info.severity,
    invoiceId: params.invoiceId,
    storeId: params.storeId,
  });
}
