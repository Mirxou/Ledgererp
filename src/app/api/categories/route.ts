import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, sanitizeString, checkRateLimit } from "@/lib/api-auth";

// GET /api/categories?parentId=xxx&active=true
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (parentId !== null) {
      // "null" string means root categories (no parent)
      where.parentId = parentId === "null" ? null : parentId;
    }
    if (active === "true") where.isActive = true;

    const categories = await db.category.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        _count: { select: { products: true } },
        children: {
          include: { _count: { select: { products: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("Fetch categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST /api/categories — create category (auth required)
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const nameAr = sanitizeString(body.nameAr, 100);
    const nameEn = sanitizeString(body.nameEn, 100);
    const slug = sanitizeString(body.slug, 100);
    const icon = sanitizeString(body.icon, 50);
    const color = sanitizeString(body.color, 50);
    const parentId = body.parentId ? sanitizeString(body.parentId, 50) : null;
    const sortOrder = body.sortOrder !== undefined ? parseInt(String(body.sortOrder), 10) : 0;

    if (!nameAr || !nameEn || !slug) {
      return NextResponse.json(
        { error: "nameAr, nameEn, and slug are required" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await db.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }

    // Validate parentId if provided
    if (parentId) {
      const parent = await db.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
      }
    }

    const category = await db.category.create({
      data: {
        nameAr,
        nameEn,
        slug,
        icon,
        color,
        parentId,
        sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
      },
      include: {
        _count: { select: { products: true } },
        children: true,
        parent: true,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

// PATCH /api/categories — update category (auth required)
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

    const category = await db.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.nameAr !== undefined) data.nameAr = sanitizeString(body.nameAr, 100);
    if (body.nameEn !== undefined) data.nameEn = sanitizeString(body.nameEn, 100);
    if (body.slug !== undefined) {
      const newSlug = sanitizeString(body.slug, 100);
      if (!newSlug) {
        return NextResponse.json({ error: "slug cannot be empty" }, { status: 400 });
      }
      // Check slug uniqueness (exclude current)
      const existing = await db.category.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
      }
      data.slug = newSlug;
    }
    if (body.icon !== undefined) data.icon = sanitizeString(body.icon, 50);
    if (body.color !== undefined) data.color = sanitizeString(body.color, 50);
    if (body.parentId !== undefined) data.parentId = body.parentId ? sanitizeString(body.parentId, 50) : null;
    if (body.sortOrder !== undefined) {
      const so = parseInt(String(body.sortOrder), 10);
      data.sortOrder = isNaN(so) ? 0 : so;
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const updated = await db.category.update({
      where: { id },
      data,
      include: {
        _count: { select: { products: true } },
        children: true,
        parent: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE /api/categories — delete category (auth required)
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

    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category._count.children > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with child categories. Move or delete children first." },
        { status: 400 }
      );
    }

    // Nullify categoryId on products referencing this category
    await db.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
