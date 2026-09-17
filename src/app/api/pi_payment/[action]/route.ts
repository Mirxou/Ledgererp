import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";

const PI_API_BASE = "https://api.minepi.com/v2";

function getApiKey(): string {
  const key = process.env.PI_API_KEY;
  if (!key) {
    throw new Error("PI_API_KEY environment variable is not set");
  }
  return key;
}

function piHeaders(): HeadersInit {
  return {
    "Authorization": `Key ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

/** Pi API fetch with 10s timeout (H3 fix) */
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

type RouteContext = { params: Promise<{ action: string }> };

// GET /api/pi_payment/[action] — lightweight probe
export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  const { action } = await context.params;

  return NextResponse.json({
    message: `Pi payment ${action} endpoint is active`,
    action,
  });
}

// POST /api/pi_payment/[action] — main handler (auth required)
export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  const { action } = await context.params;

  // Auth check for all payment actions
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const auth = await verifyPiAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  try {
    switch (action) {
      case "approve":
        return handleApprove(body, auth.user.uid, req);
      case "complete":
        return handleComplete(body, auth.user.uid, req);
      case "cancel":
        return handleCancel(body, auth.user.uid, req);
      case "error":
        return handleError(body, auth.user.uid, req);
      case "incomplete":
        return handleIncomplete(body);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[pi_payment/${action}]`, message);

    if (body.paymentId) {
      try {
        await db.invoice.updateMany({
          where: {
            paymentTxId: body.paymentId,
            status: { in: ["pending"] },
          },
          data: { status: "cancelled", cancelledAt: new Date() },
        });
      } catch {
        // best-effort rollback
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Verify that the user owns the store associated with the invoice (C1 fix) */
async function verifyInvoiceOwnership(invoiceId: string, userUid: string, req: NextRequest) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { storeId: true, total: true, status: true },
  });
  if (!invoice) {
    return { ok: false as const, error: NextResponse.json({ error: "Invoice not found" }, { status: 404 }) };
  }
  const ownership = await verifyStoreOwnership(req, invoice.storeId, userUid);
  if (!ownership.ok) {
    return { ok: false as const, error: ownership.response! };
  }
  return { ok: true as const, invoice };
}

// ─── APPROVE ───────────────────────────────────────────────────────────────────
async function handleApprove(body: { paymentId?: string; invoiceId?: string }, userUid: string, req: NextRequest) {
  const { paymentId, invoiceId } = body;

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  // C1: Verify ownership if invoiceId provided
  if (invoiceId) {
    const ownResult = await verifyInvoiceOwnership(invoiceId, userUid, req);
    if (!ownResult.ok) return ownResult.error;

    // H8: Verify payment amount matches invoice total
    try {
      const piPaymentRes = await fetchWithTimeout(
        `${PI_API_BASE}/payments/${sanitizeString(paymentId, 200)}`,
        { method: "GET", headers: piHeaders() },
      );
      if (piPaymentRes.ok) {
        const piPayment = await piPaymentRes.json();
        const paymentAmount = Number(piPayment.amount);
        const invoiceTotal = ownResult.invoice.total;
        // Allow 1% tolerance for rounding
        if (paymentAmount > 0 && Math.abs(paymentAmount - invoiceTotal) > invoiceTotal * 0.01) {
          console.error(`[pi_payment/approve] Amount mismatch: payment=${paymentAmount}, invoice=${invoiceTotal}`);
          return NextResponse.json(
            { error: `Payment amount ${paymentAmount}π does not match invoice total ${invoiceTotal}π` },
            { status: 400 },
          );
        }
      }
    } catch {
      // If we can't fetch payment details, log warning but proceed (Pi may be temporarily unavailable)
      console.warn("[pi_payment/approve] Could not verify payment amount — proceeding with approval");
    }
  }

  const piRes = await fetchWithTimeout(
    `${PI_API_BASE}/payments/${sanitizeString(paymentId, 200)}/approve`,
    {
      method: "POST",
      headers: piHeaders(),
    },
  );

  if (!piRes.ok) {
    const errText = await piRes.text();
    console.error(`[pi_payment/approve] Pi API error ${piRes.status}:`, errText);
    return NextResponse.json(
      { error: `Pi approval failed: ${piRes.status}`, details: errText },
      { status: piRes.status },
    );
  }

  const paymentDTO = await piRes.json();

  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "paid_escrow", paidAt: new Date(), paymentTxId: paymentId },
    });
  } else {
    await db.invoice.updateMany({
      where: {
        OR: [{ paymentTxId: paymentId }],
        status: "pending",
      },
      data: { status: "paid_escrow", paidAt: new Date(), paymentTxId: paymentId },
    });
  }

  return NextResponse.json({
    success: true,
    payment: paymentDTO,
  });
}

