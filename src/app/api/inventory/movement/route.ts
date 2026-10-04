import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";

const VALID_MOVEMENT_TYPES = ["in", "out", "adjustment", "return", "sale", "sale_return"];

// GET /api/inventory/movement?inventoryId=xxx&type=xxx&storeId=xxx
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const inventoryId = searchParams.get("inventoryId");
    const type = searchParams.get("type");
    const storeId = searchParams.get("storeId");

    const where: Record<string, unknown> = {};
    if (inventoryId) where.inventoryId = inventoryId;
    if (type) {
      if (!VALID_MOVEMENT_TYPES.includes(type)) {
        return NextResponse.json({ error: "Invalid movement type" }, { status: 400 });
      }
      where.type = type;
    }
    // If storeId is provided, filter movements for inventory in that store
    if (storeId) {
      where.inventory = { storeId };
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      db.inventoryMovement.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          inventory: {
            select: {
              id: true,
              productId: true,
              storeId: true,
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.inventoryMovement.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: movements, total, page, limit, totalPages });
  } catch (error) {
    console.error("Fetch inventory movements error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory movements" }, { status: 500 });
  }
}

// POST /api/inventory/movement — create movement (auto-updates Inventory quantity AND Product.stockQuantity)
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { inventoryId, type } = body;
    const quantity = parseInt(String(body.quantity), 10);

    if (!inventoryId || !type) {
      return NextResponse.json(
        { error: "inventoryId and type are required" },
        { status: 400 }
      );
    }

    if (!VALID_MOVEMENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid movement type. Valid: ${VALID_MOVEMENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (isNaN(quantity) || quantity === 0) {
      return NextResponse.json(
        { error: "quantity must be a non-zero integer" },
        { status: 400 }
      );
    }

    // Validate sign convention: in/return/sale_return should be positive, out/sale should be negative
    // adjustment can be either
    if ((type === "in" || type === "return" || type === "sale_return") && quantity < 0) {
      return NextResponse.json(
        { error: `Movement type '${type}' requires positive quantity` },
        { status: 400 }
      );
    }
    if ((type === "out" || type === "sale") && quantity > 0) {
      return NextResponse.json(
        { error: `Movement type '${type}' requires negative quantity` },
        { status: 400 }
      );
    }

    // Get inventory record
    const inventory = await db.inventory.findUnique({
      where: { id: inventoryId },
      include: { product: { select: { id: true, name: true, storeId: true } } },
    });
    if (!inventory) {
      return NextResponse.json({ error: "Inventory record not found" }, { status: 404 });
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, inventory.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // Check stock availability for out/sale movements
    const newQuantity = inventory.quantity + quantity;
    if (newQuantity < 0) {
      return NextResponse.json(
        { error: `Insufficient stock. Current: ${inventory.quantity}, attempting to remove: ${Math.abs(quantity)}` },
        { status: 400 }
      );
    }

    // Create movement and update inventory in a transaction-like sequence
    const movement = await db.inventoryMovement.create({
      data: {
        inventoryId,
        type,
        quantity,
        reason: sanitizeString(body.reason, 200) || "",
        referenceId: sanitizeString(body.referenceId, 100) || "",
        createdBy: auth.user.uid,
      },
    });

    // Update inventory quantity
    const updatedInventory = await db.inventory.update({
      where: { id: inventoryId },
      data: {
        quantity: newQuantity,
        lastRestockedAt: quantity > 0 ? new Date() : inventory.lastRestockedAt,
      },
    });

    // Also update Product.stockQuantity (denormalized)
    await db.product.update({
      where: { id: inventory.productId },
      data: { stockQuantity: newQuantity },
    });

    return NextResponse.json({
      movement,
      inventory: {
        ...updatedInventory,
        isLowStock: updatedInventory.quantity <= updatedInventory.lowStockThreshold,
      },
    });
  } catch (error) {
    console.error("Create inventory movement error:", error);
    return NextResponse.json({ error: "Failed to create inventory movement" }, { status: 500 });
  }
}
