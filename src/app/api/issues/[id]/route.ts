import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/api-auth";

/**
 * GET /api/issues/[id]
 * Returns a single invoice (dispute/issue) by ID with audit logs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const { id } = await params;

    // Fetch invoice by ID (could be invoiceId or id)
    const invoice = await db.invoice.findFirst({
      where: { id },
      include: {
        items: true,
        store: { select: { name: true, piUid: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    }

    // Fetch related audit logs
    const logs = await db.auditLog.findMany({
      where: { entity: "invoice", entityId: invoice.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ issue: invoice, logs });
  } catch (error) {
    console.error("Failed to fetch issue:", error);
    return NextResponse.json({ error: "فشل في جلب المشكلة" }, { status: 500 });
  }
}
