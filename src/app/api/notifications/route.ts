import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * GET /api/notifications
 * Returns DB-backed notifications for the authenticated user.
 * If user has no notifications yet, auto-generates from recent invoice activity.
 */
export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    // Ensure user exists in DB
    const user = await db.user.upsert({
      where: { piUid: auth.user.uid },
      update: { lastLoginAt: new Date() },
      create: { piUid: auth.user.uid, username: auth.user.username },
    });

    // Fetch notifications from DB
    let notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // If no notifications exist, auto-generate from recent invoice activity
    if (notifications.length === 0) {
      await generateNotificationsFromActivity(user.id, auth.user.uid);
      notifications = await db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل الإشعارات", notifications: [], unreadCount: 0 },
      { status: 500 }
    );
  }
}

/** Mark notification as read */
export async function POST(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id, markAll } = body as { id?: string; markAll?: boolean };

    if (markAll) {
      // Mark all as read
      const user = await db.user.findUnique({ where: { piUid: auth.user.uid } });
      if (user) {
        await db.notification.updateMany({
          where: { userId: user.id, read: false },
          data: { read: true },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "معرف الإشعار مطلوب" }, { status: 400 });
    }

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json({ error: "الإشعار غير موجود" }, { status: 404 });
    }

    await db.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json(
      { error: "فشل في تحديث حالة الإشعار" },
      { status: 500 }
    );
  }
}

/**
 * Auto-generate notifications from recent invoice activity.
 * This ensures new users see relevant notifications right away.
 */
async function generateNotificationsFromActivity(userId: string, piUid: string) {
  // Get store for this user
  const store = await db.store.findUnique({ where: { piUid } });

  // Recent invoices as merchant
  if (store) {
    const merchantInvoices = await db.invoice.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    for (const inv of merchantInvoices) {
      if (inv.status === "paid_escrow") {
        await db.notification.create({
          data: {
            userId,
            type: "payment",
            title: "دفعة جديدة في الضمان",
            message: `فاتورة ${inv.invoiceNumber} — ${inv.total}π في الضمان`,
            severity: "info",
            invoiceId: inv.id,
            storeId: store.id,
          },
        });
      } else if (inv.status === "shipped") {
        await db.notification.create({
          data: {
            userId,
            type: "delivery",
            title: "طلب مشحون",
            message: `فاتورة ${inv.invoiceNumber} — بانتظار تأكيد المشتري`,
            severity: "info",
            invoiceId: inv.id,
            storeId: store.id,
          },
        });
      } else if (inv.status === "delivered") {
        await db.notification.create({
          data: {
            userId,
            type: "escrow",
            title: "تسليم مؤكد — جاهز للإطلاق",
            message: `فاتورة ${inv.invoiceNumber} — ${inv.total}π جاهزة للإطلاق`,
            severity: "info",
            invoiceId: inv.id,
            storeId: store.id,
          },
        });
      } else if (inv.status === "disputed") {
        await db.notification.create({
          data: {
            userId,
            type: "dispute",
            title: "⚠ نزاع مفتوح",
            message: `فاتورة ${inv.invoiceNumber} — المشتري فتح نزاع`,
            severity: "high",
            invoiceId: inv.id,
            storeId: store.id,
          },
        });
      }
    }
  }

  // Recent invoices as buyer
  const buyerInvoices = await db.invoice.findMany({
    where: { customerPiUid: piUid },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  for (const inv of buyerInvoices) {
    if (inv.status === "pending") {
      await db.notification.create({
        data: {
          userId,
          type: "order",
          title: "طلب بانتظار الدفع",
          message: `فاتورة ${inv.invoiceNumber} — ${inv.total}π`,
          severity: "medium",
          invoiceId: inv.id,
        },
      });
    } else if (inv.status === "shipped") {
      await db.notification.create({
        data: {
          userId,
          type: "delivery",
          title: "طلب مشحون — أكد الاستلام",
          message: `فاتورة ${inv.invoiceNumber} — البائع أكد الشحن`,
          severity: "info",
          invoiceId: inv.id,
        },
      });
    }
  }

  // Welcome notification for new users
  if (buyerInvoices.length === 0 && !store) {
    await db.notification.create({
      data: {
        userId,
        type: "system",
        title: "مرحباً بك في Ledgererp! 🎉",
        message: "أنشئ متجرك وابدأ بقبول المدفوعات بالـ Pi مع ضمان آمن",
        severity: "info",
      },
    });
  }
}
