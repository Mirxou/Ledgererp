import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/api-auth";

const VALID_TRANSACTION_TYPES = ["cash", "pi", "ousd", "refund", "expense"];

// GET /api/transaction-logs?storeId=xxx&type=xxx&from=xxx&to=xxx
export async function GET(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

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
