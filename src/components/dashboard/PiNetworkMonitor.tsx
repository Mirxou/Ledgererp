"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity, Users, Smartphone, Star, Rocket,
  ShieldCheck, Clock, Zap, Box, TrendingUp,
  Trophy, Eye, Lock, GraduationCap,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { DonutChart } from "@/components/charts/DonutChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { ComparisonBar } from "@/components/charts/ComparisonBar";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface PiStatsResponse {
  network: {
    totalPioneers: number;
    kycVerified: number;
    mainnetApps: number;
    testnetApps: number;
    dailyActiveUsers: number;
  };
  price: { piUsd: number; marketCap: number; testnetValue: string };
  ledgererp: {
    auditScore: number;
    totalIssues: number;
    fixedIssues: number;
    inProgress: number;
    complianceScore: number;
    deploymentReady: boolean;
  };
  ecosystem: {
    categories: { name: string; count: number; growth: number }[];
    topApps: { name: string; category: string; users: string; rating: number }[];
    recentActivity: { type: string; text: string; time: string }[];
  };
  liveMetrics: {
    tps: number;
    blockHeight: number;
    mempoolSize: number;
    networkHealth: string;
    uptime: string;
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   ANIMATED NUMBER with live refresh support
   ════════════════════════════════════════════════════════════════════════════ */

function LiveNumber({ value, format = "number" }: { value: number; format?: "number" | "compact" }) {
  if (format === "compact") {
    if (value >= 1_000_000) return <span>{(value / 1_000_000).toFixed(1)}M</span>;
    if (value >= 1_000) return <span>{(value / 1_000).toFixed(0)}K</span>;
  }
  return <span>{value.toLocaleString("ar-EG")}</span>;
}

/* ════════════════════════════════════════════════════════════════════════════
   ACTIVITY ICONS
   ════════════════════════════════════════════════════════════════════════════ */

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "app_launch": return <Rocket className="h-4 w-4 text-purple-500" />;
    case "milestone": return <Trophy className="h-4 w-4 text-amber-500" />;
    case "security": return <Lock className="h-4 w-4 text-green-500" />;
    case "kyc": return <ShieldCheck className="h-4 w-4 text-sky-500" />;
    default: return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   STAR RATING
   ════════════════════════════════════════════════════════════════════════════ */

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
      <span className="text-[11px] text-muted-foreground mr-1">{rating}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SKELETON LOADING
   ════════════════════════════════════════════════════════════════════════════ */

function MonitorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Network health bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex gap-6 mt-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        ))}
      </div>
      {/* Table */}
      <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      {/* Chart */}
      <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function PiNetworkMonitor() {
  const { data, isLoading, dataUpdatedAt } = useQuery<PiStatsResponse>({
    queryKey: ["pi-stats"],
    queryFn: async () => {
      const res = await fetch("/api/pi-stats");
      if (!res.ok) throw new Error("فشل في جلب بيانات الشبكة");
      return res.json();
    },
    refetchInterval: 10000,
  });

  if (isLoading || !data) return <MonitorSkeleton />;

  const { network, ledgererp, ecosystem, liveMetrics } = data;

  return (
    <div className="space-y-6">
      {/* ═══ SECTION 1: NETWORK HEALTH BAR ═══ */}
      <Card className="overflow-hidden border-purple-200/40 dark:border-purple-900/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {/* Pulse dot */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                صحة الشبكة: {liveMetrics.networkHealth}
              </span>
            </div>
            {/* LIVE badge */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">مباشر</span>
              <span className="text-[10px] text-muted-foreground" dir="ltr">
                {new Date(dataUpdatedAt).toLocaleTimeString("ar-EG")}
              </span>
            </div>
          </div>

          {/* Live metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <LiveMetricCard
              icon={<Zap className="h-4 w-4 text-amber-500" />}
              label="TPS"
              value={String(liveMetrics.tps)}
              color="text-amber-600 dark:text-amber-400"
            />
            <LiveMetricCard
              icon={<Box className="h-4 w-4 text-purple-500" />}
              label="ارتفاع الكتلة"
              value={liveMetrics.blockHeight.toLocaleString("ar-EG")}
              color="text-purple-600 dark:text-purple-400"
            />
            <LiveMetricCard
              icon={<Activity className="h-4 w-4 text-sky-500" />}
              label="ذاكرة الم transactions"
              value={String(liveMetrics.mempoolSize)}
              color="text-sky-600 dark:text-sky-400"
            />
            <LiveMetricCard
              icon={<ShieldCheck className="h-4 w-4 text-green-500" />}
              label="وقت التشغيل"
              value={liveMetrics.uptime}
              color="text-green-600 dark:text-green-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 2: ECOSYSTEM OVERVIEW GRID ═══ */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Card 1: Pi Community */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <PiSectionHeader icon={<Users className="h-4 w-4" />}>مجتمع Pi</PiSectionHeader>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg sm:text-xl font-bold pi-gradient-text">60M+</p>
                <p className="text-[10px] text-muted-foreground">المستكشفون</p>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-400">18M+</p>
                <p className="text-[10px] text-muted-foreground">تم التحقق (KYC)</p>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">4.2M</p>
                <p className="text-[10px] text-muted-foreground">نشط يومياً</p>
              </div>
            </div>
            <div className="flex justify-center">
              <DonutChart
                data={[
                  { label: "تم التحقق", value: network.kycVerified, color: "oklch(0.65 0.20 230)" },
                  { label: "غير مُتحقق", value: network.totalPioneers - network.kycVerified, color: "oklch(0.70 0.03 260)" },
                ]}
                size={160}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Mainnet Apps */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <PiSectionHeader icon={<Smartphone className="h-4 w-4" />} count={network.mainnetApps}>
              تطبيقات النظام الرئيسي
            </PiSectionHeader>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-[10px]">
                {network.mainnetApps} تطبيق رئيسي
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {network.testnetApps} تطبيق تجريبي
              </Badge>
            </div>
            <HorizontalBarChart
              data={ecosystem.categories.map((c) => ({
                label: c.name,
                value: c.count,
                color: "oklch(0.55 0.25 295)",
              }))}
            />
          </CardContent>
        </Card>

        {/* Card 3: Ledgererp Performance */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <PiSectionHeader icon={<Eye className="h-4 w-4" />}>أداء Ledgererp</PiSectionHeader>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 justify-center">
              <ScoreRing score={ledgererp.auditScore} label="درجة التدقيق" size={90} />
              <ScoreRing score={ledgererp.complianceScore} label="التوافق مع بي" size={90} />
            </div>

            {/* Issues progress */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50/70 dark:bg-red-950/15 border border-red-200/40 dark:border-red-900/30">
              <span className="text-xs text-red-600 dark:text-red-400 font-bold">
                {ledgererp.fixedIssues}/{ledgererp.totalIssues}
              </span>
              <span className="text-xs text-muted-foreground">مشاكل تم إصلاحها</span>
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-[10px] mr-auto">
                غير جاهز للنشر
              </Badge>
            </div>

            {/* Comparison bar */}
            <ComparisonBar
              data={[
                { label: "جودة الكود", value: 22, average: 68 },
                { label: "الأمان", value: 15, average: 72 },
                { label: "التوافق مع بي", value: 18, average: 65 },
                { label: "البنية التحتية", value: 34, average: 60 },
              ]}
            />
          </CardContent>
        </Card>

        {/* Card 4: Ecosystem Activity */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <PiSectionHeader icon={<TrendingUp className="h-4 w-4" />}>نشاط الإيكوسيستم</PiSectionHeader>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ecosystem.recentActivity.map((act, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 transition-all hover:bg-muted/50"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <ActivityIcon type={act.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">{act.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      منذ {act.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ SECTION 3: TOP APPS LEADERBOARD ═══ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <PiSectionHeader icon={<GraduationCap className="h-4 w-4" />}>أفضل التطبيقات على شبكة بي</PiSectionHeader>
          <CardDescription className="text-[11px]">أعلى 5 تطبيقات حسب عدد المستخدمين والتقييم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span className="w-6 text-center">#</span>
              <span>الاسم</span>
              <span className="hidden sm:block w-20 text-center">الفئة</span>
              <span className="w-16 text-center">المستخدمون</span>
              <span className="w-28">التقييم</span>
            </div>

            {/* App rows */}
            {ecosystem.topApps.map((app, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-3 py-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{app.name}</p>
                </div>
                <span className="hidden sm:block w-20 text-center">
                  <Badge variant="outline" className="text-[10px]">{app.category}</Badge>
                </span>
                <span className="w-16 text-center text-xs font-medium text-muted-foreground">{app.users}</span>
                <div className="w-28"><StarRating rating={app.rating} /></div>
              </div>
            ))}

            {/* Ledgererp entry */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-3 py-2.5 rounded-lg border border-orange-200/50 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/15">
              <span className="w-6 text-center text-sm font-bold text-orange-500">6</span>
              <div className="min-w-0 flex items-center gap-2">
                <p className="text-sm font-semibold truncate">Ledgererp</p>
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 text-[9px]">
                  تحت المراجعة
                </Badge>
              </div>
              <span className="hidden sm:block w-20 text-center">
                <Badge variant="outline" className="text-[10px]">التجارة</Badge>
              </span>
              <span className="w-16 text-center text-xs font-medium text-muted-foreground">~50K</span>
              <div className="w-28"><StarRating rating={2.6} /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 4: ECOSYSTEM CATEGORIES CHART ═══ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <PiSectionHeader icon={<Activity className="h-4 w-4" />}>توزيع فئات الإيكوسيستم</PiSectionHeader>
          <CardDescription className="text-[11px]">عدد التطبيقات حسب الفئة مع معدل النمو</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ecosystem.categories.map((cat, i) => {
              const maxCount = Math.max(...ecosystem.categories.map((c) => c.count));
              const pct = (cat.count / maxCount) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-32 sm:w-40 text-right flex-shrink-0 truncate">
                    {cat.name}
                  </span>
                  <div className="flex-1 h-7 bg-muted/30 rounded-md overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 right-0 rounded-md transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, oklch(0.55 0.25 ${295 + i * 8}), oklch(0.70 0.18 ${80 + i * 10}))`,
                        transitionDelay: `${i * 80}ms`,
                      }}
                    />
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[10px] font-bold z-10">
                      {cat.count}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 w-14">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                      {cat.growth}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LIVE METRIC CARD (mini card inside health bar)
   ════════════════════════════════════════════════════════════════════════════ */

function LiveMetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/40">
      {icon}
      <div className="min-w-0">
        <p className={`text-sm font-bold tabular-nums ${color} transition-all duration-500`}>{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}