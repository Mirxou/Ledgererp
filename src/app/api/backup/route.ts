/**
 * Serverless-safe backup API.
 *
 * Backups are JSON snapshots of the store's business data stored IN the
 * database (BackupRecord table) — NOT on the filesystem. This works on
 * Vercel (read-only FS, Turso cloud DB) and local SQLite alike.
 *
 * GET    /api/backup?list=true  → list backups for the authenticated user
 * GET    /api/backup            → create a new backup snapshot
 * POST   /api/backup            → restore (safe subset — see below)
 * DELETE /api/backup            → delete one backup
 *
 * Restore restores the "business catalog" only: store settings, products,
 * inventory, customers and expenses. It deliberately does NOT touch
 * invoices, local sales, escrow transactions or transaction logs —
 * restoring stale payment state could desync the app from Pi Network
 * ledger reality and cause double payments.
 *
 * Every operation is scoped to the authenticated user's own store
 * (verifyPiAuth → uid → store.piUid), so cross-tenant access is impossible.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPiAuth, checkRateLimit, sanitizeString } from "@/lib/api-auth";

const MAX_BACKUPS = 10;

/** In-memory rate limit: one backup creation per minute (per lambda instance) */
let lastBackupTime = 0;
const BACKUP_COOLDOWN_MS = 60_000;

/** Generate backup filename with timestamp */
function generateBackupFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `ledgererp-backup-${yyyy}-${MM}-${dd}-${HH}${mm}${ss}.json`;
}

/** Format file size in human-readable format */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ─────────────────────────── Snapshot builder ─────────────────────────── */

async function buildSnapshot(storeId: string): Promise<{ json: string; storeName: string }> {
  const { db } = await import("@/lib/db");

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: {
      id: true, piUid: true, name: true, description: true, avatar: true,
      isVerified: true, source: true, piAppUrl: true, slug: true,
      currency: true, taxRate: true, phone: true, address: true, logo: true,
    },
  });
  if (!store) throw new Error("Store not found");

  const [products, customers, expenses, inventory] = await Promise.all([
    db.product.findMany({ where: { storeId } }),
    db.customer.findMany({ where: { storeId } }),
    db.expense.findMany({ where: { storeId }, orderBy: { date: "desc" } }),
    db.inventory.findMany({ where: { storeId } }),
  ]);

  // Resolve category slugs so restore can re-link to the global catalog
  const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean))] as string[];
  const cats = categoryIds.length
    ? await db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, slug: true } })
    : [];
  const catSlugById = new Map(cats.map((c) => [c.id, c.slug]));

  const snapshot = {
    version: 2,
    createdAt: new Date().toISOString(),
    store,
    products: products.map((p) => ({ ...p, categorySlug: p.categoryId ? catSlugById.get(p.categoryId) ?? null : null })),
    customers,
    expenses,
    inventory,
  };

  return { json: JSON.stringify(snapshot), storeName: store.name };
}

/* ─────────────────────────── Restore (safe subset) ────────────────────── */

