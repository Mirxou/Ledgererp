import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPiAuth, verifyStoreOwnership, sanitizeString, checkRateLimit } from "@/lib/api-auth";
import { roundPi } from "@/lib/pi-amount";

const VALID_EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "salaries",
  "supplies",
  "marketing",
  "shipping",
  "other",
];

// GET /api/expenses?storeId=xxx&category=xxx&from=xxx&to=xxx&stats=true
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const stats = searchParams.get("stats") === "true";

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    const where: Record<string, unknown> = { storeId };
    if (category) {
      if (!VALID_EXPENSE_CATEGORIES.includes(category)) {
        return NextResponse.json({ error: "Invalid expense category" }, { status: 400 });
      }
      where.category = category;
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
      where.date = dateFilter;
    }

    // Stats mode: return expense summary by category
    if (stats) {
      const expenses = await db.expense.findMany({ where });

      const totalAmount = roundPi(expenses.reduce((sum, e) => sum + e.amount, 0));
      const byCategory: Record<string, number> = {};
      for (const cat of VALID_EXPENSE_CATEGORIES) {
        byCategory[cat] = roundPi(
          expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
        );
      }

      return NextResponse.json({
        totalAmount,
        totalCount: expenses.length,
        byCategory,
      });
    }

    // List mode
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      db.expense.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ data: expenses, total, page, limit, totalPages });
  } catch (error) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

// POST /api/expenses — create expense (auth required)
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const auth = await verifyPiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { storeId, category } = body;
    const description = sanitizeString(body.description, 300);
    const amount = Number(body.amount);
    const dateStr = body.date ? String(body.date) : null;
    const receipt = sanitizeString(body.receipt, 500);

    if (!storeId || !category || !description || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "storeId, category, description, and valid amount (positive number) are required" },
        { status: 400 }
      );
    }

    if (!VALID_EXPENSE_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid expense category. Valid: ${VALID_EXPENSE_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const roundedAmount = roundPi(amount);

    const expense = await db.expense.create({
      data: {
        storeId,
        category,
        description,
        amount: roundedAmount,
        date,
        receipt,
        createdBy: auth.user.uid,
      },
    });

    // Auto-create TransactionLog for the expense
    await db.transactionLog.create({
      data: {
        storeId,
        type: "expense",
        amount: roundedAmount,
        currency: "Pi",
        description: `Expense: ${description}`,
        reference: expense.id,
        createdBy: auth.user.uid,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

// PATCH /api/expenses — update expense (auth required)
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

    const expense = await db.expense.findUnique({ where: { id } });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, expense.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    const data: Record<string, unknown> = {};
    if (body.category !== undefined) {
      if (!VALID_EXPENSE_CATEGORIES.includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid expense category. Valid: ${VALID_EXPENSE_CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }
      data.category = body.category;
    }
    if (body.description !== undefined) data.description = sanitizeString(body.description, 300);
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
      }
      data.amount = roundPi(amount);
    }
    if (body.date !== undefined) {
      const date = new Date(String(body.date));
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      data.date = date;
    }
    if (body.receipt !== undefined) data.receipt = sanitizeString(body.receipt, 500);

    const updated = await db.expense.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

// DELETE /api/expenses — delete expense (auth required)
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

    const expense = await db.expense.findUnique({ where: { id } });
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Verify store ownership
    const ownership = await verifyStoreOwnership(req, expense.storeId, auth.user.uid);
    if (!ownership.ok) return ownership.response!;

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
