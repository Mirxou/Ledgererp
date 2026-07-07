import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Generate unique invoice number
function genInvoiceNumber(): string {
  const d = new Date();
  const prefix = "INV";
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

// GET /api/invoices?storeId=xxx&customerPiUid=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const customerPiUid = searchParams.get("customerPiUid");

    const where: Record<string, string> = {};
    if (storeId) where.storeId = storeId;
    if (customerPiUid) where.customerPiUid = customerPiUid;

    const invoices = await db.invoice.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: { items: true, store: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

// POST /api/invoices — create invoice with items
export async function POST(req: Request) {
  try {
    const { storeId, customerPiUid, customerName, items, notes, escrowFee } = await req.json();

    if (!storeId || !customerPiUid || !items || items.length === 0) {
      return NextResponse.json({ error: "storeId, customerPiUid, and items required" }, { status: 400 });
    }

    const subtotal = items.reduce((sum: number, i: { unitPrice: number; quantity: number }) => sum + i.unitPrice * i.quantity, 0);
    const fee = Number(escrowFee || 0);
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
        notes: notes || "",
        items: {
          create: items.map((i: { productId?: string; productName: string; quantity: number; unitPrice: number }) => ({
            productId: i.productId || null,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.unitPrice * i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

// PATCH /api/invoices — update invoice status / payment tx ids
export async function PATCH(req: Request) {
  try {
    const { id, status, paymentTxId, releaseTxId } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (paymentTxId) data.paymentTxId = paymentTxId;
    if (releaseTxId) data.releaseTxId = releaseTxId;

    const invoice = await db.invoice.update({
      where: { id },
      data,
      include: { items: true, store: { select: { name: true } } },
    });
    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}