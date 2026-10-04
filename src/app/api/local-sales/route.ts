import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";
import { roundPi } from "@/lib/pi-amount";
import { checkStockAvailability, deductStock, restockItems } from "@/lib/inventory-guard";

/** Generate local sale invoice number: LS-YYYYMMDD-XXXXX */
function genLocalSaleNumber(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `LS-${date}-${rand}`;
}

// GET /api/local-sales?storeId=xxx&customerId=xxx&stats=true
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const customerId = searchParams.get("customerId");
    const stats = searchParams.get("stats") === "true";

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    // Stats mode: return summary stats
    if (stats) {
      const sales = await db.localSale.findMany({
        where: { storeId },
      });

      const totalSales = sales.length;
      const totalRevenue = roundPi(sales.reduce((sum, s) => sum + s.total, 0));
      const totalCash = roundPi(
        sales.filter((s) => s.paymentMethod === "cash").reduce((sum, s) => sum + s.total, 0)
      );
      const totalCard = roundPi(
        sales.filter((s) => s.paymentMethod === "card").reduce((sum, s) => sum + s.total, 0)
      );
      const totalPi = roundPi(
        sales.filter((s) => s.paymentMethod === "pi").reduce((sum, s) => sum + s.total, 0)
      );
      const avgSale = totalSales > 0 ? roundPi(totalRevenue / totalSales) : 0;

      return NextResponse.json({
        totalSales,
        totalRevenue,
        totalCash,
        totalCard,
        totalPi,
        avgSale,
      });
    }

    // List mode
    const where: Record<string, unknown> = { storeId };
    if (customerId) where.customerId = customerId;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      db.localSale.findMany({
        where,
        include: {
          items: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.localSale.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: sales, total, page, limit, totalPages });
  } catch (error) {
    console.error("Fetch local sales error:", error);
    return NextResponse.json({ error: "Failed to fetch local sales" }, { status: 500 });
  }
}

