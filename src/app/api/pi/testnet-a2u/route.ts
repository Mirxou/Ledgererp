import { NextRequest, NextResponse } from "next/server";
import { verifyPiAuth, sanitizeString, validatePositiveNumber, checkRateLimit } from "@/lib/api-auth";

const PI_SANDBOX_API_BASE = "https://api.sandbox.minepi.com/v2";

function getApiKey(): string {
  const key = process.env.PI_API_KEY;
  if (!key) {
    throw new Error("PI_API_KEY environment variable is not set");
  }
  return key;
}

function getWalletAddress(): string {
  const addr = process.env.PI_WALLET_ADDRESS || "";
  return addr;
}

function piHeaders(): HeadersInit {
  return {
    "Authorization": `Key ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

interface TestPayment {
  id: string;
  uid: string;
  amount: string;
  memo: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  piPaymentId?: string;
  simulated?: boolean;
  error?: string;
}

let recentPayments: TestPayment[] = [];

// POST /api/pi/testnet-a2u (auth required)
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { memo, simulate } = body;
    const amount = validatePositiveNumber(body.amount);
    const uid = sanitizeString(body.uid, 100);

    if (!amount || !uid) {
      return NextResponse.json(
        { error: "amount (positive number) and uid are required" },
        { status: 400 },
      );
    }

    const walletAddress = getWalletAddress();
    const apiKeySet = !!process.env.PI_API_KEY;

    if (!apiKeySet) {
      return NextResponse.json(
        { error: "PI_API_KEY is not configured in .env" },
        { status: 500 },
      );
    }

    if (simulate) {
      const simPaymentId = "sim_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);

      const completedPayment: TestPayment = {
        id: simPaymentId,
        uid,
        amount: String(amount),
        memo: sanitizeString(memo, 200) || "Testnet A2U test payment",
        status: "completed",
        createdAt: new Date().toISOString(),
        piPaymentId: simPaymentId,
        simulated: true,
      };
      recentPayments.unshift(completedPayment);
      if (recentPayments.length > 50) recentPayments = recentPayments.slice(0, 50);

      const uniqueUids = new Set(
        recentPayments.filter(p => p.status === "completed").map(p => p.uid)
      );

      console.log(`[pi/testnet-a2u] SIMULATED payment: ${amount}π to UID ${uid}`);

      return NextResponse.json({
        success: true,
        simulated: true,
        payment: {
          identifier: simPaymentId,
          amount: String(amount),
          uid,
          memo: sanitizeString(memo, 200) || "Testnet A2U test payment",
          status: "completed",
        },
        walletAddress,
        sandbox: true,
        uniqueUidCount: uniqueUids.size,
        required: 5,
        requirementMet: uniqueUids.size >= 5,
        message: "Simulated payment recorded.",
      });
    }

    // Real Pi API Mode
    const paymentBody = {
      amount: String(amount),
      memo: sanitizeString(memo, 200) || "Testnet A2U test payment",
      metadata: { type: "testnet_a2u_test", purpose: "mainnet_wallet_requirement" },
      uid,
    };

    console.log(`[pi/testnet-a2u] Creating testnet A2U payment: ${amount}π to UID ${uid}`);

    const piRes = await fetch(`${PI_SANDBOX_API_BASE}/payments`, {
      method: "POST",
      headers: piHeaders(),
      body: JSON.stringify(paymentBody),
    });

    if (!piRes.ok) {
      const errText = await piRes.text();
      console.error(`[pi/testnet-a2u] Pi Sandbox API error ${piRes.status}:`, errText);

      const failedPayment: TestPayment = {
        id: "tp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
        uid,
        amount: String(amount),
        memo: sanitizeString(memo, 200) || "Testnet A2U test payment",
        status: "failed",
        createdAt: new Date().toISOString(),
        error: `API ${piRes.status}: ${errText}`,
      };
      recentPayments.unshift(failedPayment);
      if (recentPayments.length > 50) recentPayments = recentPayments.slice(0, 50);

      return NextResponse.json(
        { error: `Testnet A2U payment failed: ${piRes.status}`, details: errText },
        { status: piRes.status },
      );
    }

    const paymentDTO = await piRes.json();

    const completedPayment: TestPayment = {
      id: paymentDTO.identifier || ("tp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8)),
      uid,
      amount: String(amount),
      memo: sanitizeString(memo, 200) || "Testnet A2U test payment",
      status: "completed",
      createdAt: new Date().toISOString(),
      piPaymentId: paymentDTO.identifier,
    };
    recentPayments.unshift(completedPayment);
    if (recentPayments.length > 50) recentPayments = recentPayments.slice(0, 50);

    const uniqueUids = new Set(
      recentPayments.filter(p => p.status === "completed").map(p => p.uid)
    );

    return NextResponse.json({
      success: true,
      payment: paymentDTO,
      walletAddress,
      sandbox: true,
      uniqueUidCount: uniqueUids.size,
      required: 5,
      requirementMet: uniqueUids.size >= 5,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pi/testnet-a2u]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/pi/testnet-a2u (auth required)
export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const auth = await verifyPiAuth(req);
  if (!auth.ok) return auth.response;

  const hasApiKey = !!process.env.PI_API_KEY;
  const walletAddress = getWalletAddress();

  const completedPayments = recentPayments.filter(p => p.status === "completed");
  const uniqueUids = new Set(completedPayments.map(p => p.uid));
  const hasSimulated = recentPayments.some(p => p.simulated);

  return NextResponse.json({
    configured: hasApiKey,
    apiKeySet: hasApiKey,
    walletAddress: walletAddress || "not set",
    sandboxApiBase: PI_SANDBOX_API_BASE,
    recentPayments,
    completedCount: completedPayments.length,
    uniqueUidCount: uniqueUids.size,
    uniqueUids: Array.from(uniqueUids),
    required: 5,
    requirementMet: uniqueUids.size >= 5,
    hasSimulated,
    message: hasApiKey
      ? "Testnet A2U payments are configured."
      : "PI_API_KEY must be set in .env",
  });
}

// DELETE /api/pi/testnet-a2u — clear history (auth required)
export async function DELETE(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const auth = await verifyPiAuth(req);
  if (!auth.ok) return auth.response;

  recentPayments = [];
  return NextResponse.json({
    success: true,
    message: "All testnet A2U payment history cleared",
  });
}
