"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import {
  ShieldAlert, ShieldX, ShieldCheck, AlertTriangle, Bug, Code2,
  Server, Globe, LayoutGrid, FileWarning, Terminal, Lock, Eye,
  XCircle, CheckCircle2, ChevronDown, ChevronUp,
  ExternalLink, Github, Zap, Target, Layers, Cpu, Gauge,
  BarChart3, Search, Download, Filter, FileCode2,
  Clock, Hash, Radio, CircleDot, TriangleAlert, Copy, Check,
  PieChart, Activity, Flame, FolderOpen,
  Sun, Moon, FileJson, FileSpreadsheet, ClipboardList, PanelLeft,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface Issue {
  id: string; source: string; file: string; line: number; category: string;
  title: string; description: string; recommendation: string;
}
interface IssueBrief {
  id: string; source: string; file: string; line?: number; category: string; title: string;
}
interface AuditReport {
  meta: { projectName: string; repository: string; description: string; auditDate: string; totalFiles: number; totalLines: string; techStack: string[] };
  scores: {
    backend: { codeQuality: number; security: number; architecture: number; overall: number };
    frontend: { codeQuality: number; security: number; piCompliance: number; overall: number };
    piNetwork: { manifestCompliance: number; domainVerification: number; apiKeyManagement: number; paymentFlow: number; kycKyb: number; deploymentReadiness: number; nonCustodial: number; overall: number };
    overall: number;
  };
  summary: { totalIssues: number; critical: number; high: number; medium: number; low: number; blockingDeployment: number };
  criticalFindings: Issue[];
  highIssues: IssueBrief[];
  mediumIssues: IssueBrief[];
  piNetworkCompliance: { blockingIssues: string[]; manifestIssues: string[]; deploymentIssues: string[]; securityHeaders: string[] };
  codeQuality: { largestFiles: { file: string; size: number; lines: number }[]; todoFixme: { file: string; text: string }[]; emptyFiles: string[]; incompleteFiles: string[] };
  architectureProblems: { title: string; description: string }[];
  recommendations: { priority: number; title: string; effort: string; impact: string }[];
  categoryBreakdown: { category: string; critical: number; high: number; medium: number; low: number; total: number }[];
  fileHeatmap: { file: string; critical: number; high: number; medium: number; low: number; total: number }[];
}

/* ════════════════════════════════════════════════════════════════════════════
   SHARED CARD CLASSES
   ════════════════════════════════════════════════════════════════════════════ */

const CARD_DEPTH =
  "shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] " +
  "dark:bg-gradient-to-b dark:from-[oklch(0.22_0_0)] dark:to-[oklch(0.18_0_0)] " +
  "hover:dark:shadow-[0_2px_6px_rgba(0,0,0,0.5),0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] " +
  "hover:-translate-y-[1px] transition-all duration-300";

const GLASS_STAT =
  "dark:bg-white/[0.03] dark:backdrop-blur-xl dark:border-white/[0.06] " + CARD_DEPTH;

/* ════════════════════════════════════════════════════════════════════════════
   SCORE COLOR HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

function getScoreColors(score: number) {
  if (score >= 81) return { stroke: "#16a34a", bg: "rgba(22,163,74,0.08)", text: "text-green-600 dark:text-green-400", glow: "rgba(22,163,74,0.3)", bgClass: "bg-green-50/20 dark:bg-green-50/20" };
  if (score >= 61) return { stroke: "#059669", bg: "rgba(5,150,105,0.08)", text: "text-emerald-500 dark:text-emerald-400", glow: "rgba(5,150,105,0.3)", bgClass: "bg-emerald-50/20 dark:bg-emerald-50/20" };
  if (score >= 41) return { stroke: "#d97706", bg: "rgba(217,119,6,0.08)", text: "text-amber-500 dark:text-amber-400", glow: "rgba(217,119,6,0.3)", bgClass: "bg-amber-50/20 dark:bg-amber-50/20" };
  if (score >= 26) return { stroke: "#ea580c", bg: "rgba(234,88,12,0.08)", text: "text-orange-500 dark:text-orange-400", glow: "rgba(234,88,12,0.3)", bgClass: "bg-orange-50/20 dark:bg-orange-50/20" };
  return { stroke: "#dc2626", bg: "rgba(220,38,38,0.08)", text: "text-red-600 dark:text-red-400", glow: "rgba(220,38,38,0.3)", bgClass: "bg-red-50/20 dark:bg-red-50/20" };
}

function getProgressColors(value: number) {
  if (value >= 81) return { text: "text-green-600 dark:text-green-400", bar: "[&>div]:bg-green-500" };
  if (value >= 61) return { text: "text-emerald-600 dark:text-emerald-400", bar: "[&>div]:bg-emerald-500" };
  if (value >= 41) return { text: "text-amber-600 dark:text-amber-400", bar: "[&>div]:bg-amber-500" };
  if (value >= 26) return { text: "text-orange-600 dark:text-orange-400", bar: "[&>div]:bg-orange-500" };
  return { text: "text-red-600 dark:text-red-400", bar: "[&>div]:bg-red-500" };
}

/* ════════════════════════════════════════════════════════════════════════════
   ANIMATED NUMBER
   ════════════════════════════════════════════════════════════════════════════ */