async function restoreSnapshot(snapshotJson: string, storeId: string): Promise<void> {
  const { db } = await import("@/lib/db");
  const snap = JSON.parse(snapshotJson) as {
    store?: Record<string, unknown>;
    products?: Array<Record<string, unknown> & { categorySlug?: string | null }>;
    customers?: Array<Record<string, unknown>>;
    expenses?: Array<Record<string, unknown>>;
    inventory?: Array<Record<string, unknown>>;
  };

  if (!snap || snap.version !== 2) throw new Error("Unsupported backup format");

  await db.$transaction(async (tx) => {
    // 1) Store settings
    const s = snap.store ?? {};
    await tx.store.update({
      where: { id: storeId },
      data: {
        name: typeof s.name === "string" ? s.name : undefined,
        description: typeof s.description === "string" ? s.description : undefined,
        avatar: typeof s.avatar === "string" ? s.avatar : undefined,
        currency: typeof s.currency === "string" ? s.currency : undefined,
        taxRate: typeof s.taxRate === "number" ? s.taxRate : undefined,
        phone: typeof s.phone === "string" ? s.phone : undefined,
        address: typeof s.address === "string" ? s.address : undefined,
        logo: typeof s.logo === "string" ? s.logo : undefined,
      },
    });

    // 2) Products + inventory: replace (cascade removes inventory/movements;
    //    invoice & sale items keep their rows via ON DELETE SET NULL)
    await tx.product.deleteMany({ where: { storeId } });
    const catBySlug = new Map<string, string>();
    const slugs = (snap.products ?? []).map((p) => p.categorySlug).filter(Boolean) as string[];
    if (slugs.length) {
      const cats = await tx.category.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
      for (const c of cats) catBySlug.set(c.slug, c.id);
    }

    for (const p of snap.products ?? []) {
      if (typeof p.id !== "string" || typeof p.name !== "string" || typeof p.price !== "number") continue;
      await tx.product.create({
        data: {
          id: p.id,
          storeId,
          name: p.name,
          description: typeof p.description === "string" ? p.description : "",
          price: p.price,
          costPrice: typeof p.costPrice === "number" ? p.costPrice : 0,
          sku: typeof p.sku === "string" ? p.sku : "",
          stockQuantity: typeof p.stockQuantity === "number" ? p.stockQuantity : 0,
          lowStockThreshold: typeof p.lowStockThreshold === "number" ? p.lowStockThreshold : 5,
          trackInventory: p.trackInventory !== false,
          categoryId: p.categorySlug ? catBySlug.get(p.categorySlug) ?? null : null,
          unit: typeof p.unit === "string" ? p.unit : "unit",
          image: typeof p.image === "string" ? p.image : "",
          isActive: p.isActive !== false,
        },
      });
    }

    // 3) Inventory rows (re-link to restored products by stored ids)
    for (const inv of snap.inventory ?? []) {
      if (typeof inv.id !== "string" || typeof inv.productId !== "string") continue;
      const productExists = (snap.products ?? []).some((p) => p.id === inv.productId);
      if (!productExists) continue;
      await tx.inventory.create({
        data: {
          id: inv.id,
          productId: inv.productId,
          storeId,
          quantity: typeof inv.quantity === "number" ? inv.quantity : 0,
          reservedQuantity: typeof inv.reservedQuantity === "number" ? inv.reservedQuantity : 0,
          version: typeof inv.version === "number" ? inv.version : 0,
          lowStockThreshold: typeof inv.lowStockThreshold === "number" ? inv.lowStockThreshold : 5,
          trackInventory: inv.trackInventory !== false,
        },
      });
    }

    // 4) Customers (LocalSale.customerId is ON DELETE SET NULL — history safe)
    await tx.customer.deleteMany({ where: { storeId } });
    for (const c of snap.customers ?? []) {
      if (typeof c.id !== "string" || typeof c.name !== "string") continue;
      await tx.customer.create({
        data: {
          id: c.id,
          storeId,
          name: c.name,
          phone: typeof c.phone === "string" ? c.phone : "",
          email: typeof c.email === "string" ? c.email : "",
          address: typeof c.address === "string" ? c.address : "",
          piUid: typeof c.piUid === "string" ? c.piUid : null,
          notes: typeof c.notes === "string" ? c.notes : "",
          totalSpent: typeof c.totalSpent === "number" ? c.totalSpent : 0,
          totalOrders: typeof c.totalOrders === "number" ? c.totalOrders : 0,
          isActive: c.isActive !== false,
        },
      });
    }

    // 5) Expenses
    await tx.expense.deleteMany({ where: { storeId } });
    for (const e of snap.expenses ?? []) {
      if (typeof e.id !== "string" || typeof e.category !== "string" || typeof e.amount !== "number") continue;
      await tx.expense.create({
        data: {
          id: e.id,
          storeId,
          category: e.category,
          description: typeof e.description === "string" ? e.description : "",
          amount: e.amount,
          date: typeof e.date === "string" ? new Date(e.date) : new Date(),
          receipt: typeof e.receipt === "string" ? e.receipt : "",
          createdBy: typeof e.createdBy === "string" ? e.createdBy : "",
        },
      });
    }
  });
}

/* ─────────────────────────────── Routes ───────────────────────────────── */

