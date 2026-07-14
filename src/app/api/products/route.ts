import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/products?storeId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }
    const products = await db.product.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/products — create
export async function POST(req: Request) {
  try {
    const { storeId, name, description, price, image } = await req.json();
    if (!storeId || !name || price === undefined) {
      return NextResponse.json({ error: "storeId, name, and price required" }, { status: 400 });
    }
    const product = await db.product.create({
      data: { storeId, name, description: description || "", price: Number(price), image: image || "" },
    });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

// PATCH /api/products — update
export async function PATCH(req: Request) {
  try {
    const { id, name, description, price, isActive } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = Number(price);
    if (isActive !== undefined) data.isActive = isActive;

    const product = await db.product.update({ where: { id }, data });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products — delete
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    // Remove product from invoice items first (set productId to null)
    await db.invoiceItem.updateMany({ where: { productId: id }, data: { productId: null } });
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}