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
      where: { storeId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/products — create a product
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

// PATCH /api/products — update product active status
export async function PATCH(req: Request) {
  try {
    const { id, isActive } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const product = await db.product.update({
      where: { id },
      data: { isActive },
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}