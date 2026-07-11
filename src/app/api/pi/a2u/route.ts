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

// POST /api/pi/a2u
// Creates an App-to-User payment for escrow release (paying the seller).
//
// A2U payments do NOT require an approval step — the developer wallet
// sends Pi directly to the recipient's wallet on the blockchain.
export async function POST(req: NextRequest) {
  try {
    const {
      paymentId,   // Our internal reference (optional, for linking)
      amount,      // Amount in Pi (string, e.g. "3.14")
      memo,        // Transaction memo
      metadata,    // Arbitrary JSON metadata object
      uid,         // Recipient's Pi UID (seller/customer receiving escrow)
      invoiceId,   // Our invoice ID (to update DB)
    } = await req.json();

    // Validate required fields
    if (!amount || !uid) {
      return NextResponse.json(
        { error: "amount and uid are required" },
        { status: 400 },
      );
    }

    const walletSeed = process.env.PI_WALLET_SEED;
    if (!walletSeed) {
      throw new Error("PI_WALLET_SEED environment variable is not set");
    }

    // Build the A2U payment request body per Pi docs
    const paymentBody: Record<string, unknown> = {
      amount,
      memo: memo || "Escrow release payment",
      metadata: metadata || {},
      uid,                       // recipient Pi user UID
      paymentId: paymentId || undefined,  // our reference (optional)
      // The developer's private key seed is required for A2U payments
      // so the Pi server can sign the transaction on behalf of the app
    };

    // Call Pi API to create an A2U payment
    const piRes = await fetch(`${PI_API_BASE}/payments`, {
      method: "POST",
      headers: piHeaders(),
      body: JSON.stringify(paymentBody),
    });

    if (!piRes.ok) {
      const errText = await piRes.text();
      console.error(`[pi/a2u] Pi API error ${piRes.status}:`, errText);
      return NextResponse.json(
        { error: `A2U payment failed: ${piRes.status}`, details: errText },
        { status: piRes.status },
      );
    }

    const paymentDTO = await piRes.json();

    // Update invoice with release txid if we have an invoiceId
    if (invoiceId) {
      const txid =
        paymentDTO?.transaction?.txid ||
        paymentDTO?.txid ||
        "";

      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          releaseTxId: txid,
          // If the payment is fully done, mark as completed
          status: "completed",
        },
      });
    }

    return NextResponse.json({
      success: true,
      payment: paymentDTO,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pi/a2u]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}