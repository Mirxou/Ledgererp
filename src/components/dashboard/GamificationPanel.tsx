"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Star, Shield, Lock, Flame, Crown, Medal,
  Wrench, ShieldCheck, Bug, Sparkles, Globe, ChevronLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type AchievementProgress,
  type GamificationStats,
  type UserProfile,
  calculateLevel,
  getXpForNextLevel,
  getLevelTitle,
  ACHIEVEMENTS,
} from "@/lib/gamification";

/* ── Icon Map ─────────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy, Star, Shield, Lock, Flame, Crown, Medal,
  Wrench, ShieldCheck, Bug, Sparkles, Globe,
};

/* ── Types ─────────────────────────────────────────────────────────────── */

interface GamificationResponse {
  profile: UserProfile;
  stats: GamificationStats;
  achievements: AchievementProgress[];
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function GamificationPanel() {
  const { data, isLoading } = useQuery<GamificationResponse>({
    queryKey: ["gamification"],
    queryFn: async () => {
      const res = await fetch("/api/gamification");
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading || !data) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-full aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { profile, stats, achievements } = data;
  const { currentXp, xpForNext, progress } = getXpForNextLevel(profile.xp);
  const levelTitle = getLevelTitle(profile.level);
  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <Card className="overflow-hidden">
      {/* ── Level Section ─────────────────────────────────────────── */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <Crown className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-sm font-bold">
                المستوى {profile.level}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground font-medium">{levelTitle}</p>
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
              <Flame className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{profile.streak}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">أيام متتالية</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        {/* ── XP Bar ──────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">
              {currentXp} / {xpForNext} XP
            </span>
            <Badge variant="secondary" className="text-[9px] h-5 px-1.5 gap-1 font-bold">
              <Star className="h-2.5 w-2.5 text-amber-500" />
              {profile.xp} XP
            </Badge>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-amber-400 via-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "حرج", count: stats.criticalFixed, xp: stats.xpBreakdown.critical, color: "text-red-500" },
            { label: "مرتفع", count: stats.highFixed, xp: stats.xpBreakdown.high, color: "text-orange-500" },
            { label: "متوسط", count: stats.mediumFixed, xp: stats.xpBreakdown.medium, color: "text-amber-500" },
            { label: "منخفض", count: stats.lowFixed, xp: stats.xpBreakdown.low, color: "text-sky-500" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className={`text-xs font-bold ${s.color}`}>{s.count}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium leading-tight">{s.label}</p>
                <p className="text-[9px] text-muted-foreground">+{s.xp} XP</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Achievements ────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <Medal className="h-3.5 w-3.5 text-amber-500" />
              الإنجازات
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {unlockedCount} / {achievements.length}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {achievements.map((ap, i) => {
              const IconComp = ICON_MAP[ap.achievement.icon] || Shield;
              return (
                <Tooltip key={ap.achievement.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className="relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      style={{
                        background: ap.isUnlocked
                          ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))"
                          : "rgba(128,128,128,0.08)",
                        boxShadow: ap.isUnlocked
                          ? "0 0 12px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
                          : "none",
                      }}
                    >
                      {ap.isUnlocked ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, delay: i * 0.05 + 0.1 }}
                        >
                          <IconComp className="h-5 w-5 text-amber-500" />
                        </motion.div>
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground/40" />
                      )}

                      {/* Progress bar at bottom of badge */}
                      {!ap.isUnlocked && ap.progress > 0 && (
                        <div className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded-full bg-muted-foreground/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500/60"
                            style={{ width: `${ap.progress * 100}%` }}
                          />
                        </div>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-right">
                    <p className="font-bold text-xs">{ap.achievement.titleAr}</p>
                    <p className="text-[10px] mt-0.5 opacity-80">{ap.achievement.descriptionAr}</p>
                    {!ap.isUnlocked && (
                      <p className="text-[9px] mt-1 opacity-60">
                        {ap.current} / {ap.total}
                      </p>
                    )}
                    {ap.isUnlocked && (
                      <p className="text-[9px] mt-1 text-green-400">✓ مفتوح</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* ── Total Fixed ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-l from-green-500/10 to-emerald-500/5 border border-green-500/20">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-green-500" />
            <span className="text-xs font-bold">إجمالي الإصلاحات</span>
          </div>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">{stats.totalFixed}</span>
        </div>
      </CardContent>
    </Card>
  );
}