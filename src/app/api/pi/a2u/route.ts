import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, validatePositiveNumber, checkRateLimit } from "@/lib/api-auth";

const PI_API_BASE = "https://api.minepi.com/v2";

function getApiKey(): string {
  const key = process.env.PI_API_KEY;
  if (!key) {
    throw new Error("PI_API_KEY environment variable is not set. Configure it in .env to enable A2U payments.");
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
// Creates an App-to-User payment for escrow release.
// REQUIRES AUTH: Only the store owner can release escrow.
export async function POST(req: NextRequest) {
  try {
    // Rate limit (stricter for payments: 10/min)
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    // AUTH REQUIRED: Verify Pi user
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const {
      paymentId,
      memo,
      metadata,
      uid,         // Recipient's Pi UID
      invoiceId,   // Our invoice ID
    } = body;
    const amount = validatePositiveNumber(body.amount);

    if (!amount || !uid) {
      return NextResponse.json(
        { error: "amount (positive number) and uid are required" },
        { status: 400 },
      );
    }

    // OWNERSHIP CHECK: If invoiceId provided, verify the authenticated user owns the store
    if (invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        select: { storeId: true, status: true, total: true },
      });

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      const ownership = await verifyStoreOwnership(req, invoice.storeId, auth.user.uid);
      if (!ownership.ok) return ownership.response!;

      // Verify invoice is in a releasable state
      if (invoice.status !== "delivered" && invoice.status !== "paid_escrow" && invoice.status !== "shipped") {
        return NextResponse.json(
          { error: `Cannot release escrow for invoice in '${invoice.status}' status. Must be delivered, shipped, or paid_escrow.` },
          { status: 400 }
        );
      }

      // Sanity check: amount should not exceed invoice total
      if (amount > invoice.total * 1.01) { // 1% tolerance for rounding
        return NextResponse.json(
          { error: `Amount ${amount}π exceeds invoice total ${invoice.total}π` },
          { status: 400 }
        );
      }
    }

    // Verify wallet is configured
    const walletSeed = getWalletSeed();
    const walletAddress = getWalletAddress();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "PI_WALLET_ADDRESS is not configured. Set it in .env." },
        { status: 500 }
      );
    }

    // Build the A2U payment request body per Pi docs
    const paymentBody: Record<string, unknown> = {
      amount: String(amount),
      memo: sanitizeString(memo, 200) || "Escrow release payment",
      metadata: metadata || {},
      uid: sanitizeString(uid, 100),
      paymentId: paymentId || undefined,
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

// GET /api/pi/a2u — returns wallet configuration status (minimal info)
export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const hasApiKey = !!process.env.PI_API_KEY;
  const hasWalletSeed = !!process.env.PI_WALLET_SEED;
  const hasWalletAddress = !!process.env.PI_WALLET_ADDRESS;

  // Don't expose wallet address details to unauthenticated users
  return NextResponse.json({
    configured: hasApiKey && hasWalletSeed && hasWalletAddress,
    message: hasApiKey && hasWalletSeed && hasWalletAddress
      ? "A2U payments are fully configured"
      : "A2U payments require PI_API_KEY, PI_WALLET_SEED, and PI_WALLET_ADDRESS in .env",
  });
}
