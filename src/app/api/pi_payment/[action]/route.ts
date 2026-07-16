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

// ─── APPROVE ───────────────────────────────────────────────────────────────────
async function handleApprove(body: { paymentId?: string; invoiceId?: string }) {
  const { paymentId, invoiceId } = body;

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

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
}) {
  const { paymentId, txid, invoiceId } = body;

  if (!paymentId || !txid) {
    return NextResponse.json(
      { error: "paymentId and txid are required" },
      { status: 400 },
    );
  }

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

  // After U2A complete, the money is in escrow. Status stays paid_escrow.
  // It moves to shipped/delivered/completed through the seller workflow.
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
async function handleCancel(body: { paymentId?: string; invoiceId?: string }) {
  const { paymentId, invoiceId } = body;

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
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
}) {
  const { paymentId, error: errorMessage, invoiceId } = body;

  console.error(`[pi_payment/error] Payment error for ${paymentId}:`, errorMessage);

  if (!paymentId) {
    return NextResponse.json(
      { error: "paymentId is required" },
      { status: 400 },
    );
  }

  if (invoiceId) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        notes: `Payment error: ${errorMessage || "unknown"}`,
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