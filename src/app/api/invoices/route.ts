import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, validateNonNegativeNumber, isValidInvoiceStatus, checkRateLimit } from "@/lib/api-auth";

function genInvoiceNumber(): string {
  const d = new Date();
  const prefix = "INV";
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

// GET /api/invoices?storeId=xxx&customerPiUid=xxx&status=xxx
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const customerPiUid = searchParams.get("customerPiUid");
    const status = searchParams.get("status");

    // Validate status if provided
    if (status && !isValidInvoiceStatus(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (customerPiUid) where.customerPiUid = customerPiUid;
    if (status) where.status = status;

    const invoices = await db.invoice.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: { items: true, store: { select: { name: true, piUid: true } } },
      orderBy: { createdAt: "desc" },
      take: 100, // Pagination limit
    });
    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

// POST /api/invoices — create invoice with items (auth required)
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

    if (!storeId || !customerPiUid || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "storeId, customerPiUid, and items array required" }, { status: 400 });
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
        totalPrice: unitPrice * quantity,
      };
    });

    const subtotal = validatedItems.reduce((sum: number, i) => sum + i.totalPrice, 0);
    const fee = validateNonNegativeNumber(escrowFee) || 0;
    const total = subtotal + fee;

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
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/invoices — update invoice status (auth + ownership required)
export async function PATCH(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id, status, paymentTxId, releaseTxId } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Validate status
    if (status && !isValidInvoiceStatus(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
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

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (paymentTxId) data.paymentTxId = sanitizeString(paymentTxId, 200);
    if (releaseTxId) data.releaseTxId = sanitizeString(releaseTxId, 200);

    // Auto-set timestamps based on status
    if (status === "paid_escrow") data.paidAt = new Date();
    if (status === "shipped") data.shippedAt = new Date();
    if (status === "delivered") data.deliveredAt = new Date();
    if (status === "completed") data.completedAt = new Date();
    if (status === "cancelled") data.cancelledAt = new Date();

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
  } catch {
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
