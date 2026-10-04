import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";

// GET /api/customers?storeId=xxx&search=xxx
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const search = searchParams.get("search");

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    const where: Record<string, unknown> = { storeId };
    if (search) {
      const term = sanitizeString(search, 100);
      where.OR = [
        { name: { contains: term } },
        { phone: { contains: term } },
        { email: { contains: term } },
        { piUid: { contains: term } },
      ];
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: customers, total, page, limit, totalPages });
  } catch (error) {
    console.error("Fetch customers error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

// POST /api/customers — create customer (auth required)
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { storeId } = body;
    const name = sanitizeString(body.name, 100);
    const phone = sanitizeString(body.phone, 20);
    const email = sanitizeString(body.email, 100);
    const address = sanitizeString(body.address, 300);
    const piUid = body.piUid ? sanitizeString(body.piUid, 100) : null;
    const notes = sanitizeString(body.notes, 500);

    if (!storeId || !name) {
      return NextResponse.json(
        { error: "storeId and name are required" },
        { status: 400 }
      );
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const customer = await db.customer.create({
      data: {
        storeId,
        name,
        phone,
        email,
        address,
        piUid,
        notes,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

// PATCH /api/customers — update customer (auth required)
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

    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, customer.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = sanitizeString(body.name, 100);
    if (body.phone !== undefined) data.phone = sanitizeString(body.phone, 20);
    if (body.email !== undefined) data.email = sanitizeString(body.email, 100);
    if (body.address !== undefined) data.address = sanitizeString(body.address, 300);
    if (body.piUid !== undefined) data.piUid = body.piUid ? sanitizeString(body.piUid, 100) : null;
    if (body.notes !== undefined) data.notes = sanitizeString(body.notes, 500);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const updated = await db.customer.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

// DELETE /api/customers — delete customer (auth required)
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

    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, customer.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    // Nullify customerId on local sales referencing this customer
    await db.localSale.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });

    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
