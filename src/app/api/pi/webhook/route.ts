import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeString, checkRateLimit } from "@/lib/api-auth";

// Switch between sandbox and mainnet based on NODE_ENV
const PI_API_BASE = process.env.NODE_ENV === "development"
  ? "https://api.sandbox.minepi.com/v2"
  : "https://api.minepi.com/v2";

/** Pi API fetch with 10s timeout */
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Verify webhook by fetching payment from Pi API (fail-closed).
 *
 * Instead of trusting the request body, we:
 * 1. Extract the paymentId from the body
 * 2. Call Pi API GET /v2/payments/{paymentId} with our PI_API_KEY
 * 3. Use the Pi API response for status and amount (NOT the request body)
 * 4. If the Pi API call fails, REJECT the webhook
 */
async function verifyWebhookSignature(paymentId: string): Promise<{
  ok: true;
  payment: {
    identifier: string;
    user_uid: string;
    amount: number;
    memo: string;
    metadata: Record<string, unknown>;
    status: string;
    transaction?: { txid: string };
  };
} | { ok: false; error: string }> {
  const apiKey = process.env.PI_API_KEY;
  if (!apiKey) {
    console.error("[pi/webhook] SECURITY: PI_API_KEY not configured — rejecting webhook");
    return { ok: false, error: "Server not configured for webhook verification" };
  }

  try {
    console.log(`[pi/webhook] Verifying payment ${paymentId} with Pi API...`);
    const piRes = await fetchWithTimeout(`${PI_API_BASE}/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Key ${apiKey}`,
      },
    });

    if (!piRes.ok) {
      const status = piRes.status;
      console.error(`[pi/webhook] SECURITY: Pi API verification failed for ${paymentId} — status ${status}`);
      if (status === 404) {
        return { ok: false, error: "Payment not found on Pi servers" };
      }
      return { ok: false, error: `Pi API verification failed (${status})` };
    }

    const payment = await piRes.json();

    if (!payment || !payment.identifier) {
      console.error(`[pi/webhook] SECURITY: Pi API returned invalid payment data for ${paymentId}`);
      return { ok: false, error: "Invalid payment data from Pi API" };
    }

    console.log(`[pi/webhook] Verified payment ${paymentId}: status=${payment.status}, amount=${payment.amount}`);
    return { ok: true, payment };
  } catch (err) {
    console.error(`[pi/webhook] SECURITY: Pi API call failed for ${paymentId}:`, err);
    return { ok: false, error: "Failed to verify payment with Pi API" };
  }
}

/**
 * POST /api/pi/webhook
 *
 * Pi Platform server-to-server callback for payment status changes.
 * Pi calls this endpoint when:
 * - A2U payment is completed (settled on blockchain)
 * - Payment is cancelled
 * - Payment encounters an error
 *
 * SECURITY: This endpoint verifies the payment with Pi API before
 * processing. The request body is NOT trusted — we only use the
 * paymentId to fetch verified data from Pi servers.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const body = await req.json();
    const rawPayment = body.payment || body;
    const paymentId = sanitizeString(rawPayment.identifier || rawPayment.paymentId || rawPayment.id, 100);

    console.log(`[pi/webhook] Received webhook for paymentId=${paymentId}`);

    if (!paymentId) {
      console.warn("[pi/webhook] Rejected: missing payment identifier");
      return NextResponse.json({ error: "Missing payment identifier" }, { status: 400 });
    }

    // ── SECURITY: Verify with Pi API instead of trusting request body ──
    const verification = await verifyWebhookSignature(paymentId);
    if (!verification.ok) {
      console.error(`[pi/webhook] SECURITY: Rejected webhook for ${paymentId}: ${verification.error}`);
      return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
    }

    // Use verified Pi API response (NOT the request body)
    const payment = verification.payment;
    const status = sanitizeString(payment.status, 20);
    const metadata = (payment.metadata || {}) as Record<string, string>;
    const invoiceId = metadata.invoiceId;

    console.log(`[pi/webhook] Verified: status=${status}, paymentId=${paymentId}, amount=${payment.amount}`);

    // Handle A2U payment completion (escrow release)
    if (status === "completed") {
      // Find invoice that was in 'releasing' state for this payment
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
          console.log(`[pi/webhook] Invoice ${invoice.invoiceNumber} → completed (A2U settled, verified)`);
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
        console.log(`[pi/webhook] Invoice ${invoiceByTx.invoiceNumber} → completed (txid match, verified)`);
        return NextResponse.json({ success: true, action: "invoice_completed", invoiceNumber: invoiceByTx.invoiceNumber });
      }

      // Payment completed but no matching invoice found
      console.log(`[pi/webhook] Verified payment ${paymentId} completed, no matching releasing invoice`);
      return NextResponse.json({ success: true, action: "no_match", note: "Payment completed but no releasing invoice found" });
    }

    // Handle payment cancellation
    if (status === "cancelled") {
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
          console.log(`[pi/webhook] Invoice ${invoice.invoiceNumber} → cancelled (verified)`);
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
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
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
