import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeString, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/pi/webhook
 *
 * Pi Platform server-to-server callback for payment status changes.
 * Pi calls this endpoint when:
 * - A2U payment is completed (settled on blockchain)
 * - Payment is cancelled
 * - Payment encounters an error
 *
 * This is CRITICAL for the escrow flow:
 * - `releasing` → `completed` when Pi confirms A2U payment settlement
 * 
 * Pi Platform sends:
 * { payment: { identifier, user_uid, amount, memo, metadata, ... }, status: "completed"|"cancelled" }
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const body = await req.json();
    const payment = body.payment || body;
    const status = sanitizeString(body.status || payment.status, 20);
    const paymentId = sanitizeString(payment.identifier || payment.paymentId || payment.id, 100);

    console.log(`[pi/webhook] Received: status=${status}, paymentId=${paymentId}`);

    if (!paymentId || !status) {
      return NextResponse.json({ error: "Missing payment identifier or status" }, { status: 400 });
    }

    // Handle A2U payment completion (escrow release)
    if (status === "completed") {
      // Find invoice that was in 'releasing' state for this payment
      const metadata = payment.metadata || {};
      const invoiceId = metadata.invoiceId;

      if (invoiceId) {
        const invoice = await db.invoice.findUnique({
          where: { id: invoiceId },
          select: { id: true, status: true, invoiceNumber: true },
        });

        if (invoice && invoice.status === "releasing") {
          await db.invoice.update({
            where: { id: invoiceId },
            data: {
              status: "completed",
              completedAt: new Date(),
            },
          });
          console.log(`[pi/webhook] Invoice ${invoice.invoiceNumber} → completed (A2U settled)`);
          return NextResponse.json({ success: true, action: "invoice_completed", invoiceNumber: invoice.invoiceNumber });
        }
      }

      // Also check by txid match
      const invoiceByTx = await db.invoice.findFirst({
        where: { releaseTxId: paymentId, status: "releasing" },
        select: { id: true, invoiceNumber: true },
      });

      if (invoiceByTx) {
        await db.invoice.update({
          where: { id: invoiceByTx.id },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        });
        console.log(`[pi/webhook] Invoice ${invoiceByTx.invoiceNumber} → completed (txid match)`);
        return NextResponse.json({ success: true, action: "invoice_completed", invoiceNumber: invoiceByTx.invoiceNumber });
      }

      // Payment completed but no matching invoice found
      console.log(`[pi/webhook] Payment ${paymentId} completed, no matching releasing invoice`);
      return NextResponse.json({ success: true, action: "no_match", note: "Payment completed but no releasing invoice found" });
    }

    // Handle payment cancellation
    if (status === "cancelled") {
      const metadata = payment.metadata || {};
      const invoiceId = metadata.invoiceId;

      if (invoiceId) {
        const invoice = await db.invoice.findUnique({
          where: { id: invoiceId },
          select: { id: true, status: true, invoiceNumber: true },
        });

        if (invoice && (invoice.status === "pending" || invoice.status === "paid_escrow" || invoice.status === "releasing")) {
          await db.invoice.update({
            where: { id: invoiceId },
            data: {
              status: "cancelled",
              cancelledAt: new Date(),
            },
          });
          console.log(`[pi/webhook] Invoice ${invoice.invoiceNumber} → cancelled`);
          return NextResponse.json({ success: true, action: "invoice_cancelled" });
        }
      }

      return NextResponse.json({ success: true, action: "no_action" });
    }

    // Handle interaction event
    if (status === "interaction") {
      return NextResponse.json({ success: true, action: "interaction_acknowledged" });
    }

    return NextResponse.json({ success: true, action: "unhandled_status", status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[pi/webhook] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/pi/webhook
 * Health check endpoint for Pi Platform to verify webhook is active
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "active",
    message: "Ledgererp Pi webhook endpoint is ready",
    supportedEvents: ["completed", "cancelled", "interaction"],
  });
}
