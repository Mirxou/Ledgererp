import { NextRequest, NextResponse } from "next/server";

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

// In-memory store for recent testnet A2U payments (resets on server restart)
// This is fine for a test/requirement-checking tool
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

// POST /api/pi/testnet-a2u
// Creates a testnet App-to-User payment for the Mainnet Wallet requirement.
// Supports simulation mode when Pi API is unreachable (outside Pi Browser)
export async function POST(req: NextRequest) {
  try {
    const {
      amount,      // Amount in Pi (string, e.g. "0.01")
      uid,         // Recipient's Pi UID (must be a different user for each of the 5)
      memo,        // Transaction memo
      simulate,    // If true, simulate the payment without calling Pi API
    } = await req.json();

    // Validate required fields
    if (!amount || !uid) {
      return NextResponse.json(
        { error: "amount and uid are required" },
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

    // ── Simulation Mode ──
    // When outside Pi Browser or Pi API is unreachable, we can simulate
    // the A2U payment to test the flow. This records the payment as completed
    // without actually calling the Pi Sandbox API.
    if (simulate) {
      const simPaymentId = "sim_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);

      const completedPayment: TestPayment = {
        id: simPaymentId,
        uid,
        amount: String(amount),
        memo: memo || "Testnet A2U test payment",
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

      console.log(`[pi/testnet-a2u] SIMULATED payment: ${amount}π to UID ${uid} (sim_id: ${simPaymentId})`);

      return NextResponse.json({
        success: true,
        simulated: true,
        payment: {
          identifier: simPaymentId,
          amount: String(amount),
          uid,
          memo: memo || "Testnet A2U test payment",
          status: "completed",
        },
        walletAddress: walletAddress,
        sandbox: true,
        uniqueUidCount: uniqueUids.size,
        required: 5,
        requirementMet: uniqueUids.size >= 5,
        message: "Simulated payment recorded. In Pi Browser, real Testnet payments will be sent.",
      });
    }

    // ── Real Pi API Mode ──
    // Build the A2U payment request body per Pi sandbox API docs
    const paymentBody = {
      amount: String(amount),
      memo: memo || "Testnet A2U test payment",
      metadata: { type: "testnet_a2u_test", purpose: "mainnet_wallet_requirement" },
      uid,  // recipient Pi user UID
    };

    console.log(`[pi/testnet-a2u] Creating testnet A2U payment: ${amount}π to UID ${uid}`);

    // Call Pi SANDBOX API to create an A2U payment
    const piRes = await fetch(`${PI_SANDBOX_API_BASE}/payments`, {
      method: "POST",
      headers: piHeaders(),
      body: JSON.stringify(paymentBody),
    });

    if (!piRes.ok) {
      const errText = await piRes.text();
      console.error(`[pi/testnet-a2u] Pi Sandbox API error ${piRes.status}:`, errText);

      // Store failed payment
      const failedPayment: TestPayment = {
        id: "tp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
        uid,
        amount: String(amount),
        memo: memo || "Testnet A2U test payment",
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

    // Store successful payment
    const completedPayment: TestPayment = {
      id: paymentDTO.identifier || ("tp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8)),
      uid,
      amount: String(amount),
      memo: memo || "Testnet A2U test payment",
      status: "completed",
      createdAt: new Date().toISOString(),
      piPaymentId: paymentDTO.identifier,
    };
    recentPayments.unshift(completedPayment);
    if (recentPayments.length > 50) recentPayments = recentPayments.slice(0, 50);

    const uniqueUids = new Set(
      recentPayments.filter(p => p.status === "completed").map(p => p.uid)
    );

    console.log(`[pi/testnet-a2u] Payment created: ${paymentDTO.identifier}, unique UIDs so far: ${uniqueUids.size}`);

    return NextResponse.json({
      success: true,
      payment: paymentDTO,
      walletAddress: walletAddress,
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

// GET /api/pi/testnet-a2u — returns testnet wallet status and recent payments
export async function GET() {
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
    recentPayments: recentPayments,
    completedCount: completedPayments.length,
    uniqueUidCount: uniqueUids.size,
    uniqueUids: Array.from(uniqueUids),
    required: 5,
    requirementMet: uniqueUids.size >= 5,
    hasSimulated: hasSimulated,
    message: hasApiKey
      ? "Testnet A2U payments are configured. Send payments to 5 unique Pi UIDs."
      : "PI_API_KEY must be set in .env for testnet A2U payments",
  });
}

// DELETE /api/pi/testnet-a2u — clear all test payment history
export async function DELETE() {
  recentPayments = [];
  return NextResponse.json({
    success: true,
    message: "All testnet A2U payment history cleared",
  });
}
