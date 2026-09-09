import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, validatePositiveNumber, checkRateLimit } from "@/lib/api-auth";

// GET /api/products?storeId=xxx
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

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

// POST /api/products — create (auth + ownership required)
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const storeId = body.storeId;
    const name = sanitizeString(body.name, 100);
    const description = sanitizeString(body.description, 500);
    const image = sanitizeString(body.image, 500);
    const price = validatePositiveNumber(body.price);

    if (!storeId || !name || price === null) {
      return NextResponse.json(
        { error: "storeId, name, and valid price (positive number) are required" },
        { status: 400 }
      );
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const product = await db.product.create({
      data: { storeId, name, description, price, image },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

// PATCH /api/products — update (auth + ownership required)
export async function PATCH(req: NextRequest) {
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

    // Get product to verify ownership via store
    const product = await db.product.findUnique({
      where: { id },
      select: { storeId: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ownership = await verifyStoreOwnership(req, product.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const name = body.name !== undefined ? sanitizeString(body.name, 100) : undefined;
    const description = body.description !== undefined ? sanitizeString(body.description, 500) : undefined;
    const price = body.price !== undefined ? validatePositiveNumber(body.price) : undefined;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;

    const data: Record<string, unknown> = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== null && price !== undefined) data.price = price;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await db.product.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products — delete (auth + ownership required)
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

    // Get product to verify ownership
    const product = await db.product.findUnique({
      where: { id },
      select: { storeId: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ownership = await verifyStoreOwnership(req, product.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // Remove product from invoice items first (set productId to null)
    await db.invoiceItem.updateMany({ where: { productId: id }, data: { productId: null } });
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