// POST /api/local-sales — create local sale with items (auth required)
// Auto-generates invoice number, creates TransactionLog, updates inventory
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { storeId, items } = body;
    const customerId = body.customerId ? sanitizeString(body.customerId, 50) : null;
    const paymentMethod = sanitizeString(body.paymentMethod, 20) || "cash";
    const notes = sanitizeString(body.notes, 500);
    const createdBy = auth.user.uid;

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "storeId and items array are required" },
        { status: 400 }
      );
    }

    // Validate payment method
    const validPaymentMethods = ["cash", "card", "pi"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Invalid paymentMethod. Valid: ${validPaymentMethods.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // Validate customer if provided
    if (customerId) {
      const customer = await db.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
    }

    // Validate items
    const validatedItems = items.map(
      (i: { productId?: string; productName?: string; quantity?: number; unitPrice?: number }) => {
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
      }
    );

    const subtotal = roundPi(validatedItems.reduce((sum: number, i) => sum + i.totalPrice, 0));
    const taxAmount = roundPi(Number(body.taxAmount) || 0);
    const discountAmount = roundPi(Number(body.discountAmount) || 0);
    const total = roundPi(subtotal + taxAmount - discountAmount);

    if (total < 0) {
      return NextResponse.json(
        { error: "Total cannot be negative (discount exceeds subtotal + tax)" },
        { status: 400 }
      );
    }

    // === Strict stock availability check BEFORE creating sale ===
    const itemsWithProduct = validatedItems.filter((i): i is typeof i & { productId: string } => i.productId !== null);
    if (itemsWithProduct.length > 0) {
      const stockCheck = await checkStockAvailability(
        storeId,
        itemsWithProduct.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      );

      if (!stockCheck.available) {
        // BLOCK the sale — return 409 Conflict with details
        return NextResponse.json(
          {
            error: "مخزون غير كافٍ",
            details: stockCheck.items
              .filter((i) => !i.sufficient)
              .map((i) => ({
                product: i.productName,
                requested: i.requested,
                available: i.available,
                inStock: i.inStock,
                reserved: i.reserved,
              })),
          },
          { status: 409 }
        );
      }
    }

    const invoiceNumber = genLocalSaleNumber();

    // Create the local sale with items
    const sale = await db.localSale.create({
      data: {
        storeId,
        customerId,
        invoiceNumber,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        paymentMethod,
        notes,
        createdBy,
        items: { create: validatedItems },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // === Auto-create TransactionLog entry ===
    await db.transactionLog.create({
      data: {
        storeId,
        type: paymentMethod === "pi" ? "pi" : paymentMethod,
        amount: total,
        currency: "Pi",
        description: `Local sale ${invoiceNumber}`,
        reference: invoiceNumber,
        createdBy,
      },
    });

    // === Deduct stock atomically using inventory guard ===
    if (itemsWithProduct.length > 0) {
      const deductResult = await deductStock(
        storeId,
        itemsWithProduct.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        sale.id,
        createdBy,
        false // isEscrow = false for local sales
      );

      if (!deductResult.success) {
        // Sale was created but stock deduction failed (concurrent modification)
        // This is a rare edge case — log warning but don't fail the sale
        console.warn(
          `Stock deduction failed for local sale ${sale.invoiceNumber}:`,
          deductResult.conflicts
        );
      }
    }

    // === Update Customer totals ===
    if (customerId) {
      const customer = await db.customer.findUnique({ where: { id: customerId } });
      if (customer) {
        await db.customer.update({
          where: { id: customerId },
          data: {
            totalSpent: roundPi(customer.totalSpent + total),
            totalOrders: customer.totalOrders + 1,
          },
        });
      }
    }

    return NextResponse.json(sale);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create local sale";
    console.error("Create local sale error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH /api/local-sales ──────────────────────────────────────────────

// Handle refund/return of local sales
// Body: { id: saleId, action: "refund", reason?: string }
export async function PATCH(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id, action } = body;

    // ── Required fields ──
    if (!id) {
      return NextResponse.json({ error: "id (saleId) is required" }, { status: 400 });
    }

    if (action !== "refund") {
      return NextResponse.json(
        { error: 'Invalid action. Supported: "refund"' },
        { status: 400 }
      );
    }

    const reason = sanitizeString(body.reason, 500) || "No reason provided";
    const refundedBy = auth.user.uid;

    // ── Fetch the sale with items and customer ──
    const sale = await db.localSale.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // ── Check if already refunded ──
    if (sale.notes && sale.notes.includes("[REFUNDED]")) {
      return NextResponse.json(
        { error: "Sale has already been refunded" },
        { status: 409 }
      );
    }

    // ── Verify store ownership ──
    const ownership = await verifyStoreOwnership(req, sale.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const refundTimestamp = new Date().toISOString();

    // ── Step 1: Create a refund TransactionLog entry ──
    const refundTransaction = await db.transactionLog.create({
      data: {
        storeId: sale.storeId,
        type: "refund",
        amount: roundPi(sale.total),
        currency: "Pi",
        description: `Refund for local sale ${sale.invoiceNumber}. Reason: ${reason}`,
        reference: `pending:refund:${sale.invoiceNumber}`,
        createdBy: refundedBy,
      },
    });

    // ── Step 2: Restore inventory using restockItems ──
    const itemsWithProduct = sale.items.filter(
      (item): item is typeof item & { productId: string } => item.productId !== null
    );

    let restockSuccess = true;
    if (itemsWithProduct.length > 0) {
      restockSuccess = await restockItems(
        sale.storeId,
        itemsWithProduct.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        sale.id,
        refundedBy
      );

      if (!restockSuccess) {
        console.warn(
          `Restock failed for refunded sale ${sale.invoiceNumber} — transaction log created but inventory not restored`
        );
      }
    }

    // ── Step 3: Update customer totals (reduce totalSpent and totalOrders) ──
    if (sale.customerId && sale.customer) {
      const newTotalSpent = roundPi(sale.customer.totalSpent - sale.total);
      const newTotalOrders = Math.max(0, sale.customer.totalOrders - 1);

      await db.customer.update({
        where: { id: sale.customerId },
        data: {
          totalSpent: Math.max(0, newTotalSpent), // Never go below 0
          totalOrders: newTotalOrders,
        },
      });
    }

    // ── Step 4: Mark the sale with notes indicating refund ──
    const existingNotes = sale.notes || "";
    const refundNote = `[REFUNDED] Refunded by ${refundedBy} at ${refundTimestamp}. Reason: ${reason}`;
    const updatedNotes = existingNotes
      ? `${existingNotes} | ${refundNote}`
      : refundNote;

    await db.localSale.update({
      where: { id },
      data: {
        notes: updatedNotes,
      },
    });

    // ── Return refund result ──
    return NextResponse.json({
      success: true,
      saleId: id,
      invoiceNumber: sale.invoiceNumber,
      refundTransactionId: refundTransaction.id,
      refundAmount: roundPi(sale.total),
      restockSuccess,
      customerUpdated: !!sale.customerId,
      refundNote,
    });
  } catch (error) {
    console.error("Refund local sale error:", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
