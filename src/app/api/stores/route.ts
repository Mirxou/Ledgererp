import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";

// GET /api/stores — list stores (auth optional, returns only user's store if authed)
export async function GET(req: NextRequest) {
  try {
    // Rate limit check
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    // Try to get auth (optional for listing)
    const auth = await verifyPiAuth(req);

    if (auth.ok) {
      // Return only the authenticated user's store
      const store = await db.store.findUnique({
        where: { piUid: auth.user.uid },
        include: { _count: { select: { products: true, invoices: true } } },
      });
      // Return data envelope format for consistency with paginated response
      return NextResponse.json(store ? { data: [store], total: 1, page: 1, limit: 1, totalPages: 1 } : { data: [], total: 0, page: 1, limit: 1, totalPages: 0 });
    }

    // Fallback: return stores with pagination
    const page = Math.max(1, parseInt(new URL(req.url).searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(new URL(req.url).searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      db.store.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { products: true, invoices: true } } },
        skip,
        take: limit,
      }),
      db.store.count(),
    ]);
    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: stores, total, page, limit, totalPages });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}

// POST /api/stores — create a store (auth required)
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const name = sanitizeString(body.name, 100);
    const description = sanitizeString(body.description, 500);
    const avatar = sanitizeString(body.avatar, 500);

    if (!name) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 });
    }

    // Use authenticated user's UID (ignore any piUid in body for security)
    const store = await db.store.upsert({
      where: { piUid: auth.user.uid },
      update: { name, description, avatar: avatar || undefined },
      create: { piUid: auth.user.uid, name, description, avatar: avatar || "" },
    });
    return NextResponse.json(store);
  } catch (error) {
    console.error("Create store error:", error);
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}

// PATCH /api/stores — update store (auth + ownership required)
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

    // Verify ownership
    const ownership = await verifyStoreOwnership(req, id, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const name = body.name !== undefined ? sanitizeString(body.name, 100) : undefined;
    const description = body.description !== undefined ? sanitizeString(body.description, 500) : undefined;
    const avatar = body.avatar !== undefined ? sanitizeString(body.avatar, 500) : undefined;

    const data: Record<string, unknown> = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (avatar !== undefined) data.avatar = avatar;

    const store = await db.store.update({ where: { id }, data });
    return NextResponse.json(store);
  } catch (error) {
    console.error("Update store error:", error);
    return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
  }
}

// DELETE /api/stores — delete store (auth + ownership required)
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

    // Verify ownership
    const ownership = await verifyStoreOwnership(req, id, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // Cascade delete: invoice items → invoices → products → store
    await db.invoiceItem.deleteMany({ where: { invoice: { storeId: id } } });
    await db.invoice.deleteMany({ where: { storeId: id } });
    await db.product.deleteMany({ where: { storeId: id } });
    await db.store.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete store error:", error);
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
