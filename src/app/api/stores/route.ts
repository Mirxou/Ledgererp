import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/stores — list all stores
export async function GET(req: Request) {
  try {
    const stores = await db.store.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { products: true, invoices: true } } },
    });
    return NextResponse.json(stores);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}

// POST /api/stores — create a store
export async function POST(req: Request) {
  try {
    const { piUid, name, description } = await req.json();
    if (!piUid || !name) {
      return NextResponse.json({ error: "piUid and name required" }, { status: 400 });
    }
    const store = await db.store.upsert({
      where: { piUid },
      update: { name, description },
      create: { piUid, name, description: description || "" },
    });
    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}