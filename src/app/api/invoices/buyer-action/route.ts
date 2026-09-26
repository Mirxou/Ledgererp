import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/invoices/buyer-action
 *
 * Public endpoint for buyer actions on invoices.
 * Does NOT require store ownership — only the invoice ID is needed.
 *
 * Supported actions:
 * - confirmDelivery: shipped → delivered
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const body = await req.json();
    const { invoiceId, action } = body;

    if (!invoiceId || typeof invoiceId !== "string") {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // Get the invoice
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, invoiceNumber: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    switch (action) {
      case "confirmDelivery": {
        // Only allow transition from shipped → delivered
        if (invoice.status !== "shipped") {
          return NextResponse.json(
            { error: `Cannot confirm delivery for invoice in '${invoice.status}' status. Invoice must be 'shipped'.` },
            { status: 400 },
          );
        }

        const updated = await db.invoice.update({
          where: { id: invoiceId },
          data: { status: "delivered", deliveredAt: new Date() },
          include: { items: true, store: { select: { name: true, piUid: true } } },
        });

        return NextResponse.json({ success: true, invoice: updated });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("Buyer action error:", error);
    return NextResponse.json({ error: "Failed to process buyer action" }, { status: 500 });
  }
}