// ─── COMPLETE ──────────────────────────────────────────────────────────────────
async function handleComplete(body: {
  paymentId?: string;
  txid?: string;
  invoiceId?: string;
}, userUid: string, req: NextRequest) {
  const { paymentId, txid, invoiceId } = body;

  if (!paymentId || !txid) {
    return NextResponse.json(
      { error: "paymentId and txid are required" },
      { status: 400 },
    );
  }

  // C1: Verify ownership if invoiceId provided
  if (invoiceId) {
    const ownResult = await verifyInvoiceOwnership(invoiceId, userUid, req);
    if (!ownResult.ok) return ownResult.error;
  }

  const piRes = await fetchWithTimeout(
    `${PI_API_BASE}/payments/${sanitizeString(paymentId, 200)}/complete`,
    {
      method: "POST",
      headers: piHeaders(),
      body: JSON.stringify({ txid: sanitizeString(txid, 200) }),
    },
  );

  if (!piRes.ok) {
    const errText = await piRes.text();
    console.error(`[pi_payment/complete] Pi API error ${piRes.status}:`, errText);
    return NextResponse.json(
      { error: `Pi completion failed: ${piRes.status}`, details: errText },
      { status: piRes.status },
    );
  }

  const paymentDTO = await piRes.json();

  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "paid_escrow",
        paymentTxId: txid,
        paidAt: new Date(),
      },
    });
  } else {
    await db.invoice.updateMany({
      where: { paymentTxId: paymentId },
      data: {
        status: "paid_escrow",
        paymentTxId: txid,
        paidAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    payment: paymentDTO,
  });
}

// ─── CANCEL ────────────────────────────────────────────────────────────────────
async function handleCancel(body: { paymentId?: string; invoiceId?: string }, userUid: string, req: NextRequest) {
  const { paymentId, invoiceId } = body;

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  // C1: Verify ownership if invoiceId provided
  if (invoiceId) {
    const ownResult = await verifyInvoiceOwnership(invoiceId, userUid, req);
    if (!ownResult.ok) return ownResult.error;
  }

  // H2: Call Pi API to cancel the payment on Pi's side
  try {
    const piRes = await fetchWithTimeout(
      `${PI_API_BASE}/payments/${sanitizeString(paymentId, 200)}/cancel`,
      {
        method: "POST",
        headers: piHeaders(),
      },
    );
    if (!piRes.ok) {
      const errText = await piRes.text();
      console.error(`[pi_payment/cancel] Pi API error ${piRes.status}:`, errText);
      // Continue to cancel locally even if Pi cancel fails
    } else {
      console.log(`[pi_payment/cancel] Pi payment ${paymentId} cancelled on Pi side`);
    }
  } catch (err) {
    console.error("[pi_payment/cancel] Failed to call Pi cancel API:", err);
    // Continue to cancel locally even if Pi cancel fails
  }

  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
  }

  return NextResponse.json({
    success: true,
    cancelled: true,
    paymentId,
  });
}

// ─── ERROR ─────────────────────────────────────────────────────────────────────
async function handleError(body: {
  paymentId?: string;
  error?: string;
  invoiceId?: string;
}, userUid: string, req: NextRequest) {
  const { paymentId, error: errorMessage, invoiceId } = body;

  console.error(`[pi_payment/error] Payment error for ${paymentId}:`, errorMessage);

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  // C1: Verify ownership if invoiceId provided
  if (invoiceId) {
    const ownResult = await verifyInvoiceOwnership(invoiceId, userUid, req);
    if (!ownResult.ok) return ownResult.error;
  }

  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        notes: `Payment error: ${sanitizeString(errorMessage || "unknown", 500)}`,
      },
    });
  }

  return NextResponse.json({
    success: false,
    error: errorMessage,
    paymentId,
  });
}

// ─── INCOMPLETE PAYMENT ────────────────────────────────────────────────────────
async function handleIncomplete(body: {
  payment?: Record<string, unknown>;
}) {
  const { payment } = body;

  if (!payment) {
    return NextResponse.json(
      { error: "payment object is required" },
      { status: 400 },
    );
  }

  const paymentId = payment.identifier as string | undefined;

  console.log("[pi_payment/incomplete] Found incomplete payment:", paymentId);

  if (paymentId) {
    const updated = await db.invoice.updateMany({
      where: {
        paymentTxId: paymentId,
        status: { in: ["pending", "paid_escrow"] },
      },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        notes: `Incomplete payment found — paymentId: ${paymentId}`,
      },
    });

    if (updated.count > 0) {
      return NextResponse.json({
        success: true,
        message: `Updated ${updated.count} invoice(s) to cancelled`,
        payment,
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: "Incomplete payment acknowledged, no matching invoice found",
    payment,
  });
}
