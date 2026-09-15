"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Flame, TrendingUp, TrendingDown, Minus, Crown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { CARD_DEPTH } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   GLOBAL LEADERBOARD — Top security researchers
   ════════════════════════════════════════════════════════════════════════════ */

interface Researcher {
  id: string;
  username: string;
  avatar: string;
  fixedCount: number;
  xp: number;
  level: number;
  xpToNext: number;
  streak: number;
  rankChange: number; // positive = up, negative = down, 0 = stable
  isCurrentUser: boolean;
}

/* ── Mock Data ─────────────────────────────────────────────────────────── */

const MOCK_DATA: Record<string, Researcher[]> = {
  week: [
    { id: "1", username: "PiGuard_EG", avatar: "/avatars/pi1.png", fixedCount: 23, xp: 4850, level: 12, xpToNext: 850, streak: 14, rankChange: 2, isCurrentUser: false },
    { id: "2", username: "SecurityNinja", avatar: "/avatars/pi2.png", fixedCount: 19, xp: 4200, level: 11, xpToNext: 600, streak: 10, rankChange: 0, isCurrentUser: false },
    { id: "3", username: "BugHunter_SA", avatar: "/avatars/pi3.png", fixedCount: 17, xp: 3800, level: 10, xpToNext: 400, streak: 8, rankChange: -1, isCurrentUser: false },
    { id: "4", username: "AuditPro", avatar: "/avatars/pi4.png", fixedCount: 15, xp: 3400, level: 9, xpToNext: 300, streak: 7, rankChange: 1, isCurrentUser: true },
    { id: "5", username: "PiShield_KW", avatar: "/avatars/pi5.png", fixedCount: 14, xp: 3100, level: 9, xpToNext: 650, streak: 6, rankChange: -2, isCurrentUser: false },
    { id: "6", username: "ZeroDay_Hero", avatar: "/avatars/pi6.png", fixedCount: 12, xp: 2800, level: 8, xpToNext: 200, streak: 5, rankChange: 3, isCurrentUser: false },
    { id: "7", username: "CryptoAudit", avatar: "/avatars/pi7.png", fixedCount: 11, xp: 2500, level: 8, xpToNext: 500, streak: 4, rankChange: 0, isCurrentUser: false },
    { id: "8", username: "NetSentinel", avatar: "/avatars/pi8.png", fixedCount: 9, xp: 2200, level: 7, xpToNext: 100, streak: 3, rankChange: -1, isCurrentUser: false },
    { id: "9", username: "PiProtector", avatar: "/avatars/pi9.png", fixedCount: 8, xp: 1900, level: 7, xpToNext: 400, streak: 12, rankChange: 1, isCurrentUser: false },
    { id: "10", username: "SecDev_AE", avatar: "/avatars/pi10.png", fixedCount: 7, xp: 1600, level: 6, xpToNext: 200, streak: 2, rankChange: 0, isCurrentUser: false },
  ],
  month: [
    { id: "1", username: "PiGuard_EG", avatar: "/avatars/pi1.png", fixedCount: 87, xp: 18400, level: 18, xpToNext: 600, streak: 14, rankChange: 0, isCurrentUser: false },
    { id: "2", username: "BugHunter_SA", avatar: "/avatars/pi3.png", fixedCount: 72, xp: 15600, level: 16, xpToNext: 400, streak: 8, rankChange: 1, isCurrentUser: false },
    { id: "3", username: "SecurityNinja", avatar: "/avatars/pi2.png", fixedCount: 68, xp: 14200, level: 15, xpToNext: 800, streak: 10, rankChange: -1, isCurrentUser: false },
    { id: "4", username: "AuditPro", avatar: "/avatars/pi4.png", fixedCount: 61, xp: 12800, level: 14, xpToNext: 200, streak: 7, rankChange: 2, isCurrentUser: true },
    { id: "5", username: "ZeroDay_Hero", avatar: "/avatars/pi6.png", fixedCount: 55, xp: 11400, level: 13, xpToNext: 600, streak: 5, rankChange: 0, isCurrentUser: false },
    { id: "6", username: "PiShield_KW", avatar: "/avatars/pi5.png", fixedCount: 49, xp: 10200, level: 12, xpToNext: 200, streak: 6, rankChange: -2, isCurrentUser: false },
    { id: "7", username: "PiProtector", avatar: "/avatars/pi9.png", fixedCount: 44, xp: 9100, level: 11, xpToNext: 900, streak: 12, rankChange: 1, isCurrentUser: false },
    { id: "8", username: "CryptoAudit", avatar: "/avatars/pi7.png", fixedCount: 38, xp: 8000, level: 10, xpToNext: 1000, streak: 4, rankChange: 0, isCurrentUser: false },
    { id: "9", username: "NetSentinel", avatar: "/avatars/pi8.png", fixedCount: 33, xp: 7000, level: 9, xpToNext: 500, streak: 3, rankChange: -1, isCurrentUser: false },
    { id: "10", username: "SecDev_AE", avatar: "/avatars/pi10.png", fixedCount: 28, xp: 5900, level: 8, xpToNext: 600, streak: 2, rankChange: 1, isCurrentUser: false },
  ],
  alltime: [
    { id: "1", username: "PiGuard_EG", avatar: "/avatars/pi1.png", fixedCount: 342, xp: 68400, level: 28, xpToNext: 400, streak: 14, rankChange: 0, isCurrentUser: false },
    { id: "2", username: "SecurityNinja", avatar: "/avatars/pi2.png", fixedCount: 298, xp: 59600, level: 26, xpToNext: 400, streak: 10, rankChange: 0, isCurrentUser: false },
    { id: "3", username: "BugHunter_SA", avatar: "/avatars/pi3.png", fixedCount: 276, xp: 55200, level: 25, xpToNext: 800, streak: 8, rankChange: 1, isCurrentUser: false },
    { id: "4", username: "AuditPro", avatar: "/avatars/pi4.png", fixedCount: 251, xp: 50200, level: 24, xpToNext: 200, streak: 7, rankChange: -1, isCurrentUser: true },
    { id: "5", username: "ZeroDay_Hero", avatar: "/avatars/pi6.png", fixedCount: 230, xp: 46000, level: 23, xpToNext: 1000, streak: 5, rankChange: 0, isCurrentUser: false },
    { id: "6", username: "PiShield_KW", avatar: "/avatars/pi5.png", fixedCount: 198, xp: 39600, level: 21, xpToNext: 400, streak: 6, rankChange: 0, isCurrentUser: false },
    { id: "7", username: "PiProtector", avatar: "/avatars/pi9.png", fixedCount: 175, xp: 35000, level: 20, xpToNext: 1000, streak: 12, rankChange: 1, isCurrentUser: false },
    { id: "8", username: "CryptoAudit", avatar: "/avatars/pi7.png", fixedCount: 152, xp: 30400, level: 18, xpToNext: 1600, streak: 4, rankChange: -1, isCurrentUser: false },
    { id: "9", username: "NetSentinel", avatar: "/avatars/pi8.png", fixedCount: 130, xp: 26000, level: 17, xpToNext: 2000, streak: 3, rankChange: 0, isCurrentUser: false },
    { id: "10", username: "SecDev_AE", avatar: "/avatars/pi10.png", fixedCount: 108, xp: 21600, level: 15, xpToNext: 400, streak: 2, rankChange: 0, isCurrentUser: false },
  ],
};

