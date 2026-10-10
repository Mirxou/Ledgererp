import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";

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
// REQUIRES AUTH + invoiceId: Only the store owner can release escrow.
// Amount and recipient (uid) are taken from DB — not client-provided.
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
      invoiceId,   // REQUIRED — we no longer accept A2U without an invoice
    } = body;

    // ── SECURITY: invoiceId is now REQUIRED ──
    if (!invoiceId || typeof invoiceId !== "string") {
      return NextResponse.json(
        { error: "invoiceId is required for A2U payments" },
        { status: 400 },
      );
    }

    // ── Get invoice from DB — amount and recipient come from DB, not client ──
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { storeId: true, status: true, total: true, subtotal: true, customerPiUid: true, invoiceNumber: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // ── OWNERSHIP CHECK: Verify the authenticated user owns the store ──
    const ownership = await verifyStoreOwnership(req, invoice.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // ── Verify invoice is in a releasable state ──
    if (invoice.status !== "delivered" && invoice.status !== "paid_escrow" && invoice.status !== "shipped") {
      return NextResponse.json(
        { error: `Cannot release escrow for invoice in '${invoice.status}' status. Must be delivered, shipped, or paid_escrow.` },
        { status: 400 }
      );
    }

    // ── SECURITY: Get amount and uid from DB (ignore client-provided values) ──
    const amount = invoice.total;
    const uid = invoice.customerPiUid;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invoice total is invalid" }, { status: 400 });
    }

    if (!uid) {
      return NextResponse.json({ error: "Invoice has no customer Pi UID" }, { status: 400 });
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

    console.log(`[pi/a2u] Creating A2U payment: ${amount}π to ${uid} (invoice ${invoice.invoiceNumber}), from wallet ${walletAddress.substring(0, 8)}...`);

    // Call Pi API to create an A2U payment
    const piRes = await fetchWithTimeout(`${PI_API_BASE}/payments`, {
      method: "POST",
      headers: piHeaders(),
      body: JSON.stringify(paymentBody),
    });

    if (!piRes.ok) {
      const errText = await piRes.text();
      console.error(`[pi/a2u] Pi API error ${piRes.status}:`, errText);
      // SECURITY: Don't leak Pi API error details
      return NextResponse.json(
        { error: `A2U payment failed: ${piRes.status}` },
        { status: piRes.status >= 500 ? 502 : piRes.status },
      );
    }

    const paymentDTO = await piRes.json();

    // ── SECURITY: Atomic status update to prevent double-processing ──
    // Only update if invoice is still in "delivered" (or appropriate) state
    const txid = paymentDTO?.transaction?.txid || paymentDTO?.txid || "";

    // Determine which statuses are valid for atomic transition
    const releasableStatuses = ["delivered", "paid_escrow", "shipped"];
    const result = await db.invoice.updateMany({
      where: { id: invoiceId, status: { in: releasableStatuses } },
      data: { status: "releasing", releaseTxId: txid },
    });

    if (result.count === 0) {
      console.error(`[pi/a2u] SECURITY: Double-processing detected for invoice ${invoiceId} — A2U payment created but invoice no longer in releasable state`);
      // The A2U payment was created on Pi's side but we can't update the invoice.
      // This is a race condition — log for manual reconciliation.
      return NextResponse.json(
        { error: "Invoice not in deliverable state or already being released" },
        { status: 409 }
      );
    }

    // Record A2U EscrowTransaction in DB
    try {
      await db.escrowTransaction.create({
        data: {
          type: "A2U",
          invoiceId,
          txid: txid || paymentDTO?.identifier || "",
          amount: invoice.subtotal,
          fromUid: auth.user.uid,
          toUid: sanitizeString(uid, 100),
          memo: sanitizeString(memo, 200) || "Escrow release",
          status: "pending",
        },
      });
    } catch (txErr) {
      console.warn("[pi/a2u] Could not record EscrowTransaction:", txErr);
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        action: "escrow_release",
        userId: auth.user.uid,
        entity: "invoice",
        entityId: invoiceId,
        details: `Escrow release: ${invoice.subtotal}π to ${uid} — txid: ${txid}`,
      },
    });

    console.log(`[pi/a2u] Invoice ${invoiceId} (${invoice.invoiceNumber}) updated: releasing, txid=${txid}`);

    return NextResponse.json({
      success: true,
      payment: paymentDTO,
      walletAddress: walletAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pi/a2u]", message);
    return NextResponse.json({ error: "A2U payment processing failed" }, { status: 500 });
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
