import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";

/** Generate URL-safe slug from Arabic/English store name */
function generateSlug(name: string, piUid: string): string {
  const base = name
    .toLowerCase()
    .replace(/[أإآا]/g, "a")
    .replace(/ب/g, "b")
    .replace(/ت/g, "t")
    .replace(/ث/g, "th")
    .replace(/ج/g, "j")
    .replace(/ح/g, "h")
    .replace(/خ/g, "kh")
    .replace(/د/g, "d")
    .replace(/ذ/g, "dh")
    .replace(/ر/g, "r")
    .replace(/ز/g, "z")
    .replace(/س/g, "s")
    .replace(/ش/g, "sh")
    .replace(/ص/g, "s")
    .replace(/ض/g, "d")
    .replace(/ط/g, "t")
    .replace(/ظ/g, "z")
    .replace(/ع/g, "a")
    .replace(/غ/g, "gh")
    .replace(/ف/g, "f")
    .replace(/ق/g, "q")
    .replace(/ك/g, "k")
    .replace(/ل/g, "l")
    .replace(/م/g, "m")
    .replace(/ن/g, "n")
    .replace(/ه/g, "h")
    .replace(/و/g, "w")
    .replace(/ي/g, "y")
    .replace(/ء/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const uid = piUid.substring(0, 6);
  return (base || "store") + "-" + uid;
}

// GET /api/stores — list stores (auth optional, returns only user's store if authed)
// Supports slug lookup: ?slug=my-store
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const url = new URL(req.url);
    
    // Slug-based lookup (public)
    const slugParam = url.searchParams.get("slug");
    if (slugParam) {
      const store = await db.store.findUnique({
        where: { slug: slugParam },
        include: { _count: { select: { products: true, invoices: true } } },
      });
      return NextResponse.json(store ? { data: [store] } : { data: [] });
    }

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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
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
// Supports: source ("ledgererp" | "pi_connected"), piAppUrl, slug, products (batch)
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
    const source = sanitizeString(body.source, 20) || "ledgererp";
    const piAppUrl = sanitizeString(body.piAppUrl, 500) || "";
    const slugInput = sanitizeString(body.slug, 100) || "";

    if (!name) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 });
    }

    // Validate source
    if (source !== "ledgererp" && source !== "pi_connected") {
      return NextResponse.json({ error: "Invalid source. Must be 'ledgererp' or 'pi_connected'" }, { status: 400 });
    }

    // Validate piAppUrl for connected stores
    if (source === "pi_connected" && !piAppUrl) {
      return NextResponse.json({ error: "piAppUrl is required when connecting an existing Pi store" }, { status: 400 });
    }

    // Generate slug
    const slug = slugInput || generateSlug(name, auth.user.uid);

    // Ensure slug is unique
    const existingSlug = await db.store.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? slug + "-" + Date.now().toString(36) : slug;

    // Use authenticated user's UID (ignore any piUid in body for security)
    const store = await db.store.upsert({
      where: { piUid: auth.user.uid },
      update: { name, description, avatar: avatar || undefined, source, piAppUrl, slug: finalSlug },
      create: { piUid: auth.user.uid, name, description, avatar: avatar || "", source, piAppUrl, slug: finalSlug },
    });

    // Batch create products if provided (for Pi-connected stores)
    const products = body.products;
    let createdProducts = 0;
    if (Array.isArray(products) && products.length > 0) {
      for (const p of products) {
        const pName = sanitizeString(p.name, 100);
        const pPrice = Number(p.price);
        const pDesc = sanitizeString(p.description, 500) || "";
        if (pName && pPrice > 0) {
          await db.product.create({
            data: {
              storeId: store.id,
              name: pName,
              description: pDesc,
              price: pPrice,
              isActive: true,
            },
          });
          createdProducts++;
        }
      }
    }

    // Return store with product count
    const storeWithCount = await db.store.findUnique({
      where: { id: store.id },
      include: { _count: { select: { products: true, invoices: true } } },
    });

    return NextResponse.json({
      ...storeWithCount,
      _importedProducts: createdProducts,
    });
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
    const piAppUrl = body.piAppUrl !== undefined ? sanitizeString(body.piAppUrl, 500) : undefined;

    const data: Record<string, unknown> = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (avatar !== undefined) data.avatar = avatar;
    if (piAppUrl !== undefined) data.piAppUrl = piAppUrl;

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
