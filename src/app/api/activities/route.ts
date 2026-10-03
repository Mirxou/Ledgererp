import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit } from "@/lib/api-auth";

/**
 * GET /api/activities
 * Returns REAL activity log from the database.
 * Uses the AuditLog model (general app activity, not security-only).
 */
export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    // Ensure user exists
    const user = await db.user.upsert({
      where: { piUid: auth.user.uid },
      update: { lastLoginAt: new Date() },
      create: { piUid: auth.user.uid, username: auth.user.username },
    });

    // Fetch recent audit logs for this user
    const recentLogs = await db.auditLog.findMany({
      where: { userId: auth.user.uid },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Also fetch invoice-related activity
    const store = await db.store.findUnique({ where: { piUid: auth.user.uid } });

    type Activity = {
      id: string;
      type: "invoice" | "payment" | "store" | "escrow" | "dispute" | "system";
      description: string;
      timestamp: string;
      entity?: string;
      entityId?: string;
      severity?: string;
    };

    const activities: Activity[] = [];

    // From audit logs
    for (const log of recentLogs) {
      activities.push({
        id: log.id,
        type: (log.action.includes("invoice") ? "invoice" :
               log.action.includes("payment") ? "payment" :
               log.action.includes("store") ? "store" :
               log.action.includes("escrow") ? "escrow" :
               log.action.includes("dispute") ? "dispute" : "system") as Activity["type"],
        description: log.details || log.action,
        timestamp: log.createdAt.toISOString(),
        entity: log.entity,
        entityId: log.entityId,
      });
    }

    // From recent invoices (merchant)
    if (store) {
      const recentInvoices = await db.invoice.findMany({
        where: { storeId: store.id },
        orderBy: { updatedAt: "desc" },
        take: 15,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          updatedAt: true,
          customerName: true,
        },
      });

      const statusLabels: Record<string, string> = {
        pending: "بانتظار الدفع",
        paid_escrow: "مدفوع في الضمان",
        shipped: "تم الشحن",
        delivered: "تم التسليم",
        completed: "مكتمل ✅",
        disputed: "نزاع ⚠",
        cancelled: "ملغى",
      };

      for (const inv of recentInvoices) {
        activities.push({
          id: `inv-${inv.id}`,
          type: inv.status === "disputed" ? "dispute" : inv.status === "completed" ? "escrow" : "invoice",
          description: `فاتورة ${inv.invoiceNumber} — ${statusLabels[inv.status] || inv.status} — ${inv.total}π (${inv.customerName || "زبون"})`,
          timestamp: inv.updatedAt.toISOString(),
          entity: "invoice",
          entityId: inv.id,
        });
      }
    }

    // From recent invoices (buyer)
    const buyerInvoices = await db.invoice.findMany({
      where: { customerPiUid: auth.user.uid },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        updatedAt: true,
        store: { select: { name: true } },
      },
    });

    for (const inv of buyerInvoices) {
      activities.push({
        id: `buy-${inv.id}`,
        type: "invoice",
        description: `طلب من ${inv.store?.name || "متجر"} — ${inv.invoiceNumber} — ${inv.status} — ${inv.total}π`,
        timestamp: inv.updatedAt.toISOString(),
        entity: "invoice",
        entityId: inv.id,
      });
    }

    // Sort by timestamp descending and deduplicate
    const seen = new Set<string>();
    const unique: Activity[] = [];
    const sorted = activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const activity of sorted) {
      const key = `${activity.type}-${activity.entityId || ""}-${activity.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(activity);
      }
    }

    return NextResponse.json({ activities: unique.slice(0, 30) });
  } catch (error) {
    console.error("Activities API error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل الأنشطة", activities: [] },
      { status: 500 }
    );
  }
}
