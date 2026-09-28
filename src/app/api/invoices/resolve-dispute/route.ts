import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/invoices/resolve-dispute
 *
 * MERCHANT ONLY — Resolve a disputed invoice.
 * Auth + store ownership required.
 * 
 * Actions:
 * - refund: disputed → cancelled (merchant agrees to refund, escrow returned to buyer)
 * - fulfill: disputed → delivered (merchant confirms delivery despite dispute)
 * - reject: disputed → paid_escrow (merchant rejects the dispute, invoice continues)
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { invoiceId, action } = body;
    const reason = sanitizeString(body.reason || "", 500);

    if (!invoiceId || typeof invoiceId !== "string") {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "action is required (refund, fulfill, or reject)" }, { status: 400 });
    }

    // Get the invoice
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true, invoiceNumber: true, storeId: true, notes: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status !== "disputed") {
      return NextResponse.json(
        { error: `Cannot resolve: invoice is in '${invoice.status}' status, not 'disputed'` },
        { status: 400 },
      );
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, invoice.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    switch (action) {
      case "refund": {
        // Merchant agrees to refund → cancel invoice (escrow returns to buyer via Pi)
        const updated = await db.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            notes: (invoice.notes || "") + " | Merchant resolved: REFUND" + (reason ? " — " + reason : ""),
          },
          include: { items: true, store: { select: { name: true, piUid: true } } },
        });
        console.log(`[resolve-dispute] Invoice ${invoice.invoiceNumber} → cancelled (refund)`);
        return NextResponse.json({ success: true, invoice: updated, resolution: "refunded" });
      }

      case "fulfill": {
        // Merchant confirms delivery despite dispute → delivered
        const updated = await db.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "delivered",
            deliveredAt: new Date(),
            notes: (invoice.notes || "") + " | Merchant resolved: FULFILLED" + (reason ? " — " + reason : ""),
          },
          include: { items: true, store: { select: { name: true, piUid: true } } },
        });
        console.log(`[resolve-dispute] Invoice ${invoice.invoiceNumber} → delivered (fulfill)`);
        return NextResponse.json({ success: true, invoice: updated, resolution: "fulfilled" });
      }

      case "reject": {
        // Merchant rejects the dispute → back to paid_escrow (invoice continues)
        const updated = await db.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "paid_escrow",
            notes: (invoice.notes || "") + " | Merchant resolved: DISPUTE REJECTED" + (reason ? " — " + reason : ""),
          },
          include: { items: true, store: { select: { name: true, piUid: true } } },
        });
        console.log(`[resolve-dispute] Invoice ${invoice.invoiceNumber} → paid_escrow (reject dispute)`);
        return NextResponse.json({ success: true, invoice: updated, resolution: "rejected" });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}. Use: refund, fulfill, or reject` }, { status: 400 });
    }
  } catch (error) {
    console.error("Resolve dispute error:", error);
    return NextResponse.json({ error: "Failed to resolve dispute" }, { status: 500 });
  }
}
