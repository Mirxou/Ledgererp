import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, sanitizeString, validateNonNegativeNumber, checkRateLimit } from "@/lib/api-auth";
import { roundPi, calcEscrowFee } from "@/lib/pi-amount";

/** Maximum allowed price for custom items (without productId) */
const MAX_CUSTOM_ITEM_PRICE = 10000;

/**
 * POST /api/invoices/buyer-create
 *
 * Buyer-facing endpoint for creating invoices from the store buyer view.
 * SECURITY: Auth required — buyer must be authenticated via Pi.
 * - customerPiUid comes from auth token (NOT client-provided)
 * - Product prices come from DB (NOT client-provided) for items with productId
 * - Custom items (no productId) allow client price but capped at MAX_CUSTOM_ITEM_PRICE
 * - escrowFee is calculated server-side from store settings
 */
function genInvoiceNumber(): string {
  const d = new Date();
  const prefix = "INV";
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    // ── SECURITY: Auth required — buyer must be authenticated ──
    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    // ── SECURITY: customerPiUid from auth token (ignore client-provided) ──
    const customerPiUid = auth.user.uid;

    const body = await req.json();
    const { storeId, items, notes } = body;
    const customerName = sanitizeString(body.customerName, 100);

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "storeId and items array required" },
        { status: 400 }
      );
    }

    // Verify the store exists and is active
    const store = await db.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, piUid: true, taxRate: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // ── SECURITY: Server-side price resolution ──
    const validatedItems: {
      productId: string | null;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    for (const i of items) {
      const rawProductId = i.productId ? sanitizeString(i.productId, 100) : null;
      const productName = sanitizeString(i.productName, 100);
      const quantity = Number(i.quantity);

      if (!productName || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          { error: "Invalid item: productName and quantity (positive int) required" },
          { status: 400 }
        );
      }

      let unitPrice: number;

      if (rawProductId) {
        // ── Item with productId: look up price from DB (ignore client price) ──
        const product = await db.product.findUnique({
          where: { id: rawProductId },
          select: { price: true, isActive: true, storeId: true },
        });

        if (!product) {
          return NextResponse.json(
            { error: `Product ${rawProductId} not found` },
            { status: 400 }
          );
        }

        if (!product.isActive) {
          return NextResponse.json(
            { error: `Product '${productName}' is no longer available` },
            { status: 400 }
          );
        }

        if (product.storeId !== storeId) {
          return NextResponse.json(
            { error: `Product '${productName}' does not belong to this store` },
            { status: 400 }
          );
        }

        unitPrice = product.price;
      } else {
        // ── Custom item (no productId): validate client-provided price ──
        const clientPrice = Number(i.unitPrice);
        if (isNaN(clientPrice) || !isFinite(clientPrice) || clientPrice <= 0) {
          return NextResponse.json(
            { error: "Custom item unitPrice must be a positive number" },
            { status: 400 }
          );
        }

        if (clientPrice > MAX_CUSTOM_ITEM_PRICE) {
          return NextResponse.json(
            { error: `Custom item price cannot exceed ${MAX_CUSTOM_ITEM_PRICE}π` },
            { status: 400 }
          );
        }

        unitPrice = roundPi(clientPrice);
      }

      validatedItems.push({
        productId: rawProductId,
        productName,
        quantity,
        unitPrice,
        totalPrice: roundPi(unitPrice * quantity),
      });
    }

    const subtotal = roundPi(validatedItems.reduce((sum, i) => sum + i.totalPrice, 0));

    // ── SECURITY: Calculate escrowFee server-side from store settings ──
    const escrowFeeRate = store.taxRate > 0 ? store.taxRate / 100 : 0.02; // Default 2% if no tax rate
    const fee = calcEscrowFee(subtotal, escrowFeeRate);
    const total = roundPi(subtotal + fee);

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: genInvoiceNumber(),
        storeId,
        customerPiUid,
        customerName: customerName || auth.user.username || "",
        subtotal,
        escrowFee: fee,
        total,
        notes: sanitizeString(notes, 500) || "",
        items: { create: validatedItems },
      },
      include: { items: true, store: { select: { name: true, piUid: true } } },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invoice";
    console.error("Buyer create invoice error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
