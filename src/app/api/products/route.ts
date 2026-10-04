import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, validatePositiveNumber, checkRateLimit } from "@/lib/api-auth";
import { roundPi } from "@/lib/pi-amount";

// GET /api/products?storeId=xxx&categoryId=xxx
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const categoryId = searchParams.get("categoryId");
    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { storeId };
    if (categoryId) where.categoryId = categoryId;

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, nameEn: true, nameAr: true, slug: true, color: true, icon: true },
          },
        },
      }),
      db.product.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: products, total, page, limit, totalPages });
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/products — create (auth + ownership required)
// Auto-creates Inventory record if trackInventory is true
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
    const costPrice = body.costPrice !== undefined ? Number(body.costPrice) : 0;
    const sku = sanitizeString(body.sku, 50);
    const stockQuantity = parseInt(String(body.stockQuantity ?? 0), 10);
    const lowStockThreshold = parseInt(String(body.lowStockThreshold ?? 5), 10);
    const trackInventory = body.trackInventory !== undefined ? Boolean(body.trackInventory) : true;
    const categoryId = body.categoryId ? sanitizeString(body.categoryId, 50) : null;
    const unit = sanitizeString(body.unit, 20) || "unit";
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!storeId || !name || price === null) {
      return NextResponse.json(
        { error: "storeId, name, and valid price (positive number) are required" },
        { status: 400 }
      );
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // Validate categoryId if provided
    if (categoryId) {
      const category = await db.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }

    const roundedPrice = roundPi(price);
    const roundedCostPrice = roundPi(costPrice || 0);

    const product = await db.product.create({
      data: {
        storeId,
        name,
        description,
        price: roundedPrice,
        costPrice: roundedCostPrice,
        sku,
        stockQuantity: isNaN(stockQuantity) ? 0 : stockQuantity,
        lowStockThreshold: isNaN(lowStockThreshold) ? 5 : lowStockThreshold,
        trackInventory,
        categoryId,
        unit,
        image,
        isActive,
      },
      include: {
        category: {
          select: { id: true, nameEn: true, nameAr: true, slug: true, color: true, icon: true },
        },
      },
    });

    // Auto-create Inventory record if trackInventory is true
    if (trackInventory) {
      await db.inventory.create({
        data: {
          productId: product.id,
          storeId,
          quantity: isNaN(stockQuantity) ? 0 : stockQuantity,
          lowStockThreshold: isNaN(lowStockThreshold) ? 5 : lowStockThreshold,
          trackInventory: true,
          lastRestockedAt: stockQuantity > 0 ? new Date() : null,
        },
      });
    }

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
      select: { storeId: true, trackInventory: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ownership = await verifyStoreOwnership(req, product.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const name = body.name !== undefined ? sanitizeString(body.name, 100) : undefined;
    const description = body.description !== undefined ? sanitizeString(body.description, 500) : undefined;
    const price = body.price !== undefined ? validatePositiveNumber(body.price) : undefined;
    const costPrice = body.costPrice !== undefined ? Number(body.costPrice) : undefined;
    const sku = body.sku !== undefined ? sanitizeString(body.sku, 50) : undefined;
    const stockQuantity = body.stockQuantity !== undefined ? parseInt(String(body.stockQuantity), 10) : undefined;
    const lowStockThreshold = body.lowStockThreshold !== undefined ? parseInt(String(body.lowStockThreshold), 10) : undefined;
    const trackInventory = body.trackInventory !== undefined ? Boolean(body.trackInventory) : undefined;
    const categoryId = body.categoryId !== undefined ? (body.categoryId ? sanitizeString(body.categoryId, 50) : null) : undefined;
    const unit = body.unit !== undefined ? sanitizeString(body.unit, 20) : undefined;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;

    // Validate categoryId if provided
    if (categoryId !== undefined && categoryId !== null) {
      const category = await db.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
    }

    const data: Record<string, unknown> = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== null && price !== undefined) data.price = roundPi(price);
    if (costPrice !== undefined && !isNaN(costPrice)) data.costPrice = roundPi(costPrice);
    if (sku !== undefined) data.sku = sku;
    if (stockQuantity !== undefined && !isNaN(stockQuantity)) data.stockQuantity = stockQuantity;
    if (lowStockThreshold !== undefined && !isNaN(lowStockThreshold)) data.lowStockThreshold = lowStockThreshold;
    if (trackInventory !== undefined) data.trackInventory = trackInventory;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (unit !== undefined) data.unit = unit;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await db.product.update({
      where: { id },
      data,
      include: {
        category: {
          select: { id: true, nameEn: true, nameAr: true, slug: true, color: true, icon: true },
        },
      },
    });

    // Sync inventory if stockQuantity changed
    if (stockQuantity !== undefined && !isNaN(stockQuantity)) {
      const inventory = await db.inventory.findUnique({
        where: { productId_storeId: { productId: id, storeId: product.storeId } },
      });
      if (inventory) {
        await db.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: stockQuantity,
            lowStockThreshold: lowStockThreshold !== undefined && !isNaN(lowStockThreshold)
              ? lowStockThreshold : undefined,
            trackInventory: trackInventory !== undefined ? trackInventory : undefined,
          },
        });
      } else if (trackInventory !== false && (product.trackInventory || trackInventory)) {
        // Create inventory if trackInventory was just enabled
        await db.inventory.create({
          data: {
            productId: id,
            storeId: product.storeId,
            quantity: stockQuantity,
            lowStockThreshold: lowStockThreshold !== undefined && !isNaN(lowStockThreshold) ? lowStockThreshold : 5,
            trackInventory: true,
            lastRestockedAt: stockQuantity > 0 ? new Date() : null,
          },
        });
      }
    }

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
    // Remove product from local sale items (set productId to null)
    await db.localSaleItem.updateMany({ where: { productId: id }, data: { productId: null } });
    // Inventory, InventoryMovement, and Inventory records are cascade-deleted via Product relation
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
