import { NextRequest, NextResponse } from "next/server";

/* ── Types ─────────────────────────────────────────────────────────── */

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  issuesFixed: number;
  xp: number;
  level: number;
  streak: number;
  change: "up" | "down" | "same";
  changeAmount: number;
}

interface CurrentUser {
  rank: number;
  username: string;
  issuesFixed: number;
  xp: number;
  level: number;
}

/* ── Mock Researchers ──────────────────────────────────────────────── */

const BASE_RESEARCHERS = [
  { username: "pi_pioneer",    baseFixed: 47, baseXp: 12500, baseLevel: 12, baseStreak: 15, change: "up" as const, changeAmt: 2 },
  { username: "node_guardian", baseFixed: 42, baseXp: 11200, baseLevel: 11, baseStreak: 12, change: "up" as const, changeAmt: 1 },
  { username: "crypto_sentinel", baseFixed: 38, baseXp: 9800, baseLevel: 10, baseStreak: 20, change: "same" as const, changeAmt: 0 },
  { username: "pi_explorer",   baseFixed: 35, baseXp: 9100, baseLevel: 10, baseStreak: 8,  change: "down" as const, changeAmt: 1 },
  { username: "mirxou_dev",    baseFixed: 23, baseXp: 6800,  baseLevel: 8,  baseStreak: 5,  change: "up" as const, changeAmt: 3 },
  { username: "blockchain_shield", baseFixed: 28, baseXp: 7400, baseLevel: 9,  baseStreak: 7,  change: "same" as const, changeAmt: 0 },
  { username: "secure_node",   baseFixed: 25, baseXp: 6200,  baseLevel: 8,  baseStreak: 10, change: "up" as const, changeAmt: 1 },
  { username: "pi_auditor",    baseFixed: 20, baseXp: 5100,  baseLevel: 7,  baseStreak: 3,  change: "down" as const, changeAmt: 2 },
  { username: "kyc_hunter",    baseFixed: 18, baseXp: 4500,  baseLevel: 6,  baseStreak: 14, change: "up" as const, changeAmt: 4 },
  { username: "auth_protector", baseFixed: 15, baseXp: 3800,  baseLevel: 5,  baseStreak: 6,  change: "same" as const, changeAmt: 0 },
];

/* ── Period multipliers ────────────────────────────────────────────── */

const PERIOD_MULTIPLIERS: Record<string, { fixed: number; xp: number }> = {
  week:   { fixed: 0.2, xp: 0.15 },
  month:  { fixed: 0.6, xp: 0.55 },
  alltime: { fixed: 1.0, xp: 1.0 },
};

/* ── Category severity filter ──────────────────────────────────────── */

const CATEGORY_SEVERITY_MAP: Record<string, string[]> = {
  all:      ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
  critical: ["CRITICAL"],
  high:     ["CRITICAL", "HIGH"],
  medium:   ["CRITICAL", "HIGH", "MEDIUM"],
};

/* ── Cache ─────────────────────────────────────────────────────────── */

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/* ── GET ───────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "alltime";
    const category = searchParams.get("category") || "all";

    const cacheKey = `leaderboard:${period}:${category}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const mult = PERIOD_MULTIPLIERS[period] || PERIOD_MULTIPLIERS.alltime;
    const severities = CATEGORY_SEVERITY_MAP[category] || CATEGORY_SEVERITY_MAP.all;

    // Category severity affects the "weight" of issues
    const severityWeight = severities.length / 4;

    const leaderboard: LeaderboardEntry[] = BASE_RESEARCHERS
      .map((r, idx) => {
        const seed = r.username + period + category;
        const hash = hashString(seed);
        const variance = (hash % 20 - 10) / 100; // -10% to +10%

        const issuesFixed = Math.round(r.baseFixed * mult.fixed * (1 + variance));
        const xp = Math.round(r.baseXp * mult.xp * severityWeight * (1 + variance * 0.5));
        const level = Math.max(1, Math.round(r.baseLevel * (mult.fixed === 1 ? 1 : 0.7) * (1 + variance * 0.3)));
        const streak = period === "week" ? Math.min(r.baseStreak, 7) : period === "month" ? Math.min(r.baseStreak, 30) : r.baseStreak;

        return {
          rank: 0, // assigned after sort
          username: r.username,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.username}`,
          issuesFixed,
          xp,
          level,
          streak,
          change: r.change,
          changeAmount: r.changeAmt,
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // Find current user
    const currentUserEntry = leaderboard.find((r) => r.username === "mirxou_dev");
    const currentUser: CurrentUser | null = currentUserEntry
      ? {
          rank: currentUserEntry.rank,
          username: currentUserEntry.username,
          issuesFixed: currentUserEntry.issuesFixed,
          xp: currentUserEntry.xp,
          level: currentUserEntry.level,
        }
      : null;

    const response = { leaderboard, currentUser };
    cache.set(cacheKey, { data: response, timestamp: Date.now() });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "فشل في تحميل بيانات لوحة المتصدرين" },
      { status: 500 }
    );
  }
}

/* ── Simple hash helper ────────────────────────────────────────────── */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}