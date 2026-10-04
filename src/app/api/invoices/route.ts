import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, validateNonNegativeNumber, isValidInvoiceStatus, checkRateLimit } from "@/lib/api-auth";
import { roundPi } from "@/lib/pi-amount";
import { reserveStock, deductStock, releaseReservedStock } from "@/lib/inventory-guard";

/** Invoice status transition rules — enforces the escrow flow */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:      ["paid_escrow", "cancelled"],
  paid_escrow:  ["shipped", "disputed", "cancelled"],
  shipped:      ["delivered", "disputed"],
  delivered:    ["completed"],
  completed:    [],
  disputed:    [],
  cancelled:   [],
  releasing:   ["completed", "cancelled"], // A2U intermediate
};

function isValidTransition(current: string, next: string): boolean {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

function genInvoiceNumber(): string {
  const d = new Date();
  const prefix = "INV";
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

const VALID_PAYMENT_METHODS = ["pi", "cash", "card", "ousd"];

// GET /api/invoices?storeId=xxx&customerPiUid=xxx&status=xxx&invoiceNumber=INV-xxx&paymentMethod=xxx
// invoiceNumber is a PUBLIC endpoint for buyers — no auth required
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const customerPiUid = searchParams.get("customerPiUid");
    const status = searchParams.get("status");
    const invoiceNumber = searchParams.get("invoiceNumber");
    const paymentMethod = searchParams.get("paymentMethod");

    // Public buyer endpoint: fetch single invoice by invoiceNumber (no auth required)
    if (invoiceNumber) {
      const invoice = await db.invoice.findUnique({
        where: { invoiceNumber: sanitizeString(invoiceNumber, 50) },
        include: {
          items: true,
          store: { select: { name: true, piUid: true, description: true, avatar: true } },
        },
      });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      return NextResponse.json({ data: [invoice], total: 1, page: 1, limit: 1, totalPages: 1 });
    }

    // Validate status if provided
    if (status && !isValidInvoiceStatus(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    // Validate paymentMethod if provided
    if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid paymentMethod filter" }, { status: 400 });
    }

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (customerPiUid) where.customerPiUid = customerPiUid;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: { items: true, store: { select: { name: true, piUid: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.invoice.count({ where: Object.keys(where).length > 0 ? where : undefined }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: invoices, total, page, limit, totalPages });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

// POST /api/invoices — create invoice with items (auth required)
// Supports paymentMethod, taxAmount, discountAmount
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { storeId, items, notes, escrowFee } = body;
    const customerPiUid = sanitizeString(body.customerPiUid, 100);
    const customerName = sanitizeString(body.customerName, 100);
    const paymentMethod = sanitizeString(body.paymentMethod, 20) || "pi";
    const taxAmount = body.taxAmount !== undefined ? Number(body.taxAmount) : 0;
    const discountAmount = body.discountAmount !== undefined ? Number(body.discountAmount) : 0;

    if (!storeId || !customerPiUid || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "storeId, customerPiUid, and items array required" }, { status: 400 });
    }

    // Validate payment method
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Invalid paymentMethod. Valid: ${VALID_PAYMENT_METHODS.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

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
    const roundedTaxAmount = roundPi(validateNonNegativeNumber(taxAmount) || 0);
    const roundedDiscountAmount = roundPi(validateNonNegativeNumber(discountAmount) || 0);
    const total = roundPi(subtotal + fee + roundedTaxAmount - roundedDiscountAmount);

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: genInvoiceNumber(),
        storeId,
        customerPiUid,
        customerName: customerName || "",
        subtotal,
        taxAmount: roundedTaxAmount,
        discountAmount: roundedDiscountAmount,
        escrowFee: fee,
        total,
        paymentMethod,
        notes: sanitizeString(notes, 500) || "",
        items: { create: validatedItems },
      },
      include: { items: true, store: { select: { name: true, piUid: true } } },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invoice";
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/invoices — update invoice status (auth + ownership required)
// Supports paymentMethod, taxAmount, discountAmount
export async function PATCH(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id, status, paymentTxId, releaseTxId, notes } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Validate status
    if (status && !isValidInvoiceStatus(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // Get invoice to check ownership and current status
    const invoice = await db.invoice.findUnique({
      where: { id },
      select: { storeId: true, status: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const ownership = await verifyStoreOwnership(req, invoice.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // Validate status transition (enforce escrow flow)
    if (status && !isValidTransition(invoice.status, status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${invoice.status}' to '${status}'. Allowed: ${VALID_TRANSITIONS[invoice.status]?.join(", ") || "none"}` },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (paymentTxId) data.paymentTxId = sanitizeString(paymentTxId, 200);
    if (releaseTxId) data.releaseTxId = sanitizeString(releaseTxId, 200);
    if (notes !== undefined) data.notes = sanitizeString(notes, 500);
    if (body.paymentMethod !== undefined) {
      const pm = sanitizeString(body.paymentMethod, 20);
      if (!VALID_PAYMENT_METHODS.includes(pm)) {
        return NextResponse.json(
          { error: `Invalid paymentMethod. Valid: ${VALID_PAYMENT_METHODS.join(", ")}` },
          { status: 400 }
        );
      }
      data.paymentMethod = pm;
    }
    if (body.taxAmount !== undefined) {
      const ta = Number(body.taxAmount);
      data.taxAmount = roundPi(validateNonNegativeNumber(ta) || 0);
    }
    if (body.discountAmount !== undefined) {
      const da = Number(body.discountAmount);
      data.discountAmount = roundPi(validateNonNegativeNumber(da) || 0);
    }

    // Auto-set timestamps based on status
    if (status === "paid_escrow") data.paidAt = new Date();
    if (status === "shipped") data.shippedAt = new Date();
    if (status === "delivered") data.deliveredAt = new Date();
    if (status === "completed") data.completedAt = new Date();
    if (status === "cancelled") data.cancelledAt = new Date();

    // === Escrow inventory management ===
    // When status becomes 'paid_escrow': RESERVE stock
    if (status === "paid_escrow") {
      const invoiceItems = await db.invoiceItem.findMany({ where: { invoiceId: id } });
      const itemsWithProduct = invoiceItems.filter((i): i is typeof i & { productId: string } => i.productId !== null);

      if (itemsWithProduct.length > 0) {
        const reserveResult = await reserveStock(
          invoice.storeId,
          itemsWithProduct.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          id,
          auth.user.uid
        );

        if (!reserveResult.success) {
          return NextResponse.json(
            {
              error: "مخزون غير كاف للحجز",
              details: reserveResult.conflicts,
            },
            { status: 409 }
          );
        }
      }
    }

    // When status becomes 'completed': DEDUCT stock (was reserved)
    if (status === "completed") {
      const invoiceItems = await db.invoiceItem.findMany({ where: { invoiceId: id } });
      const itemsWithProduct = invoiceItems.filter((i): i is typeof i & { productId: string } => i.productId !== null);

      if (itemsWithProduct.length > 0) {
        await deductStock(
          invoice.storeId,
          itemsWithProduct.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          id,
          auth.user.uid,
          true // isEscrow = true
        );
      }
    }

    // When status becomes 'cancelled' and current is 'paid_escrow': RELEASE reservation
    if (status === "cancelled" && invoice.status === "paid_escrow") {
      const invoiceItems = await db.invoiceItem.findMany({ where: { invoiceId: id } });
      const itemsWithProduct = invoiceItems.filter((i): i is typeof i & { productId: string } => i.productId !== null);

      if (itemsWithProduct.length > 0) {
        await releaseReservedStock(
          invoice.storeId,
          itemsWithProduct.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          id,
          auth.user.uid
        );
      }
    }

    // When status becomes 'disputed' from 'paid_escrow': also release reservation
    if (status === "disputed" && invoice.status === "paid_escrow") {
      const invoiceItems = await db.invoiceItem.findMany({ where: { invoiceId: id } });
      const itemsWithProduct = invoiceItems.filter((i): i is typeof i & { productId: string } => i.productId !== null);

      if (itemsWithProduct.length > 0) {
        await releaseReservedStock(
          invoice.storeId,
          itemsWithProduct.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          id,
          auth.user.uid
        );
      }
    }

    // If taxAmount or discountAmount changed, recalculate total
    if (body.taxAmount !== undefined || body.discountAmount !== undefined) {
      const currentInvoice = await db.invoice.findUnique({
        where: { id },
        select: { subtotal: true, escrowFee: true, taxAmount: true, discountAmount: true },
      });
      if (currentInvoice) {
        const newTax = data.taxAmount !== undefined ? data.taxAmount : currentInvoice.taxAmount;
        const newDiscount = data.discountAmount !== undefined ? data.discountAmount : currentInvoice.discountAmount;
        data.total = roundPi(currentInvoice.subtotal + currentInvoice.escrowFee + Number(newTax) - Number(newDiscount));
      }
    }

    const updated = await db.invoice.update({
      where: { id },
      data,
      include: { items: true, store: { select: { name: true, piUid: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

// DELETE /api/invoices — delete invoice (auth + ownership required)
export async function DELETE(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Get invoice to check ownership
    const invoice = await db.invoice.findUnique({
      where: { id },
      select: { storeId: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const ownership = await verifyStoreOwnership(req, invoice.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    await db.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
