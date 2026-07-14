import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/stores — list all stores
export async function GET() {
  try {
    const stores = await db.store.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { products: true, invoices: true } } },
    });
    return NextResponse.json(stores);
  } catch {
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}

// POST /api/stores — create a store
export async function POST(req: Request) {
  try {
    const { piUid, name, description } = await req.json();
    if (!piUid || !name) {
      return NextResponse.json({ error: "piUid and name required" }, { status: 400 });
    }
    const store = await db.store.upsert({
      where: { piUid },
      update: { name, description: description || "" },
      create: { piUid, name, description: description || "" },
    });
    return NextResponse.json(store);
  } catch {
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}

// PATCH /api/stores — update store
export async function PATCH(req: Request) {
  try {
    const { id, name, description } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    const store = await db.store.update({ where: { id }, data });
    return NextResponse.json(store);
  } catch {
    return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
  }
}

// DELETE /api/stores — delete store and cascade
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    // Delete invoice items first, then invoices, then products, then store
    await db.invoiceItem.deleteMany({ where: { invoice: { storeId: id } } });
    await db.invoice.deleteMany({ where: { storeId: id } });
    await db.product.deleteMany({ where: { storeId: id } });
    await db.store.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}