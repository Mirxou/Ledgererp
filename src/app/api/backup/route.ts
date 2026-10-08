import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyPiAuth, checkRateLimit, sanitizeString } from "@/lib/api-auth";

const DB_PATH = path.join(process.cwd(), "db", "ledgererp.db");
const BACKUP_DIR = path.join(process.cwd(), "db", "backups");
const MAX_BACKUPS = 10;

/** In-memory rate limit: one backup trigger per minute */
let lastBackupTime = 0;
const BACKUP_COOLDOWN_MS = 60_000;

/** Ensure backup directory exists */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/** Generate backup filename with timestamp */
function generateBackupFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `ledgererp-backup-${yyyy}-${MM}-${dd}-${HH}${mm}${ss}.db`;
}

/** Parse timestamp from backup filename for sorting */
function parseBackupDate(filename: string): Date {
  const match = filename.match(/ledgererp-backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})\.db/);
  if (!match) return new Date(0);
  const [, y, mo, d, h, mi, s] = match;
  return new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), parseInt(h), parseInt(mi), parseInt(s));
}

/** Format file size in human-readable format */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Prune old backups, keeping only the most recent MAX_BACKUPS */
function pruneOldBackups(): void {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("ledgererp-backup-") && f.endsWith(".db"))
    .sort((a, b) => parseBackupDate(b).getTime() - parseBackupDate(a).getTime());

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      } catch {
        // Ignore deletion errors for individual files
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GET /api/backup         → Trigger a new backup
// GET /api/backup?list=true → List all backups
// ═══════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const listMode = searchParams.get("list") === "true";

    // ── List mode ──
    if (listMode) {
      ensureBackupDir();
      const files = fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("ledgererp-backup-") && f.endsWith(".db"))
        .sort((a, b) => parseBackupDate(b).getTime() - parseBackupDate(a).getTime());

      const backups = files.map((filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(filePath);
        return {
          filename,
          size: stat.size,
          sizeFormatted: formatSize(stat.size),
          createdAt: stat.birthtime.toISOString(),
        };
      });

      return NextResponse.json({ backups });
    }

    // ── Trigger backup mode ──
    // Rate limit: one backup per minute
    const now = Date.now();
    if (now - lastBackupTime < BACKUP_COOLDOWN_MS) {
      const remaining = Math.ceil((BACKUP_COOLDOWN_MS - (now - lastBackupTime)) / 1000);
      return NextResponse.json(
        { error: `Backup cooldown active. Try again in ${remaining}s.`, retryAfter: remaining },
        { status: 429 }
      );
    }

    // Check that the database file exists
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json(
        { error: "Database file not found" },
        { status: 404 }
      );
    }

    ensureBackupDir();
    const filename = generateBackupFilename();
    const backupPath = path.join(BACKUP_DIR, filename);

    // Copy the SQLite database file
    fs.copyFileSync(DB_PATH, backupPath);

    const stat = fs.statSync(backupPath);
    lastBackupTime = Date.now();

    // Prune old backups
    pruneOldBackups();

    return NextResponse.json({
      success: true,
      filename,
      size: stat.size,
      sizeFormatted: formatSize(stat.size),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[backup] GET error:", error);
    return NextResponse.json(
      { error: "Backup operation failed" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// POST /api/backup → Restore from a specific backup
// Body: { filename: "ledgererp-backup-2025-01-01-120000.db" }
// CRITICAL: Requires manager role (checked via X-User-Role header)
// ═══════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    // ── Role check: only managers can restore ──
    const userRole = req.headers.get("X-User-Role") || "viewer";
    if (userRole !== "manager" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Restore operation requires manager or admin role" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const filename = sanitizeString(body.filename, 100);

    if (!filename || !filename.startsWith("ledgererp-backup-") || !filename.endsWith(".db")) {
      return NextResponse.json(
        { error: "Invalid backup filename" },
        { status: 400 }
      );
    }

    const backupPath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json(
        { error: "Backup file not found" },
        { status: 404 }
      );
    }

    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json(
        { error: "Current database file not found" },
        { status: 404 }
      );
    }

    // ── Create safety backup of current DB before restoring ──
    ensureBackupDir();
    const safetyFilename = `ledgererp-backup-pre-restore-${generateBackupFilename().replace("ledgererp-backup-", "")}`;
    const safetyPath = path.join(BACKUP_DIR, safetyFilename);
    fs.copyFileSync(DB_PATH, safetyPath);

    // ── Restore: copy backup over current DB ──
    fs.copyFileSync(backupPath, DB_PATH);

    // Prune old backups
    pruneOldBackups();

    return NextResponse.json({
      success: true,
      restoredFrom: filename,
      safetyBackup: safetyFilename,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[backup] POST (restore) error:", error);
    return NextResponse.json(
      { error: "Restore operation failed" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DELETE /api/backup → Delete a specific backup file
// Body: { filename: "ledgererp-backup-..." }
// ═══════════════════════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const filename = sanitizeString(body.filename, 100);

    if (!filename || !filename.startsWith("ledgererp-backup-") || !filename.endsWith(".db")) {
      return NextResponse.json(
        { error: "Invalid backup filename" },
        { status: 400 }
      );
    }

    const backupPath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json(
        { error: "Backup file not found" },
        { status: 404 }
      );
    }

    fs.unlinkSync(backupPath);

    return NextResponse.json({
      success: true,
      deleted: filename,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[backup] DELETE error:", error);
    return NextResponse.json(
      { error: "Delete operation failed" },
      { status: 500 }
    );
  }
}
