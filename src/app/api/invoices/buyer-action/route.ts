import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, sanitizeString, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/invoices/buyer-action
 *
 * Endpoint for buyer actions on invoices.
 * AUTH REQUIRED for confirmDelivery — verifies the caller is the actual buyer (customerPiUid).
 * 
 * Supported actions:
 * - confirmDelivery: shipped → delivered (requires buyer auth)
 * - dispute: paid_escrow/shipped → disputed (requires buyer auth)
 * - cancelDispute: disputed → paid_escrow (buyer withdraws dispute, requires auth)
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
      select: { id: true, status: true, invoiceNumber: true, customerPiUid: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    switch (action) {
      case "confirmDelivery": {
        // AUTH REQUIRED: Verify the caller is the actual buyer
        const auth = await verifyPiAuth(req);
        if (!auth.ok) {
          return NextResponse.json(
            { error: "Authentication required to confirm delivery. Please log in with Pi." },
            { status: 401 }
          );
        }

        // Verify the authenticated user IS the buyer
        if (auth.user.uid !== invoice.customerPiUid) {
          return NextResponse.json(
            { error: "Only the buyer can confirm delivery on this invoice." },
            { status: 403 }
          );
        }

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

      case "dispute": {
        // AUTH REQUIRED: Verify the caller is the actual buyer
        const auth = await verifyPiAuth(req);
        if (!auth.ok) {
          return NextResponse.json(
            { error: "Authentication required to open a dispute." },
            { status: 401 }
          );
        }

        if (auth.user.uid !== invoice.customerPiUid) {
          return NextResponse.json(
            { error: "Only the buyer can open a dispute on this invoice." },
            { status: 403 }
          );
        }

        // Allow dispute from paid_escrow or shipped
        if (invoice.status !== "paid_escrow" && invoice.status !== "shipped") {
          return NextResponse.json(
            { error: `Cannot dispute invoice in '${invoice.status}' status.` },
            { status: 400 },
          );
        }

        const updated = await db.invoice.update({
          where: { id: invoiceId },
          data: { status: "disputed", notes: sanitizeString(body.reason || body.notes || "", 500) ? (invoice.id + " | Dispute: " + sanitizeString(body.reason || body.notes || "", 500)) : "" },
          include: { items: true, store: { select: { name: true, piUid: true } } },
        });

        return NextResponse.json({ success: true, invoice: updated });
      }

      case "cancelDispute": {
        // AUTH REQUIRED: Buyer withdraws their own dispute
        const auth = await verifyPiAuth(req);
        if (!auth.ok) {
          return NextResponse.json(
            { error: "Authentication required to cancel dispute." },
            { status: 401 }
          );
        }

        if (auth.user.uid !== invoice.customerPiUid) {
          return NextResponse.json(
            { error: "Only the buyer who opened the dispute can cancel it." },
            { status: 403 }
          );
        }

        if (invoice.status !== "disputed") {
          return NextResponse.json(
            { error: "Invoice is not in disputed status." },
            { status: 400 },
          );
        }

        const updated = await db.invoice.update({
          where: { id: invoiceId },
          data: { status: "paid_escrow" },
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