const CATEGORY_FILTERS = ["الكل", "حرج", "مرتفع", "متوسط"] as const;

/* ── Rank Badge ───────────────────────────────────────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="text-sm font-bold text-muted-foreground w-6 text-center">
      #{rank}
    </span>
  );
}

/* ── Rank Change Indicator ────────────────────────────────────────────── */

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0)
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-0.5 text-green-400"
      >
        <TrendingUp className="size-3" />
        <span className="text-[10px] font-semibold">{change}</span>
      </motion.div>
    );
  if (change < 0)
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-0.5 text-red-400"
      >
        <TrendingDown className="size-3" />
        <span className="text-[10px] font-semibold">{Math.abs(change)}</span>
      </motion.div>
    );
  return (
    <div className="flex items-center gap-0.5 text-muted-foreground/50">
      <Minus className="size-3" />
    </div>
  );
}

/* ── XP Progress Bar ──────────────────────────────────────────────────── */

function XpBar({ current, max, level }: { current: number; max: number; level: number }) {
  const pct = Math.min((current / (current + max)) * 100, 100);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full pi-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        مستوى {level}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function GlobalLeaderboard() {
  const [period, setPeriod] = useState<"week" | "month" | "alltime">("week");
  const [category, setCategory] = useState("الكل");
  const [data, setData] = useState<Researcher[]>(MOCK_DATA.week);

  /* Fetch from API, fallback to mock */
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((json) => {
        if (!cancelled && json?.researchers?.length) {
          setData(json.researchers);
        } else {
          setData(MOCK_DATA[period]);
        }
      })
      .catch(() => {
        if (!cancelled) setData(MOCK_DATA[period]);
      });

    return () => { cancelled = true; };
  }, [period]);

  /* Filter by category (simulated — in real API this would be server-side) */
  const filtered = useMemo(() => {
    if (category === "الكل") return data;
    const multipliers: Record<string, number> = {
      "حرج": 0.3,
      "مرتفع": 0.6,
      "متوسط": 0.8,
    };
    const m = multipliers[category] || 1;
    return data
      .map((r) => ({
        ...r,
        fixedCount: Math.round(r.fixedCount * m * (1 + (category === "حرج" ? 0.4 : 0))),
      }))
      .sort((a, b) => b.fixedCount - a.fixedCount)
      .map((r, i) => ({ ...r, rankChange: r.rankChange }));
  }, [data, category]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 ${CARD_DEPTH}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <PiSectionHeader icon={<Trophy className="size-4" />}>
          لوحة المتصدرين
        </PiSectionHeader>
        <div className="flex items-center gap-1">
          <Flame className="size-3.5 text-orange-400" />
          <span className="text-[11px] text-muted-foreground">أفضل الباحثين</span>
        </div>
      </div>

      {/* Period Tabs */}
      <Tabs
        value={period}
        onValueChange={(v) => setPeriod(v as typeof period)}
        className="mb-4"
      >
        <TabsList className="w-full bg-white/[0.03] border border-white/[0.06] h-8">
          <TabsTrigger value="week" className="text-xs flex-1">
            هذا الأسبوع
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs flex-1">
            هذا الشهر
          </TabsTrigger>
          <TabsTrigger value="alltime" className="text-xs flex-1">
            كل الأوقات
          </TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="mt-0">
          {/* Category Filters */}
          <div className="flex items-center gap-2 mb-4">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  category === cat
                    ? "pi-gradient text-white border-transparent"
                    : "border-white/[0.06] text-muted-foreground hover:text-foreground hover:border-white/[0.12]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Leaderboard List */}
          <ScrollArea className="max-h-96">
            <div className="space-y-1.5 pr-1">
              <AnimatePresence mode="popLayout">
                {filtered.map((researcher, idx) => {
                  const rank = idx + 1;
                  return (
                    <motion.div
                      key={researcher.id}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        researcher.isCurrentUser
                          ? "bg-purple-500/10 border border-purple-500/20"
                          : "hover:bg-white/[0.03] border border-transparent"
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 flex justify-center shrink-0">
                        <RankBadge rank={rank} />
                      </div>

                      {/* Avatar */}
                      <Avatar className="size-8 border border-white/[0.1]">
                        <AvatarImage src={researcher.avatar} alt={researcher.username} />
                        <AvatarFallback className="text-[10px] font-semibold bg-purple-500/20 text-purple-300">
                          {researcher.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${researcher.isCurrentUser ? "text-purple-300" : ""}`}>
                            {researcher.username}
                          </span>
                          {researcher.isCurrentUser && (
                            <Badge className="pi-gradient text-[9px] px-1.5 py-0 border-0 h-4">
                              أنت
                            </Badge>
                          )}
                          {rank === 1 && (
                            <Crown className="size-3.5 text-yellow-400" />
                          )}
                        </div>
                        <XpBar
                          current={researcher.xp - researcher.xpToNext}
                          max={researcher.xpToNext}
                          level={researcher.level}
                        />
                      </div>

                      {/* Stats */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{researcher.fixedCount}</span>
                          <span className="text-[10px] text-muted-foreground">إصلاح</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <RankChangeIndicator change={researcher.rankChange} />
                          <div className="flex items-center gap-0.5 text-orange-400">
                            <Flame className="size-2.5" />
                            <span className="text-[10px] font-semibold">{researcher.streak}ي</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}