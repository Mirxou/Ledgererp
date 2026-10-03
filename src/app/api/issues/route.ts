import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, checkRateLimit, sanitizeString } from "@/lib/api-auth";

/**
 * GET /api/issues
 * Returns REAL invoice issues/disputes from the database.
 * This endpoint now serves the escrow platform's "issues" = disputed invoices,
 * not the old security audit issues.
 */
export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");

    // Get store for this merchant
    const store = await db.store.findUnique({ where: { piUid: auth.user.uid } });

    // Build where clause
    const where: Record<string, unknown> = {};
    if (store) where.storeId = store.id;
    // Also include invoices where user is buyer
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Fetch disputed and problematic invoices
    const disputedInvoices = await db.invoice.findMany({
      where: {
        ...where,
        status: { in: status === "ALL" || !status ? ["disputed", "cancelled"] : [status] },
      },
      include: {
        items: true,
        store: { select: { name: true, piUid: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Also get buyer-side disputes
    const buyerDisputes = await db.invoice.findMany({
      where: {
        customerPiUid: auth.user.uid,
        status: { in: ["disputed", "cancelled"] },
      },
      include: {
        items: true,
        store: { select: { name: true, piUid: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Merge and deduplicate
    const seen = new Set<string>();
    const allIssues = [...disputedInvoices, ...buyerDisputes].filter((inv) => {
      if (seen.has(inv.id)) return false;
      seen.add(inv.id);
      return true;
    });

    return NextResponse.json({ issues: allIssues, total: allIssues.length });
  } catch (error) {
    console.error("Failed to fetch issues:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

/** Update an issue (resolve dispute, add notes) */
export async function PATCH(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { invoiceId, status, notes } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId مطلوب" }, { status: 400 });
    }

    const existing = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!existing) {
      return NextResponse.json({ error: "الفاتورة غير موجودة", status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = sanitizeString(notes, 500);

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: status ? "issue_status_change" : "issue_note_added",
        userId: auth.user.uid,
        entity: "invoice",
        entityId: invoiceId,
        details: status
          ? `تم تغيير حالة النزاع إلى ${status}`
          : `تم إضافة ملاحظة: ${notes}`,
      },
    });

    return NextResponse.json({ issue: updated, success: true });
  } catch (error) {
    console.error("Failed to update issue:", error);
    return NextResponse.json({ error: "فشل في تحديث المشكلة" }, { status: 500 });
  }
}
