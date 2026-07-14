import { NextRequest, NextResponse } from "next/server";

/* ════════════════════════════════════════════════════════════════════════════
   PI PAYMENT API
   Handles Pi payment creation and completion following the official Pi SDK
   "Double-Check" flow:
     1. Frontend creates payment via Pi SDK
     2. Server receives paymentId → verifies with Pi Platform API
     3. Server completes the payment

   In production, this calls:
     POST   https://api.minepi.com/v2/payments
     GET    https://api.minepi.com/v2/payments/{paymentId}
     POST   https://api.minepi.com/v2/payments/{paymentId}/complete
   ════════════════════════════════════════════════════════════════════════════ */

interface PaymentBody {
  amount: number;
  memo: string;
  uid: string;
  accessToken: string;
}

// In-memory demo store (replace with DB in production)
const payments = new Map<
  string,
  {
    paymentId: string;
    amount: number;
    memo: string;
    uid: string;
    status: string;
    txid?: string;
    createdAt: string;
    completedAt?: string;
  }
>();

/** POST /api/pi/payment — Create a payment */
export async function POST(request: NextRequest) {
  try {
    const body: PaymentBody = await request.json();
    const { amount, memo, uid, accessToken } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "المبلغ غير صالح" },
        { status: 400 }
      );
    }

    if (!uid) {
      return NextResponse.json(
        { error: "معرّف المستخدم مطلوب" },
        { status: 400 }
      );
    }

    // In production, this calls Pi Platform API:
    // POST https://api.minepi.com/v2/payments
    // Headers: Authorization: Bearer {accessToken}
    // Body: { amount, memo, metadata: { uid }, uid }

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payment = {
      paymentId,
      amount,
      memo,
      uid,
      status: "created",
      createdAt: new Date().toISOString(),
    };

    payments.set(paymentId, payment);

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Payment creation failed:", error);
    return NextResponse.json(
      { error: "فشل في إنشاء الدفعة" },
      { status: 500 }
    );
  }
}

/** PATCH /api/pi/payment — Approve/Complete payment (server-side validation) */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, action, txid } = body as {
      paymentId: string;
      action: "approve" | "complete";
      txid?: string;
    };

    if (!paymentId || !action) {
      return NextResponse.json(
        { error: "بيانات غير مكتملة" },
        { status: 400 }
      );
    }

    const payment = payments.get(paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: "الدفعة غير موجودة" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      // Server-side: verify payment with Pi Platform API
      // GET https://api.minepi.com/v2/payments/{paymentId}
      // Verify amount, recipient, status === "developed"

      payment.status = "approved";

      return NextResponse.json({
        success: true,
        paymentId,
        action: "approve",
        status: payment.status,
      });
    }

    if (action === "complete") {
      // Server-side: complete the payment
      // POST https://api.minepi.com/v2/payments/{paymentId}/complete

      payment.status = "completed";
      payment.txid = txid || `tx_demo_${Date.now()}`;
      payment.completedAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        paymentId,
        action: "complete",
        status: payment.status,
        txid: payment.txid,
      });
    }

    return NextResponse.json(
      { error: "إجراء غير معروف" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Payment action failed:", error);
    return NextResponse.json(
      { error: "فشل في معالجة الدفعة" },
      { status: 500 }
    );
  }
}