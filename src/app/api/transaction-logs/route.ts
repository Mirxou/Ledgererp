import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, sanitizeString, checkRateLimit } from "@/lib/api-auth";
import { roundPi } from "@/lib/pi-amount";

const VALID_TRANSACTION_TYPES = ["cash", "pi", "ousd", "refund", "expense"];
const VALID_CURRENCIES = ["Pi", "USD", "OUSD"];

// ─── State Machine Helpers ──────────────────────────────────────────────

/** Extract status from reference field (prefix convention: "status:...") */
function extractStatus(reference: string): string {
  const colonIdx = reference.indexOf(":");
  if (colonIdx === -1) return "pending"; // No prefix = legacy entry, treat as pending
  const prefix = reference.substring(0, colonIdx);
  if (["pending", "approved", "completed", "failed"].includes(prefix)) {
    return prefix;
  }
  return "pending"; // Unknown prefix = treat as pending
}

/** Extract the actual reference value (everything after the prefix) */
function extractReferenceValue(reference: string): string {
  const colonIdx = reference.indexOf(":");
  if (colonIdx === -1) return reference;
  const prefix = reference.substring(0, colonIdx);
  if (["pending", "approved", "completed", "failed"].includes(prefix)) {
    return reference.substring(colonIdx + 1);
  }
  return reference; // Not a status prefix, return as-is
}

/** Build a reference field with status prefix */
function buildReference(status: string, value: string): string {
  return `${status}:${value}`;
}

/** Valid state transitions: pending → approved → completed | failed */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "failed"],
  approved: ["completed", "failed"],
  completed: [], // Terminal state
  failed: [],    // Terminal state
};

// ─── GET /api/transaction-logs ──────────────────────────────────────────

// GET /api/transaction-logs?storeId=xxx&type=xxx&from=xxx&to=xxx&stats=true
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const stats = searchParams.get("stats") === "true";

    // ── Stats mode ──
    if (stats) {
      if (!storeId) {
        return NextResponse.json({ error: "storeId required for stats" }, { status: 400 });
      }

      const transactions = await db.transactionLog.findMany({
        where: { storeId },
      });

      // Total by type
      const totalByType: Record<string, number> = { cash: 0, pi: 0, ousd: 0, refund: 0, expense: 0 };
      // Total by currency
      const totalByCurrency: Record<string, number> = { Pi: 0, USD: 0, OUSD: 0 };
      let pendingCount = 0;
      let completedCount = 0;

      for (const tx of transactions) {
        // By type
        if (totalByType[tx.type] !== undefined) {
          totalByType[tx.type] = roundPi(totalByType[tx.type] + tx.amount);
        }

        // By currency
        if (totalByCurrency[tx.currency] !== undefined) {
          totalByCurrency[tx.currency] = roundPi(totalByCurrency[tx.currency] + tx.amount);
        }

        // Status counts (from reference field convention)
        const status = extractStatus(tx.reference);
        if (status === "pending") pendingCount++;
        if (status === "completed") completedCount++;
      }

      return NextResponse.json({
        totalByType,
        totalByCurrency,
        pendingCount,
        completedCount,
      });
    }

    // ── List mode ──
    const where: Record<string, unknown> = {};
    if (storeId) where.storeId = storeId;
    if (type) {
      if (!VALID_TRANSACTION_TYPES.includes(type)) {
        return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
      }
      where.type = type;
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
      where.createdAt = dateFilter;
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      db.transactionLog.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.transactionLog.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: transactions, total, page, limit, totalPages });
  } catch (error) {
    console.error("Fetch transaction logs error:", error);
    return NextResponse.json({ error: "Failed to fetch transaction logs" }, { status: 500 });
  }
}

// ─── POST /api/transaction-logs ─────────────────────────────────────────

// Create a new transaction log entry with state machine
// New entries start with status "pending" stored in reference field as "pending:{reference}"
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { storeId, type, amount, currency } = body;

    // ── Required fields validation ──
    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    if (!type || !VALID_TRANSACTION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid: ${VALID_TRANSACTION_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!currency || !VALID_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Valid: ${VALID_CURRENCIES.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Optional fields ──
    const invoiceId = body.invoiceId ? sanitizeString(body.invoiceId, 50) : null;
    const description = sanitizeString(body.description, 500);
    const referenceInput = sanitizeString(body.reference, 200);
    const createdBy = body.createdBy ? sanitizeString(body.createdBy, 100) : auth.user.uid;

    // ── Verify store exists ──
    const store = await db.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // ── Auto-link to invoice if invoiceId provided ──
    if (invoiceId) {
      const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      if (invoice.storeId !== storeId) {
        return NextResponse.json(
          { error: "Invoice does not belong to this store" },
          { status: 400 }
        );
      }
    }

    // ── State machine: new entries start as "pending" ──
    // Reference field convention: "pending:{actual_reference}"
    const referenceValue = referenceInput || "";
    const reference = buildReference("pending", referenceValue);

    // ── Create transaction log ──
    const transaction = await db.transactionLog.create({
      data: {
        storeId,
        invoiceId,
        type,
        amount: roundPi(numAmount),
        currency,
        description,
        reference,
        createdBy,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Create transaction log error:", error);
    return NextResponse.json({ error: "Failed to create transaction log" }, { status: 500 });
  }
}

// ─── PUT /api/transaction-logs ──────────────────────────────────────────

// Update transaction state (state machine transitions):
// pending → approved → completed | failed
export async function PUT(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { id, status } = body;

    // ── Required fields ──
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!status || !["approved", "completed", "failed"].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Valid transitions: "approved", "completed", "failed"' },
        { status: 400 }
      );
    }

    // ── Fetch existing transaction ──
    const existing = await db.transactionLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // ── State machine validation ──
    const currentStatus = extractStatus(existing.reference);
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid state transition: ${currentStatus} → ${status}`,
          currentStatus,
          allowedTransitions: allowedTransitions || [],
        },
        { status: 409 }
      );
    }

    // ── Update reference field with new status ──
    const referenceValue = extractReferenceValue(existing.reference);
    const newReference = buildReference(status, referenceValue);

    // ── Build update data ──
    const updateData: Record<string, unknown> = {
      reference: newReference,
    };

    // When status changes to "completed", record timestamp in description
    if (status === "completed") {
      const completedAt = body.completedAt ? new Date(body.completedAt) : new Date();
      const existingDesc = existing.description || "";
      // Append completion timestamp to description (schema has no completedAt field)
      updateData.description = existingDesc
        ? `${existingDesc} [completedAt: ${completedAt.toISOString()}]`
        : `completedAt: ${completedAt.toISOString()}`;
    }

    // ── Perform update ──
    const updated = await db.transactionLog.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      status: status, // Include resolved status for clarity
      previousStatus: currentStatus,
    });
  } catch (error) {
    console.error("Update transaction log error:", error);
    return NextResponse.json({ error: "Failed to update transaction log" }, { status: 500 });
  }
}