// GET /api/backup         → create backup
// GET /api/backup?list=1  → list backups
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;
    const { db } = await import("@/lib/db");

    const { searchParams } = new URL(req.url);
    const listMode = searchParams.get("list") === "true";

    // ── List mode ──
    if (listMode) {
      const rows = await db.backupRecord.findMany({
        where: { piUid: auth.user.uid },
        orderBy: { createdAt: "desc" },
        select: { filename: true, size: true, createdAt: true },
      });
      const backups = rows.map((r) => ({
        filename: r.filename,
        size: r.size,
        sizeFormatted: formatSize(r.size),
        createdAt: r.createdAt.toISOString(),
      }));
      return NextResponse.json({ backups });
    }

    // ── Create backup ──
    const store = await db.store.findUnique({ where: { piUid: auth.user.uid }, select: { id: true } });
    if (!store) {
      return NextResponse.json({ error: "No store found for this user" }, { status: 404 });
    }

    const now = Date.now();
    if (now - lastBackupTime < BACKUP_COOLDOWN_MS) {
      const remaining = Math.ceil((BACKUP_COOLDOWN_MS - (now - lastBackupTime)) / 1000);
      return NextResponse.json(
        { error: `Backup cooldown active. Try again in ${remaining}s.`, retryAfter: remaining },
        { status: 429 }
      );
    }

    const { json, storeName } = await buildSnapshot(store.id);
    const filename = generateBackupFilename();
    const size = Buffer.byteLength(json, "utf8");

    const record = await db.backupRecord.create({
      data: {
        piUid: auth.user.uid,
        storeId: store.id,
        storeName,
        filename,
        size,
        dataJson: json,
      },
      select: { filename: true, createdAt: true },
    });

    lastBackupTime = Date.now();

    // Prune old backups (keep MAX_BACKUPS most recent for this user)
    const old = await db.backupRecord.findMany({
      where: { piUid: auth.user.uid },
      orderBy: { createdAt: "desc" },
      select: { id: true },
      skip: MAX_BACKUPS,
    });
    if (old.length) {
      await db.backupRecord.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
    }

    return NextResponse.json({
      success: true,
      filename: record.filename,
      size,
      sizeFormatted: formatSize(size),
      timestamp: record.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[backup] GET error:", error);
    return NextResponse.json({ error: "Backup operation failed" }, { status: 500 });
  }
}

// POST /api/backup → restore from a backup
// Body: { filename: "ledgererp-backup-....json" }
// CRITICAL: Requires manager role (X-User-Role header) and restores only
// the authenticated user's own data.
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const userRole = req.headers.get("X-User-Role") || "viewer";
    if (userRole !== "manager" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Restore operation requires manager or admin role" },
        { status: 403 }
      );
    }

    const { db } = await import("@/lib/db");

    const body = await req.json();
    const filename = sanitizeString(body.filename, 120);

    if (!filename.startsWith("ledgererp-backup-") || !(filename.endsWith(".json") || filename.endsWith(".db"))) {
      return NextResponse.json({ error: "Invalid backup filename" }, { status: 400 });
    }

    const record = await db.backupRecord.findFirst({
      where: { piUid: auth.user.uid, filename },
      select: { id: true, dataJson: true, storeId: true },
    });
    if (!record) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    // Safety backup of current data before restoring
    let safetyFilename: string | null = null;
    try {
      const { json } = await buildSnapshot(record.storeId);
      safetyFilename = `ledgererp-backup-pre-restore-${generateBackupFilename().replace("ledgererp-backup-", "")}`;
      await db.backupRecord.create({
        data: {
          piUid: auth.user.uid,
          storeId: record.storeId,
          storeName: "",
          filename: safetyFilename,
          size: Buffer.byteLength(json, "utf8"),
          dataJson: json,
        },
      });
    } catch (e) {
      console.warn("[backup] safety snapshot failed (continuing):", e);
    }

    await restoreSnapshot(record.dataJson, record.storeId);

    return NextResponse.json({
      success: true,
      restoredFrom: filename,
      safetyBackup: safetyFilename,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[backup] POST (restore) error:", error);
    const message = error instanceof Error && error.message === "Unsupported backup format"
      ? "نسخة احتياطية بتنسيق غير مدعوم"
      : "Restore operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/backup → delete one backup
export async function DELETE(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;
    const { db } = await import("@/lib/db");

    const body = await req.json();
    const filename = sanitizeString(body.filename, 120);

    if (!filename) {
      return NextResponse.json({ error: "Invalid backup filename" }, { status: 400 });
    }

    const deleted = await db.backupRecord.deleteMany({
      where: { piUid: auth.user.uid, filename },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deleted: filename,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[backup] DELETE error:", error);
    return NextResponse.json({ error: "Delete operation failed" }, { status: 500 });
  }
}
