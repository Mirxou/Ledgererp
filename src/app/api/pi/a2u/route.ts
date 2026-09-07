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

function getWalletSeed(): string {
  const seed = process.env.PI_WALLET_SEED;
  if (!seed) {
    throw new Error("PI_WALLET_SEED environment variable is not set. Generate an app wallet in Pi Developer Portal first.");
  }
  return seed;
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

// POST /api/pi/a2u
// Creates an App-to-User payment for escrow release (paying the seller).
//
// A2U payments do NOT require an approval step — the developer wallet
// sends Pi directly to the recipient's wallet on the blockchain.
// Requires: PI_API_KEY, PI_WALLET_SEED, PI_WALLET_ADDRESS in .env
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

    // Verify wallet is configured
    const walletSeed = getWalletSeed();
    const walletAddress = getWalletAddress();

    // Build the A2U payment request body per Pi docs
    const paymentBody: Record<string, unknown> = {
      amount,
      memo: memo || "Escrow release payment",
      metadata: metadata || {},
      uid,                       // recipient Pi user UID
      paymentId: paymentId || undefined,  // our reference (optional)
    };

    console.log(`[pi/a2u] Creating A2U payment: ${amount}π to ${uid}, from wallet ${walletAddress.substring(0, 8)}...`);

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
          completedAt: new Date(),
        },
      });

      console.log(`[pi/a2u] Invoice ${invoiceId} updated: completed, txid=${txid}`);
    }

    return NextResponse.json({
      success: true,
      payment: paymentDTO,
      walletAddress: walletAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pi/a2u]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/pi/a2u — returns wallet configuration status (for debugging)
export async function GET() {
  const hasApiKey = !!process.env.PI_API_KEY;
  const hasWalletSeed = !!process.env.PI_WALLET_SEED;
  const hasWalletAddress = !!process.env.PI_WALLET_ADDRESS;
  const walletAddress = getWalletAddress();

  return NextResponse.json({
    configured: hasApiKey && hasWalletSeed && hasWalletAddress,
    apiKeySet: hasApiKey,
    walletSeedSet: hasWalletSeed,
    walletAddress: walletAddress ? `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}` : "not set",
    piApiBase: PI_API_BASE,
    message: hasApiKey && hasWalletSeed && hasWalletAddress
      ? "A2U payments are fully configured"
      : "A2U payments require PI_API_KEY, PI_WALLET_SEED, and PI_WALLET_ADDRESS in .env",
  });
}
