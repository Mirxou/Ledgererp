import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

// POST /api/pi_payment/[action] — main handler
export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  const { action } = await context.params;
  const body = await req.json();

  try {
    switch (action) {
      case "approve":
        return handleApprove(body);
      case "complete":
        return handleComplete(body);
      case "cancel":
        return handleCancel(body);
      case "error":
        return handleError(body);
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

    // If a DB update was supposed to happen, don't leave invoice in limbo
    if (body.paymentId) {
      try {
        await db.invoice.updateMany({
          where: {
            paymentTxId: body.paymentId,
            status: { in: ["pending"] },
          },
          data: { status: "cancelled" },
        });
      } catch {
        // best-effort rollback
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── APPROVE ───────────────────────────────────────────────────────────────────
// Frontend calls this after Pi SDK fires onReadyForServerApproval(paymentId)
// We tell the Pi server to approve the escrow hold.
async function handleApprove(body: { paymentId?: string; invoiceId?: string }) {
  const { paymentId, invoiceId } = body;

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  // Call Pi API to approve the payment (escrow hold)
  const piRes = await fetch(
    `${PI_API_BASE}/payments/${paymentId}/approve`,
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

  // Update invoice status in DB to "paid_escrow"
  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "paid_escrow" },
    });
  } else {
    // Fallback: try to find invoice by matching paymentId in paymentTxId
    // or by looking at recent pending invoices (best-effort)
    await db.invoice.updateMany({
      where: {
        OR: [
          { paymentTxId: paymentId },
          // If no direct match, we skip — frontend should always send invoiceId
        ],
        status: "pending",
      },
      data: { status: "paid_escrow", paymentTxId: paymentId },
    });
  }

  return NextResponse.json({
    success: true,
    payment: paymentDTO,
  });
}

// ─── COMPLETE ──────────────────────────────────────────────────────────────────
// Frontend calls this after Pi SDK fires onReadyForServerCompletion(paymentId, txid)
// We tell the Pi server the transaction is complete and store the txid.
async function handleComplete(body: {
  paymentId?: string;
  txid?: string;
  invoiceId?: string;
}) {
  const { paymentId, txid, invoiceId } = body;

  if (!paymentId || !txid) {
    return NextResponse.json(
      { error: "paymentId and txid are required" },
      { status: 400 },
    );
  }

  // Call Pi API to complete the payment
  const piRes = await fetch(
    `${PI_API_BASE}/payments/${paymentId}/complete`,
    {
      method: "POST",
      headers: piHeaders(),
      body: JSON.stringify({ txid }),
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

  // Update invoice with blockchain txid and completed status
  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "completed",
        paymentTxId: txid,
      },
    });
  } else {
    await db.invoice.updateMany({
      where: { paymentTxId: paymentId },
      data: {
        status: "completed",
        paymentTxId: txid,
      },
    });
  }

  return NextResponse.json({
    success: true,
    payment: paymentDTO,
  });
}

// ─── CANCEL ────────────────────────────────────────────────────────────────────
// Frontend calls this after Pi SDK fires onCancel(paymentId)
async function handleCancel(body: { paymentId?: string; invoiceId?: string }) {
  const { paymentId, invoiceId } = body;

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  // Update invoice status to cancelled
  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "cancelled" },
    });
  }

  return NextResponse.json({
    success: true,
    cancelled: true,
    paymentId,
  });
}

// ─── ERROR ─────────────────────────────────────────────────────────────────────
// Frontend calls this after Pi SDK fires onError(paymentId, error)
async function handleError(body: {
  paymentId?: string;
  error?: string;
  invoiceId?: string;
}) {
  const { paymentId, error: errorMessage, invoiceId } = body;

  console.error(`[pi_payment/error] Payment error for ${paymentId}:`, errorMessage);

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  // Update invoice status to cancelled
  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "cancelled", notes: `Payment error: ${errorMessage || "unknown"}` },
    });
  }

  return NextResponse.json({
    success: false,
    error: errorMessage,
    paymentId,
  });
}

// ─── INCOMPLETE PAYMENT ────────────────────────────────────────────────────────
// Frontend calls this when Pi SDK fires onIncompletePaymentFound(payment)
// This happens when a payment was started but never completed (e.g., app closed).
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
  const tx = payment.transaction as Record<string, unknown> | undefined;
  const txid = tx?.txid as string | undefined;

  console.log("[pi_payment/incomplete] Found incomplete payment:", paymentId);

  // Try to find and update the corresponding invoice
  if (paymentId) {
    const updated = await db.invoice.updateMany({
      where: {
        paymentTxId: paymentId,
        status: { in: ["pending", "paid_escrow"] },
      },
      data: {
        status: "cancelled",
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

  // No matching invoice found — just acknowledge
  return NextResponse.json({
    success: true,
    message: "Incomplete payment acknowledged, no matching invoice found",
    payment,
  });
}