function AnimatedNumber({ value, duration = 1200, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, duration, delay]);

  return <span>{display}</span>;
}

/* ════════════════════════════════════════════════════════════════════════════
   SCORE RING (SVG)
   ════════════════════════════════════════════════════════════════════════════ */

function ScoreRing({ score, label, size = 110, showAnimated = true }: { score: number; label: string; size?: number; showAnimated?: boolean }) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = getScoreColors(score);
  const filterId = `glow-${label.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-").toLowerCase()}`;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={`relative rounded-full p-2.5 ${colors.bgClass}`} style={{ background: colors.bg }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <filter id={filterId}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="5.5" className="text-muted-foreground/20" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            strokeWidth="5.5" strokeLinecap="round"
            stroke={colors.stroke}
            className="transition-all duration-1000 ease-out"
            style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            strokeWidth="5.5" strokeLinecap="round"
            stroke={colors.stroke}
            className="hidden dark:block transition-all duration-1000 ease-out"
            style={{ strokeDasharray: circumference, strokeDashoffset: offset, filter: `drop-shadow(0 0 8px ${colors.glow})` }}
            aria-hidden="true"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold ${colors.text}`} style={{ fontSize: size * 0.22 }}>
          {showAnimated ? <AnimatedNumber value={score} /> : score}
        </span>
      </div>
      <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight max-w-[120px]">{label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SVG DONUT CHART
   ════════════════════════════════════════════════════════════════════════════ */

function DonutChart({ data, size = 180 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2, cy = size / 2, r = size / 2 - 24, sw = 18;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(() =>
    data.map((d, idx) => {
      const pct = d.value / total;
      const accumulatedBefore = data.slice(0, idx).reduce((s, x) => s + x.value / total, 0);
      return { ...d, dashLen: pct * circumference, dashOffset: -accumulatedBefore * circumference, pct };
    }),
    [data, total, circumference]
  );

  if (total === 0) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">لا توجد بيانات</div>;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted-foreground/10" />
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" strokeWidth={sw} strokeLinecap="butt"
            stroke={s.color} strokeDasharray={`${s.dashLen} ${circumference - s.dashLen}`}
            strokeDashoffset={s.dashOffset}
            className="transition-all duration-700 ease-out" style={{ transitionDelay: `${i * 100}ms` }}
          />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   HORIZONTAL BAR CHART (SVG)
   ════════════════════════════════════════════════════════════════════════════ */

function HorizontalBarChart({ data, maxItems = 10 }: { data: { label: string; value: number; color: string }[]; maxItems?: number }) {
  const items = data.slice(0, maxItems);
  const maxVal = Math.max(...items.map((d) => d.value), 1);
  const barH = 22, gap = 6, labelW = 160, valueW = 36, padRight = 8;
  const barAreaW = 280;
  const svgW = labelW + barAreaW + valueW + padRight;
  const svgH = items.length * (barH + gap) + 4;

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
      {items.map((d, i) => {
        const y = i * (barH + gap);
        const w = Math.max((d.value / maxVal) * barAreaW, 2);
        return (
          <g key={i} className="transition-all duration-500" style={{ transitionDelay: `${i * 60}ms` }}>
            <text x={labelW - 8} y={y + barH / 2 + 1} textAnchor="end" fontSize="10" fill="currentColor" className="fill-muted-foreground">
              {d.label.length > 24 ? d.label.slice(0, 22) + "\u2026" : d.label}
            </text>
            <rect x={labelW} y={y} width={w} height={barH} rx={4} fill={d.color} opacity={0.85} />
            <text x={labelW + w + 8} y={y + barH / 2 + 1} fontSize="11" fontWeight="600" fill="currentColor" className="fill-foreground">
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BADGES
   ════════════════════════════════════════════════════════════════════════════ */

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    CRITICAL: { cls: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400 dark:border-red-500/40", icon: <XCircle className="h-3 w-3" />, label: "حرج" },
    HIGH: { cls: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:border-orange-500/40", icon: <AlertTriangle className="h-3 w-3" />, label: "مرتفع" },
    MEDIUM: { cls: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/40", icon: <ShieldAlert className="h-3 w-3" />, label: "متوسط" },
    LOW: { cls: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400 dark:border-sky-500/40", icon: <ShieldCheck className="h-3 w-3" />, label: "منخفض" },
  };
  const v = map[severity] || map.LOW;
  return <Badge variant="outline" className={`${v.cls} gap-1 text-[10px] font-semibold px-2 py-0.5`}>{v.icon}{v.label}</Badge>;
}

function SourceBadge({ source }: { source: string }) {
  const labels: Record<string, string> = { Backend: "الخادم", Frontend: "الواجهة", "Pi Network": "شبكة بي" };
  const c: Record<string, string> = {
    Backend: "bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400",
    Frontend: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400",
    "Pi Network": "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
  };
  return <Badge variant="outline" className={`${c[source] || ""} text-[10px] font-semibold px-2 py-0.5`}>{labels[source] || source}</Badge>;
}

/* ════════════════════════════════════════════════════════════════════════════
   STAT CARD
   ════════════════════════════════════════════════════════════════════════════ */

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: React.ElementType; label: string; value: number; sub?: string; color: string; delay?: number;
}) {
  return (
    <Card className={`relative overflow-hidden border-0 ${GLASS_STAT}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-black tracking-tight leading-none"><AnimatedNumber value={value} duration={800} delay={delay} /></p>
            <p className="text-[10px] font-medium text-muted-foreground mt-1 truncate">{label}</p>
            {sub && <p className="text-[9px] text-muted-foreground/60 mt-0.5 truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LABELED PROGRESS BAR
   ════════════════════════════════════════════════════════════════════════════ */

function LabeledProgress({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  const colors = getProgressColors(value);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-xs font-bold ${colors.text}`}>{value}<span className="text-muted-foreground/60 font-normal">/100</span></span>
      </div>
      <Progress value={value} className={`h-2 ${colors.bar}`} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ISSUE DETAIL SHEET
   ════════════════════════════════════════════════════════════════════════════ */

function IssueDetailSheet({ issue, open, onOpenChange, repoUrl, severity = "CRITICAL", isBrief = false }: {
  issue: Issue | null; open: boolean; onOpenChange: (v: boolean) => void; repoUrl: string; severity?: string; isBrief?: boolean;
}) {
  if (!issue) return null;
  const sev = severity.toUpperCase();
  const sevColor: Record<string, string> = {
    CRITICAL: "text-red-500", HIGH: "text-orange-500", MEDIUM: "text-amber-500", LOW: "text-sky-500",
  };
  const githubUrl = `${repoUrl.replace(/\/?$/, "")}/blob/main/${issue.file}${issue.line > 0 ? `#L${issue.line}` : ""}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto dark:bg-gradient-to-b dark:from-[oklch(0.20_0_0)] dark:to-[oklch(0.16_0_0)]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base leading-snug pr-8">{issue.title}</SheetTitle>
          <SheetDescription className="sr-only">تفاصيل المشكلة {issue.id}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={sev} />
            <SourceBadge source={issue.source} />
            <Badge variant="outline" className="text-[10px] font-medium bg-muted-foreground/10">{issue.category}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted-foreground/5 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">رقم المشكلة</p>
              <p className="text-sm font-mono font-semibold">{issue.id}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted-foreground/5 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">الخطورة</p>
              <p className={`text-sm font-semibold ${sevColor[sev] || "text-red-500"}`}>{sev}</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-muted-foreground/5 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">المصدر</p>
              <p className="text-sm font-semibold">{issue.source}</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-muted-foreground/5 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">الملف</p>
              <p className="text-sm font-mono break-all">{issue.file}{issue.line > 0 ? ` : ${issue.line}` : ""}</p>
            </div>
          </div>
          <Separator />
          {isBrief ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />تفاصيل محدودة
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                الوصف والتوصية الكاملة متاحان في التقرير المُصدَّر. استخدم خيار تصدير JSON أو CSV للحصول على بيانات التدقيق الكاملة.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">الوصف</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />التوصية
                </h4>
                <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">{issue.recommendation}</p>
              </div>
              <Separator />
              <a
                href={githubUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors min-h-[44px] py-2"
                aria-label={`عرض ${issue.file} على GitHub`}
              >
                <Github className="h-4 w-4" />
                عرض على GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CRITICAL ISSUE CARD
   ════════════════════════════════════════════════════════════════════════════ */

function CriticalIssueCard({ issue, index, onSelect }: { issue: Issue; index: number; onSelect: (issue: Issue) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isBlocking = index < 7;

  return (
    <div
      role="button" tabIndex={0}
      aria-label={`مشكلة حرجة ${index + 1}: ${issue.title}`}
      onClick={() => onSelect(issue)}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(issue); }}
      className={`border rounded-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
        isBlocking
          ? "border-red-200 bg-gradient-to-br from-red-50/80 to-white dark:from-red-950/30 dark:to-red-950/10 dark:border-red-900/50"
          : "border-orange-200 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-orange-950/5 dark:border-orange-900/40"
      } ${CARD_DEPTH}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
            isBlocking ? "bg-red-100 text-red-600 dark:bg-red-900/60 dark:text-red-300" : "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300"
          }`}>
            {index + 1}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <SeverityBadge severity="CRITICAL" />
            <SourceBadge source={issue.source} />
            <Badge variant="outline" className="text-[10px] font-medium bg-muted-foreground/10">{issue.category}</Badge>
            {isBlocking && <Badge className="bg-red-600 text-white text-[10px] px-2 py-0 animate-pulse">يعطل النشر</Badge>}
          </div>
          <h4 className="font-semibold text-sm mb-1.5 leading-snug">{issue.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2.5">
            <Code2 className="h-3 w-3 flex-shrink-0" />
            <code className="text-xs font-mono break-all">{issue.file}</code>
            {issue.line > 0 && <span className="text-muted-foreground/60">سطر {issue.line}</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{issue.description}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-xs text-primary hover:text-primary/80 hover:underline flex items-center gap-1 transition-colors min-h-[44px] py-1"
            aria-label={expanded ? "إخفاء التوصية" : "عرض التوصية"}
          >
            {expanded ? <>إخفاء التوصية <ChevronUp className="h-3 w-3" /></> : <>عرض التوصية <ChevronDown className="h-3 w-3" /></>}
          </button>
          {expanded && (
            <div className="mt-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {issue.recommendation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ISSUE ROW (for High/Medium)
   ════════════════════════════════════════════════════════════════════════════ */

function IssueRow({ issue, onClick }: { issue: IssueBrief & { severity?: string }; onClick?: () => void }) {
  return (
    <div
      role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick?.(); }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted-foreground/5 transition-colors group cursor-pointer min-h-[44px]"
      aria-label={`مشكلة: ${issue.title}`}
    >
      <SourceBadge source={issue.source} />
      <span className="text-xs font-medium truncate flex-1 group-hover:text-foreground transition-colors">{issue.title}</span>
      <code className="text-[11px] font-mono text-muted-foreground flex-shrink-0 w-36 truncate hidden sm:block text-left" dir="ltr">{issue.file}</code>
      <PanelLeft className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LOADING SKELETON
   ════════════════════════════════════════════════════════════════════════════ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECURITY ZONES CONFIG
   ════════════════════════════════════════════════════════════════════════════ */

const SECURITY_ZONES = [
  { title: "ثغرات XSS", icon: Bug, filter: ["XSS"], color: "text-red-500" },
  { title: "المصادقة والتفويض", icon: Lock, filter: ["Authentication", "Authorization"], color: "text-orange-500" },
  { title: "مشاكل التشفير", icon: Terminal, filter: ["Cryptography", "Hardcoded Secret", "Weak Cryptography"], color: "text-amber-500" },
  { title: "التخزين والبيانات غير الآمنة", icon: Eye, filter: ["Insecure Storage"], color: "text-sky-500" },
  { title: "هجمات postMessage", icon: Radio, filter: ["postMessage"], color: "text-violet-500" },
  { title: "أخطاء وقت التشغيل", icon: TriangleAlert, filter: ["Runtime"], color: "text-rose-500" },
  { title: "تسريب المعلومات", icon: Eye, filter: ["Info Disclosure", "Token Exposure"], color: "text-cyan-500" },
  { title: "التحايل على KYC", icon: ShieldX, filter: ["Fake KYC", "KYC"], color: "text-red-400" },
  { title: "هيكلية حضانة", icon: ShieldX, filter: ["Custodial"], color: "text-red-600" },
  { title: "سلسلة التوريد", icon: Globe, filter: ["Supply Chain"], color: "text-emerald-500" },
  { title: "مشاكل النشر", icon: Server, filter: ["Deployment", "Rate Limiting"], color: "text-orange-400" },
];

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════════════ */

export default function AuditDashboard() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState("CRITICAL");
  const [selectedIsBrief, setSelectedIsBrief] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState<Record<string, boolean>>({
    "ثغرات XSS": true,
    "المصادقة والتفويض": true,
    "مشاكل التشفير": true,
    "التخزين والبيانات غير الآمنة": true,
  });
  const { theme, setTheme } = useTheme();

  /* ── Fetch ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setReport(d); setLoading(false); })
      .catch((err) => { console.error("Failed to load audit data:", err); setLoading(false); });
  }, []);

  /* ── Export ────────────────────────────────────────────────────────── */

  const handleExport = useCallback((format: "json" | "csv" | "clipboard") => {
    if (!report) return;
    const criticalExport = report.criticalFindings.map((i) => ({
      id: i.id, severity: "critical", source: i.source, file: i.file,
      line: i.line, category: i.category, title: i.title,
      description: i.description, recommendation: i.recommendation,
    }));
    const highExport = report.highIssues.map((i) => ({
      id: i.id, severity: "high", source: i.source, file: i.file,
      line: i.line || 0, category: i.category, title: i.title,
    }));
    const all = [...criticalExport, ...highExport];

    if (format === "json") {
      const blob = new Blob([JSON.stringify({ meta: report.meta, summary: report.summary, issues: all }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "ledgererp-audit.json"; a.click();
      URL.revokeObjectURL(url);
    } else if (format === "csv") {
      const headers = "ID,Severity,Source,File,Line,Category,Title,Description,Recommendation";
      const rows = all.map((i) =>
        [i.id, i.severity, i.source, i.file, i.line, i.category, `"${(i.title || "").replace(/"/g, '""')}"`, `"${((i as Issue).description || "").replace(/"/g, '""')}"`, `"${((i as Issue).recommendation || "").replace(/"/g, '""')}"`].join(",")
      );
      const blob = new Blob(["\uFEFF" + headers + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "ledgererp-audit.csv"; a.click();
      URL.revokeObjectURL(url);
    } else {
      navigator.clipboard.writeText(JSON.stringify({ meta: report.meta, summary: report.summary, issues: all }, null, 2));
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  }, [report]);

  /* ── Open issue sheet ──────────────────────────────────────────────── */

  const openSheet = useCallback((issue: Issue, severity: string, isBrief = false) => {
    setSelectedIssue(issue);
    setSelectedSeverity(severity);
    setSelectedIsBrief(isBrief);
    setSheetOpen(true);
  }, []);

  /* ── Computed data ──────────────────────────────────────────────────── */

  const donutData = useMemo(() => [
    { label: "حرج", value: report?.summary.critical ?? 0, color: "#dc2626" },
    { label: "مرتفع", value: report?.summary.high ?? 0, color: "#f97316" },
    { label: "متوسط", value: report?.summary.medium ?? 0, color: "#eab308" },
    { label: "منخفض", value: report?.summary.low ?? 0, color: "#0ea5e9" },
  ], [report]);

  const categoryBarData = useMemo(() => (report?.categoryBreakdown ?? []).map((c) => ({
    label: c.category,
    value: c.total,
    color: c.critical > 0 ? "#dc2626" : c.high > 0 ? "#f97316" : "#eab308",
  })), [report]);

  const fileHeatData = useMemo(() => (report?.fileHeatmap ?? []).map((f) => ({
    label: f.file.replace("static/", "").replace("app/", ""),
    value: f.total,
    color: f.critical > 0 ? "#dc2626" : f.high > 0 ? "#f97316" : f.critical + f.high > 3 ? "#eab308" : "#64748b",
  })).slice(0, 10), [report]);

  const filteredCritical = useMemo(() => {
    if (!report) return [];
    return report.criticalFindings.filter((i) => {
      const q = searchQuery.toLowerCase();
      if (q && !i.title.toLowerCase().includes(q) && !i.file.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      if (filterSource !== "all" && i.source !== filterSource) return false;
      return true;
    });
  }, [report, searchQuery, filterSource]);

  const filteredHigh = useMemo(() => {
    if (!report) return [];
    return report.highIssues.filter((i) => {
      const q = searchQuery.toLowerCase();
      if (q && !i.title.toLowerCase().includes(q) && !i.file.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false;
      if (filterSource !== "all" && i.source !== filterSource) return false;
      return true;
    });
  }, [report, searchQuery, filterSource]);

  const filteredMedium = useMemo(() => {
    if (!report) return [];
    return report.mediumIssues.filter((i) => {
      const q = searchQuery.toLowerCase();
      if (q && !i.title.toLowerCase().includes(q) && !i.file.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false;
      if (filterSource !== "all" && i.source !== filterSource) return false;
      return true;
    });
  }, [report, searchQuery, filterSource]);

  const verdictColor = report
    ? report.scores.overall >= 61 ? "text-green-600 dark:text-green-400"
    : report.scores.overall >= 41 ? "text-amber-600 dark:text-amber-400"
    : report.scores.overall >= 26 ? "text-orange-600 dark:text-orange-400"
    : "text-red-600 dark:text-red-400"
    : "";

  const verdictBg = report
    ? report.scores.overall >= 61 ? "from-green-50 to-green-100/50 dark:from-green-950/40 dark:to-green-950/20 border-green-200 dark:border-green-900/50"
    : report.scores.overall >= 41 ? "from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-950/20 border-amber-200 dark:border-amber-900/50"
    : report.scores.overall >= 26 ? "from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-950/20 border-orange-200 dark:border-orange-900/50"
    : "from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-950/20 border-red-200 dark:border-red-900/50"
    : "";

  const verdictText = report
    ? report.scores.overall >= 61 ? "مقبول بشروط — يحتاج تحسينات أمنية"
    : report.scores.overall >= 41 ? "ضعيف — يتطلب إصلاحات عاجلة"
    : report.scores.overall >= 26 ? "حرج — غير آمن للنشر"
    : "خطير — ثغرات قاتلة"
    : "";

  const verdictIcon = report
    ? report.scores.overall >= 61 ? <ShieldCheck className="h-6 w-6" />
    : report.scores.overall >= 41 ? <AlertTriangle className="h-6 w-6" />
    : <XCircle className="h-6 w-6" />
    : null;

  /* ── Render ────────────────────────────────────────────────────────── */

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <ShieldAlert className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">جاري تحميل تقرير التدقيق الأمني...</p>
        </div>
      </div>
      <footer className="mt-auto border-t py-6"><div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">Ledgererp — Pi Network</div></footer>
    </div>
  );

  if (!report) return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-sm text-muted-foreground">فشل تحميل بيانات التدقيق. يرجى المحاولة لاحقاً.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl">

      {/* ═══════════════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                <ShieldAlert className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold leading-tight truncate">تدقيق Ledgererp الأمني</h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block">Pi Network — Security Audit Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">تصدير</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("json")}>
                    <FileJson className="h-4 w-4 ml-2" />تصدير JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <FileSpreadsheet className="h-4 w-4 ml-2" />تصدير CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("clipboard")}>
                    {copied ? <Check className="h-4 w-4 ml-2" /> : <ClipboardList className="h-4 w-4 ml-2" />}
                    {copied ? "تم النسخ!" : "نسخ إلى الحافظة"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="تبديل السمة"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ──── VERDICT BANNER ──────────────────────────────────────── */}
        <div className={`verdict-banner rounded-2xl border p-5 sm:p-6 bg-gradient-to-l ${verdictBg} ${CARD_DEPTH}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${verdictColor}`}>
              {verdictIcon}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-right">
              <h2 className="text-lg sm:text-xl font-black mb-1">حكم الأمان العام: <span className={verdictColor}>{report.scores.overall}/100</span></h2>
              <p className="text-sm text-muted-foreground">{verdictText}</p>
            </div>
            <div className="flex-shrink-0 hidden md:flex">
              <ScoreRing score={report.scores.overall} label="النتيجة العامة" size={90} />
            </div>
          </div>
        </div>

        {/* ──── STAT CARDS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={ShieldAlert} label="إجمالي المشاكل" value={report.summary.totalIssues} sub={`${report.meta.totalFiles} ملف`} color="bg-gradient-to-br from-slate-600 to-slate-800" delay={0} />
          <StatCard icon={XCircle} label="حرج" value={report.summary.critical} sub={`${report.summary.blockingDeployment} تعطل النشر`} color="bg-gradient-to-br from-red-500 to-red-700" delay={100} />
          <StatCard icon={AlertTriangle} label="مرتفع" value={report.summary.high} color="bg-gradient-to-br from-orange-500 to-orange-700" delay={200} />
          <StatCard icon={ShieldAlert} label="متوسط" value={report.summary.medium} sub={`${report.summary.low} منخفض`} color="bg-gradient-to-br from-amber-500 to-amber-700" delay={300} />
        </div>

        {/* ──── TABS ────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex overflow-x-auto no-scrollbar">
            <TabsTrigger value="overview" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5 hidden sm:block" />نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="critical" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5">
              <Flame className="h-3.5 w-3.5 hidden sm:block" />حرج
              <Badge variant="destructive" className="text-[9px] h-4 px-1 min-w-[18px] flex items-center justify-center">{report.summary.critical}</Badge>
            </TabsTrigger>
            <TabsTrigger value="high" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5">
              <Zap className="h-3.5 w-3.5 hidden sm:block" />مرتفع
              <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[9px] h-4 px-1 min-w-[18px] flex items-center justify-center border-0">{report.summary.high}</Badge>
            </TabsTrigger>
            <TabsTrigger value="medium" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 hidden sm:block" />متوسط
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] h-4 px-1 min-w-[18px] flex items-center justify-center border-0">{report.summary.medium}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pi-network" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5">
              <Globe className="h-3.5 w-3.5 hidden sm:block" />شبكة بي
            </TabsTrigger>
          </TabsList>

          {/* ──── OVERVIEW TAB ──────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">

            {/* Score Rings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className={CARD_DEPTH}>
                <CardContent className="p-4 flex flex-col items-center">
                  <ScoreRing score={report.scores.backend.overall} label="الخادم" size={100} />
                </CardContent>
              </Card>
              <Card className={CARD_DEPTH}>
                <CardContent className="p-4 flex flex-col items-center">
                  <ScoreRing score={report.scores.frontend.overall} label="الواجهة الأمامية" size={100} />
                </CardContent>
              </Card>
              <Card className={CARD_DEPTH}>
                <CardContent className="p-4 flex flex-col items-center">
                  <ScoreRing score={report.scores.piNetwork.overall} label="شبكة بي" size={100} />
                </CardContent>
              </Card>
              <Card className={CARD_DEPTH}>
                <CardContent className="p-4 flex flex-col items-center">
                  <ScoreRing score={report.scores.overall} label="النتيجة العامة" size={100} />
                </CardContent>
              </Card>
            </div>

            {/* Backend & Frontend Scores + Donut */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4" />درجات الخادم</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LabeledProgress label="جودة الكود" value={report.scores.backend.codeQuality} />
                  <LabeledProgress label="الأمان" value={report.scores.backend.security} />
                  <LabeledProgress label="البنية" value={report.scores.backend.architecture} />
                </CardContent>
              </Card>
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" />توزيع المشاكل حسب الخطورة</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-2">
                  <DonutChart data={donutData} size={180} />
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown Chart */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />توزيع المشاكل حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full" style={{ maxHeight: 400 }}>
                  <HorizontalBarChart data={categoryBarData} />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* File Heatmap */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><FileCode2 className="h-4 w-4" />خريطة الملفات الأكثر مشاكل</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full" style={{ maxHeight: 400 }}>
                  <HorizontalBarChart data={fileHeatData} />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Security Zones (Collapsible) */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" />المناطق الأمنية</CardTitle>
                <CardDescription>انقر على أي منطقة لتوسيع المشاكل المتعلقة بها</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {SECURITY_ZONES.map((zone) => {
                  const issues = report.criticalFindings.filter((i) =>
                    zone.filter.some((f) => i.category.includes(f))
                  );
                  return (
                    <Collapsible
                      key={zone.title}
                      open={securityOpen[zone.title] ?? false}
                      onOpenChange={(v) => setSecurityOpen((p) => ({ ...p, [zone.title]: v }))}
                    >
                      <CollapsibleTrigger className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted-foreground/5 transition-colors min-h-[44px]" aria-label={zone.title}>
                        <zone.icon className={`h-4 w-4 flex-shrink-0 ${zone.color}`} />
                        <span className="text-sm font-medium flex-1 text-right">{zone.title}</span>
                        <Badge variant="outline" className="text-[10px]">{issues.length}</Badge>
                        {securityOpen[zone.title] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {issues.length > 0 ? (
                          <div className="pr-10 pb-3 space-y-1.5">
                            {issues.map((issue) => (
                              <button
                                key={issue.id}
                                onClick={() => openSheet(issue, "CRITICAL")}
                                className="w-full text-right text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-lg hover:bg-muted-foreground/5 transition-colors min-h-[36px] flex items-center gap-2"
                              >
                                <span className="font-mono text-[10px] text-muted-foreground/60">{issue.id}</span>
                                <span className="truncate flex-1">{issue.title}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="pr-10 pb-3">
                            <p className="text-xs text-muted-foreground/60 py-1">لا توجد مشاكل في هذه المنطقة</p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" />التوصيات حسب الأولوية</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full" style={{ maxHeight: 500 }}>
                  <div className="space-y-2">
                    {report.recommendations.map((rec) => (
                      <div key={rec.priority} className="flex items-start gap-3 p-3 rounded-xl bg-muted-foreground/5 border border-border/50 hover:border-border transition-colors">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{rec.priority}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-relaxed">{rec.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[9px]">
                              {rec.effort === "Small" ? "جهد صغير" : rec.effort === "Medium" ? "جهد متوسط" : "جهد كبير"}
                            </Badge>
                            <Badge variant="outline" className={`text-[9px] ${rec.impact === "Critical" ? "text-red-500 border-red-500/30" : rec.impact === "High" ? "text-orange-500 border-orange-500/30" : "text-amber-500 border-amber-500/30"}`}>
                              {rec.impact === "Critical" ? "تأثير حرج" : rec.impact === "High" ? "تأثير مرتفع" : "تأثير متوسط"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Architecture Problems */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />مشاكل البنية المعمارية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.architectureProblems.map((prob, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted-foreground/5 border border-border/50">
                    <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold mb-1">{prob.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{prob.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Code Quality */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Code2 className="h-4 w-4" />جودة الكود</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" />أكبر الملفات
                  </h4>
                  <div className="space-y-2">
                    {report.codeQuality.largestFiles.slice(0, 5).map((f) => (
                      <div key={f.file} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted-foreground/5">
                        <code className="font-mono text-muted-foreground truncate max-w-[60%]" dir="ltr">{f.file}</code>
                        <div className="flex items-center gap-3 text-muted-foreground/70 flex-shrink-0">
                          <span>{f.lines} سطر</span>
                          <span>{(f.size / 1024).toFixed(1)}KB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <FileWarning className="h-3.5 w-3.5" />ملاحظات TODO/FIXME
                  </h4>
                  <div className="space-y-2">
                    {report.codeQuality.todoFixme.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
                        <code className="font-mono text-amber-600 dark:text-amber-400 flex-shrink-0">{t.file}</code>
                        <span className="text-muted-foreground truncate">{t.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" />التقنيات المستخدمة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.meta.techStack.map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-xs px-3 py-1 font-medium">{tech}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──── CRITICAL TAB ──────────────────────────────────────── */}
          <TabsContent value="critical" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="بحث في المشاكل الحرجة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-sm"
                  aria-label="بحث في المشاكل"
                />
              </div>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="h-10 text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
                aria-label="تصفية حسب المصدر"
              >
                <option value="all">جميع المصادر</option>
                <option value="Backend">الخادم</option>
                <option value="Frontend">الواجهة</option>
                <option value="Pi Network">شبكة بي</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{filteredCritical.length} من {report.criticalFindings.length} مشكلة حرجة</p>
            <div className="space-y-4">
              {filteredCritical.map((issue, i) => (
                <CriticalIssueCard key={issue.id} issue={issue} index={i} onSelect={(iss) => openSheet(iss, "CRITICAL")} />
              ))}
            </div>
          </TabsContent>

          {/* ──── HIGH TAB ──────────────────────────────────────────── */}
          <TabsContent value="high" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="بحث في المشاكل المرتفعة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-sm"
                  aria-label="بحث في المشاكل"
                />
              </div>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="h-10 text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
                aria-label="تصفية حسب المصدر"
              >
                <option value="all">جميع المصادر</option>
                <option value="Backend">الخادم</option>
                <option value="Frontend">الواجهة</option>
                <option value="Pi Network">شبكة بي</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{filteredHigh.length} من {report.highIssues.length} مشكلة مرتفعة</p>
            <Card className={CARD_DEPTH}>
              <CardContent className="p-2">
                {filteredHigh.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={{ ...issue, severity: "HIGH" }}
                    onClick={() => {
                      const fakeIssue: Issue = { id: issue.id, source: issue.source, file: issue.file, line: issue.line || 0, category: issue.category, title: issue.title, description: "", recommendation: "" };
                      openSheet(fakeIssue, "HIGH", true);
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──── MEDIUM TAB ────────────────────────────────────────── */}
          <TabsContent value="medium" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="بحث في المشاكل المتوسطة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-sm"
                  aria-label="بحث في المشاكل"
                />
              </div>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="h-10 text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
                aria-label="تصفية حسب المصدر"
              >
                <option value="all">جميع المصادر</option>
                <option value="Backend">الخادم</option>
                <option value="Frontend">الواجهة</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{filteredMedium.length} من {report.mediumIssues.length} مشكلة متوسطة</p>
            <Card className={CARD_DEPTH}>
              <CardContent className="p-2">
                {filteredMedium.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={{ ...issue, severity: "MEDIUM" }}
                    onClick={() => {
                      const fakeIssue: Issue = { id: issue.id, source: issue.source, file: issue.file, line: issue.line || 0, category: issue.category, title: issue.title, description: "", recommendation: "" };
                      openSheet(fakeIssue, "MEDIUM", true);
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──── PI NETWORK TAB ────────────────────────────────────── */}
          <TabsContent value="pi-network" className="space-y-6">

            {/* Pi Network Compliance Score Ring */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Globe className="h-4 w-4" />درجة التوافق مع شبكة بي
                </CardTitle>
                <CardDescription>تقييم شامل لجاهزية شبكة بي</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ScoreRing score={report.scores.piNetwork.overall} label="توافق شبكة بي" size={140} />
              </CardContent>
            </Card>

            {/* Blocking Issues */}
            <Card className={`border-red-200/60 dark:border-red-900/40 ${CARD_DEPTH}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5" />{report.piNetworkCompliance.blockingIssues.length} مشاكل تعطل النشر
                </CardTitle>
                <CardDescription>يجب حل جميع هذه المشاكل قبل أن توافق شبكة بي على التطبيق</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.piNetworkCompliance.blockingIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm leading-relaxed break-words">{issue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Non-Custodial Claim Verification */}
            <Card className={`border-red-200/60 dark:border-red-900/40 ${CARD_DEPTH}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <ShieldX className="h-4 w-4" />التحقق من ادعاء عدم الحضانة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-5 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-red-700 dark:text-red-400 mb-2">الادعاء كاذب — النظام حضانتي بالأساس</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        يدّعي README و SECURITY.md و manifest أن هذا نظام &ldquo;غير حضانتي&rdquo;.
                        لكن الخادم يُشتق جميع مفاتيح Stellar السرية للمستخدمين بشكل حتمي من{" "}
                        <code className="mx-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 rounded text-red-700 dark:text-red-400 font-mono text-[10px]" dir="ltr">
                          SHA256(SECRET_KEY:UID)
                        </code>{" "}
                        ويتولى توقيع جميع المعاملات من جانب الخادم. إذا تسرب المفتاح الرئيسي، فإن جميع محافظ المستخدمين على المنصة ستُخترق.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-[10px] border-red-200 dark:border-red-800">ادعاء كاذب</Badge>
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-[10px] border-red-200 dark:border-red-800">أمان بالتخفي</Badge>
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-[10px] border-red-200 dark:border-red-800">نقطة فشل واحدة</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Deployment Issues */}
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4 text-orange-500" />مشاكل النشر ({report.piNetworkCompliance.deploymentIssues.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {report.piNetworkCompliance.deploymentIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/40">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed break-words">{issue}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Security Headers */}
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" />رؤوس أمان مفقودة ({report.piNetworkCompliance.securityHeaders.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {report.piNetworkCompliance.securityHeaders.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed break-words">{issue}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Manifest Issues */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4 text-violet-500" />مشاكل توافق Manifest ({report.piNetworkCompliance.manifestIssues.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {report.piNetworkCompliance.manifestIssues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-900/40">
                    <AlertTriangle className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed break-words">{issue}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pi Network Detailed Scores */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Gauge className="h-4 w-4" />درجات شبكة بي التفصيلية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LabeledProgress label="توافق Manifest" value={report.scores.piNetwork.manifestCompliance} />
                <LabeledProgress label="التحقق من النطاق" value={report.scores.piNetwork.domainVerification} />
                <LabeledProgress label="إدارة مفتاح API" value={report.scores.piNetwork.apiKeyManagement} />
                <LabeledProgress label="سير الدفع" value={report.scores.piNetwork.paymentFlow} />
                <LabeledProgress label="KYC / KYB" value={report.scores.piNetwork.kycKyb} />
                <LabeledProgress label="جاهزية النشر" value={report.scores.piNetwork.deploymentReadiness} />
                <LabeledProgress label="عدم الحضانة" value={report.scores.piNetwork.nonCustodial} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ═══════════════════════════════════════════════════════════════
          ISSUE DETAIL SHEET
         ═══════════════════════════════════════════════════════════════ */}
      <IssueDetailSheet
        issue={selectedIssue}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        repoUrl={report.meta.repository}
        severity={selectedSeverity}
        isBrief={selectedIsBrief}
      />

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER (sticky)
         ═══════════════════════════════════════════════════════════════ */}
      <footer className="mt-auto border-t bg-white/60 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground text-center sm:text-right">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
                <p className="font-semibold">تقرير التدقيق الأمني — Ledgererp</p>
                <a
                  href="https://develop.pinet.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <Badge className="bg-purple-600/15 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/40 text-[9px] font-semibold gap-1 px-1.5 py-0 hover:bg-purple-600/25 transition-colors cursor-pointer">
                    <CircleDot className="h-2 w-2" />Pi Network
                  </Badge>
                </a>
              </div>
              <p>
                تم الإنشاء {new Date(report.meta.auditDate).toLocaleDateString("ar-DZ")} &bull; {report.meta.totalFiles} ملف &bull; {report.meta.totalLines} سطر &bull; {report.summary.totalIssues} مشكلة
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5"><XCircle className="h-2.5 w-2.5 text-red-500" />{report.summary.critical} حرج</Badge>
              <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5"><AlertTriangle className="h-2.5 w-2.5 text-orange-500" />{report.summary.high} مرتفع</Badge>
              <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5"><ShieldAlert className="h-2.5 w-2.5 text-amber-500" />{report.summary.medium} متوسط</Badge>
              <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5"><ShieldCheck className="h-2.5 w-2.5 text-sky-500" />{report.summary.low} منخفض</Badge>
              <a href={report.meta.repository} target="_blank" rel="noopener noreferrer" aria-label="عرض المستودع على GitHub">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Github className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}