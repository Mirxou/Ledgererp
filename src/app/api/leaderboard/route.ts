import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/api-auth";

/**
 * GET /api/leaderboard
 * Returns REAL store/merchant leaderboard from the database.
 * Ranked by: completed transaction volume → number of completed invoices → trust score.
 * No mock data — everything is computed from actual stores and invoices.
 */

// Local cache (5 min TTL)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "alltime";

    const cacheKey = `leaderboard:${period}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // ── Date filter based on period ───────────────────────────────────
    let dateFilter: Date | undefined;
    if (period === "week") {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // ── Fetch stores with their invoices ──────────────────────────────
    const stores = await db.store.findMany({
      include: {
        invoices: {
          where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
          select: {
            id: true,
            status: true,
            total: true,
            subtotal: true,
            createdAt: true,
          },
        },
        _count: { select: { products: true } },
      },
    });

    // ── Compute leaderboard entries ──────────────────────────────────
    const leaderboard = stores
      .map((store) => {
        const completedInvoices = store.invoices.filter((inv) => inv.status === "completed");
        const activeInvoices = store.invoices.filter((inv) =>
          ["paid_escrow", "shipped", "delivered"].includes(inv.status)
        );
        const disputedInvoices = store.invoices.filter((inv) => inv.status === "disputed");

        const completedVolume = completedInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
        const escrowedVolume = activeInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalVolume = store.invoices.reduce((sum, inv) => sum + inv.total, 0);

        // Trust score: weighted combination of completion rate and volume
        const completionRate = store.invoices.length > 0
          ? completedInvoices.length / store.invoices.length
          : 0;
        const disputeRate = store.invoices.length > 0
          ? disputedInvoices.length / store.invoices.length
          : 0;
        const trustScore = Math.max(0, Math.min(100, Math.round(
          completionRate * 40 + (1 - disputeRate) * 30 + Math.min(totalVolume / 100, 1) * 20 + (store.isVerified ? 10 : 0)
        )));

        return {
          rank: 0, // assigned after sort
          storeId: store.id,
          storeName: store.name,
          piUid: store.piUid,
          avatar: store.avatar,
          isVerified: store.isVerified,
          source: store.source,
          totalProducts: store._count.products,
          totalInvoices: store.invoices.length,
          completedInvoices: completedInvoices.length,
          activeInvoices: activeInvoices.length,
          disputedInvoices: disputedInvoices.length,
          completedVolume: Math.round(completedVolume * 100) / 100,
          escrowedVolume: Math.round(escrowedVolume * 100) / 100,
          totalVolume: Math.round(totalVolume * 100) / 100,
          trustScore,
          completionRate: Math.round(completionRate * 100),
          disputeRate: Math.round(disputeRate * 100),
        };
      })
      .sort((a, b) => {
        // Primary: total volume desc, secondary: trust score desc
        if (b.totalVolume !== a.totalVolume) return b.totalVolume - a.totalVolume;
        return b.trustScore - a.trustScore;
      })
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // ── Summary stats ────────────────────────────────────────────────
    const summary = {
      totalStores: stores.length,
      totalVolume: Math.round(leaderboard.reduce((sum, e) => sum + e.totalVolume, 0) * 100) / 100,
      totalCompleted: leaderboard.reduce((sum, e) => sum + e.completedInvoices, 0),
      avgTrustScore: leaderboard.length > 0
        ? Math.round(leaderboard.reduce((sum, e) => sum + e.trustScore, 0) / leaderboard.length)
        : 0,
    };

    const response = { leaderboard, summary, period };
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل بيانات لوحة المتصدرين", leaderboard: [], summary: {} },
      { status: 500 }
    );
  }
}
