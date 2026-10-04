import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";

// GET /api/inventory?storeId=xxx&lowStock=true
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const lowStock = searchParams.get("lowStock") === "true";

    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (lowStock) {
      // Filter items where quantity <= lowStockThreshold
      // Prisma doesn't support field comparisons in where, so we fetch and filter
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const inventory = await db.inventory.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: { select: { id: true, nameEn: true, nameAr: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    });

    // Add isLowStock flag and filter if lowStock=true
    let results = inventory.map((inv) => ({
      ...inv,
      isLowStock: inv.quantity <= inv.lowStockThreshold,
    }));

    if (lowStock) {
      results = results.filter((inv) => inv.isLowStock);
    }

    const total = await db.inventory.count({
      where: Object.keys(where).length > 0 ? where : undefined,
    });

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: results, total, page, limit, totalPages });
  } catch (error) {
    console.error("Fetch inventory error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

// POST /api/inventory — create inventory record (auth required)
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { productId, storeId } = body;
    const quantity = parseInt(String(body.quantity ?? 0), 10);
    const lowStockThreshold = parseInt(String(body.lowStockThreshold ?? 5), 10);
    const trackInventory = body.trackInventory !== undefined ? Boolean(body.trackInventory) : true;

    if (!productId || !storeId) {
      return NextResponse.json(
        { error: "productId and storeId are required" },
        { status: 400 }
      );
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // Check product exists
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if inventory already exists for this product+store
    const existing = await db.inventory.findUnique({
      where: { productId_storeId: { productId, storeId } },
    });

    if (existing) {
      // Update existing inventory
      const updated = await db.inventory.update({
        where: { id: existing.id },
        data: {
          quantity: isNaN(quantity) ? existing.quantity : quantity,
          lowStockThreshold: isNaN(lowStockThreshold) ? existing.lowStockThreshold : lowStockThreshold,
          trackInventory,
          lastRestockedAt: quantity > existing.quantity ? new Date() : existing.lastRestockedAt,
        },
        include: {
          product: {
            select: { id: true, name: true, sku: true, category: { select: { id: true, nameEn: true } } },
          },
        },
      });

      // Also update Product.stockQuantity
      await db.product.update({
        where: { id: productId },
        data: { stockQuantity: isNaN(quantity) ? existing.quantity : quantity },
      });

      return NextResponse.json({ ...updated, isLowStock: updated.quantity <= updated.lowStockThreshold });
    }

    // Create new inventory record
    const inventory = await db.inventory.create({
      data: {
        productId,
        storeId,
        quantity: isNaN(quantity) ? 0 : quantity,
        lowStockThreshold: isNaN(lowStockThreshold) ? 5 : lowStockThreshold,
        trackInventory,
        lastRestockedAt: quantity > 0 ? new Date() : null,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, category: { select: { id: true, nameEn: true } } },
        },
      },
    });

    // Also update Product.stockQuantity
    await db.product.update({
      where: { id: productId },
      data: { stockQuantity: isNaN(quantity) ? 0 : quantity },
    });

    return NextResponse.json({ ...inventory, isLowStock: inventory.quantity <= inventory.lowStockThreshold });
  } catch (error) {
    console.error("Create inventory error:", error);
    return NextResponse.json({ error: "Failed to create inventory" }, { status: 500 });
  }
}

// PATCH /api/inventory — update stock quantity (auth required, triggers movement log)
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

    const inventory = await db.inventory.findUnique({
      where: { id },
      include: { product: { select: { id: true, name: true, storeId: true } } },
    });
    if (!inventory) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, inventory.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const data: Record<string, unknown> = {};
    const newQuantity = body.quantity !== undefined ? parseInt(String(body.quantity), 10) : undefined;
    const newLowStockThreshold = body.lowStockThreshold !== undefined
      ? parseInt(String(body.lowStockThreshold), 10) : undefined;
    const newTrackInventory = body.trackInventory !== undefined ? Boolean(body.trackInventory) : undefined;

    if (newQuantity !== undefined && !isNaN(newQuantity)) {
      data.quantity = newQuantity;
      if (newQuantity > inventory.quantity) {
        data.lastRestockedAt = new Date();
      }
    }
    if (newLowStockThreshold !== undefined && !isNaN(newLowStockThreshold)) {
      data.lowStockThreshold = newLowStockThreshold;
    }
    if (newTrackInventory !== undefined) {
      data.trackInventory = newTrackInventory;
    }

    const updated = await db.inventory.update({
      where: { id },
      data,
      include: {
        product: {
          select: { id: true, name: true, sku: true, category: { select: { id: true, nameEn: true } } },
        },
      },
    });

    // Auto-create InventoryMovement log when quantity changes
    if (newQuantity !== undefined && !isNaN(newQuantity) && newQuantity !== inventory.quantity) {
      const diff = newQuantity - inventory.quantity;
      await db.inventoryMovement.create({
        data: {
          inventoryId: id,
          type: diff > 0 ? "in" : "adjustment",
          quantity: diff,
          reason: sanitizeString(body.reason, 200) || (diff > 0 ? "Stock replenished" : "Stock adjusted"),
          referenceId: "",
          createdBy: auth.user.uid,
        },
      });

      // Also update Product.stockQuantity
      await db.product.update({
        where: { id: inventory.productId },
        data: { stockQuantity: newQuantity },
      });
    }

    return NextResponse.json({ ...updated, isLowStock: updated.quantity <= updated.lowStockThreshold });
  } catch (error) {
    console.error("Update inventory error:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}
