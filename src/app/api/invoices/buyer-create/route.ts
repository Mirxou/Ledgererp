import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeString, validateNonNegativeNumber, checkRateLimit } from "@/lib/api-auth";
import { roundPi } from "@/lib/pi-amount";

/**
 * POST /api/invoices/buyer-create
 *
 * PUBLIC endpoint for creating invoices from the store buyer view.
 * Does NOT require auth — anyone can create an invoice as a buyer.
 * This is safe because:
 * - The invoice starts in "pending" status (no money moves)
 * - The buyer must still pay through Pi SDK (which requires auth)
 * - Store ownership is NOT checked (buyer is creating, not merchant)
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

    const body = await req.json();
    const { storeId, items, notes, escrowFee } = body;
    const customerPiUid = sanitizeString(body.customerPiUid, 100);
    const customerName = sanitizeString(body.customerName, 100);

    if (!storeId || !customerPiUid || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "storeId, customerPiUid, and items array required" },
        { status: 400 }
      );
    }

    // Verify the store exists
    const store = await db.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, piUid: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Validate items
    const validatedItems = items.map((i: { productId?: string; productName?: string; quantity?: number; unitPrice?: number }) => {
      const productName = sanitizeString(i.productName, 100);
      const quantity = Number(i.quantity);
      const unitPrice = Number(i.unitPrice);
      if (!productName || !Number.isInteger(quantity) || quantity < 1 || isNaN(unitPrice) || unitPrice <= 0) {
        throw new Error("Invalid item: productName, quantity (positive int), and unitPrice (positive) required");
      }
      return {
        productId: i.productId || null,
        productName,
        quantity,
        unitPrice,
        totalPrice: roundPi(unitPrice * quantity),
      };
    });

    const subtotal = roundPi(validatedItems.reduce((sum: number, i) => sum + i.totalPrice, 0));
    const fee = roundPi(validateNonNegativeNumber(escrowFee) || 0);
    const total = roundPi(subtotal + fee);

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: genInvoiceNumber(),
        storeId,
        customerPiUid,
        customerName: customerName || "",
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
