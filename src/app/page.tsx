"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import {
  ShieldAlert, ShieldX, ShieldCheck, AlertTriangle, Bug, Code2,
  Server, Globe, LayoutGrid, FileWarning, Terminal, Lock, Eye,
  XCircle, CheckCircle2, ArrowRight, ChevronDown, ChevronUp,
  ExternalLink, Github, Zap, Target, Layers, Cpu, Gauge,
  BarChart3, Search, Download, Filter, FileCode2,
  Clock, Hash, Radio, CircleDot, TriangleAlert, Copy, Check,
  PieChart, Activity, Flame, FolderOpen,
  Sun, Moon, FileJson, FileSpreadsheet, ClipboardList, PanelRight,
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

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface Issue {
  id: string; source: string; file: string; line: number; category: string;
  title: string; description: string; recommendation: string;
}
interface IssueBrief {
  id: string; source: string; file: string; line: number; category: string; title: string;
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
   ANIMATED NUMBER
   ════════════════════════════════════════════════════════════════════════════ */

function AnimatedNumber({ value, duration = 1200, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
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

  return <span ref={ref}>{display}</span>;
}

/* ════════════════════════════════════════════════════════════════════════════
   SCORE RING (with dark mode glow)
   ════════════════════════════════════════════════════════════════════════════ */

function ScoreRing({ score, label, size = 110, showAnimated = true }: { score: number; label: string; size?: number; showAnimated?: boolean }) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  const bgColor = score >= 80 ? "rgba(16,185,129,0.08)" : score >= 60 ? "rgba(245,158,11,0.08)" : score >= 40 ? "rgba(249,115,22,0.08)" : "rgba(239,68,68,0.08)";
  const labelColor = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : score >= 40 ? "text-orange-500" : "text-red-500";

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative rounded-full p-2.5" style={{ background: bgColor }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <filter id={`glow-${label.replace(/[^a-zA-Z]/g, "-").toLowerCase()}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="5.5" className="text-muted/20" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            strokeWidth="5.5" strokeLinecap="round"
            stroke={color} className="transition-all duration-1000 ease-out dark:filter dark:drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]"
            strokeDasharray={circumference} strokeDashoffset={offset}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold ${labelColor}`} style={{ fontSize: size * 0.22 }}>
          {showAnimated ? <AnimatedNumber value={score} /> : score}
        </span>
      </div>
      <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight max-w-[100px]">{label}</span>
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
    [data, total, circumference]);

  if (total === 0) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted/10" />
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
  const barH = 22, gap = 6, labelW = 140, valueW = 36, padRight = 8;
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
            <text x={labelW - 8} y={y + barH / 2 + 1} textAnchor="end" fontSize="10" fill="currentColor" className="fill-muted-foreground truncate" style={{ maxWidth: labelW - 16 }}>
              {d.label.length > 22 ? d.label.slice(0, 20) + "\u2026" : d.label}
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
  const m: Record<string, { cls: string; icon: React.ReactNode }> = {
    CRITICAL: { cls: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400 dark:border-red-500/40", icon: <XCircle className="h-3 w-3" /> },
    HIGH: { cls: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:border-orange-500/40", icon: <AlertTriangle className="h-3 w-3" /> },
    MEDIUM: { cls: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/40", icon: <ShieldAlert className="h-3 w-3" /> },
    LOW: { cls: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400 dark:border-sky-500/40", icon: <ShieldCheck className="h-3 w-3" /> },
  };
  const v = m[severity] || m.LOW;
  return <Badge variant="outline" className={`${v.cls} gap-1 text-[10px] font-semibold px-2 py-0.5`}>{v.icon}{severity}</Badge>;
}

function SourceBadge({ source }: { source: string }) {
  const c: Record<string, string> = {
    Backend: "bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400",
    Frontend: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400",
    "Pi Network": "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
  };
  return <Badge variant="outline" className={`${c[source] || ""} text-[10px] font-semibold px-2 py-0.5`}>{source}</Badge>;
}

/* ════════════════════════════════════════════════════════════════════════════
   STAT CARD (with glassmorphism in dark mode)
   ════════════════════════════════════════════════════════════════════════════ */

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: React.ElementType; label: string; value: number; sub?: string; color: string; delay?: number;
}) {
  return (
    <Card className={`relative overflow-hidden border-0 ${GLASS_STAT}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-3xl font-black tracking-tight"><AnimatedNumber value={value} duration={800} delay={delay} /></p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
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
  const scoreColor = value >= 80 ? "text-emerald-600 dark:text-emerald-400" : value >= 60 ? "text-amber-600 dark:text-amber-400" : value >= 40 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400";
  const barColor = value >= 80 ? "[&>div]:bg-emerald-500" : value >= 60 ? "[&>div]:bg-amber-500" : value >= 40 ? "[&>div]:bg-orange-500" : "[&>div]:bg-red-500";
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-xs font-bold ${scoreColor}`}>{value}<span className="text-muted-foreground/60 font-normal">/100</span></span>
      </div>
      <Progress value={value} className={`h-2 ${barColor}`} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ISSUE DETAIL SHEET
   ════════════════════════════════════════════════════════════════════════════ */

function IssueDetailSheet({ issue, open, onOpenChange, repoUrl, severity = "CRITICAL" }: {
  issue: Issue | null; open: boolean; onOpenChange: (v: boolean) => void; repoUrl: string; severity?: string;
}) {
  if (!issue) return null;
  const sev = severity.toUpperCase();
  const sevColor: Record<string, string> = {
    CRITICAL: "text-red-500",
    HIGH: "text-orange-500",
    MEDIUM: "text-amber-500",
    LOW: "text-sky-500",
  };
  const githubUrl = `${repoUrl.replace(/\/?$/, "")}/blob/main/${issue.file}${issue.line > 0 ? `#L${issue.line}` : ""}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto dark:bg-gradient-to-b dark:from-[oklch(0.20_0_0)] dark:to-[oklch(0.16_0_0)]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base leading-snug pr-8">{issue.title}</SheetTitle>
          <SheetDescription className="sr-only">Full details for issue {issue.id}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={sev} />
            <SourceBadge source={issue.source} />
            <Badge variant="outline" className="text-[10px] font-medium bg-muted/50">{issue.category}</Badge>
          </div>

          {/* ID / File / Line grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Issue ID</p>
              <p className="text-sm font-mono font-semibold">{issue.id}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Severity</p>
              <p className={`text-sm font-semibold ${sevColor[sev] || "text-red-500"}`}>{sev.charAt(0) + sev.slice(1).toLowerCase()}</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-muted/40 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Source</p>
              <p className="text-sm font-semibold">{issue.source}</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-muted/40 border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">File</p>
              <p className="text-sm font-mono">{issue.file}{issue.line > 0 ? ` : ${issue.line}` : ""}</p>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{issue.description}</p>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4">
            <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />Recommendation
            </h4>
            <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">{issue.recommendation}</p>
          </div>

          <Separator />

          {/* GitHub link */}
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors min-h-[44px] py-2"
            aria-label={`View ${issue.file} on GitHub`}
          >
            <Github className="h-4 w-4" />
            View on GitHub
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CRITICAL ISSUE CARD (expandable, opens sheet on click)
   ════════════════════════════════════════════════════════════════════════════ */

function CriticalIssueCard({ issue, index, onSelect }: { issue: Issue; index: number; onSelect: (issue: Issue) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isBlocking = index < 7;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Critical issue ${index + 1}: ${issue.title}. Press to view details.`}
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
            <Badge variant="outline" className="text-[10px] font-medium bg-muted/50">{issue.category}</Badge>
            {isBlocking && <Badge className="bg-red-600 text-white text-[10px] px-2 py-0 animate-pulse">BLOCKS DEPLOY</Badge>}
          </div>
          <h4 className="font-semibold text-sm mb-1.5 leading-snug">{issue.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2.5">
            <Code2 className="h-3 w-3 flex-shrink-0" />
            <code className="text-xs font-mono">{issue.file}</code>
            {issue.line > 0 && <span className="text-muted-foreground/60">Line {issue.line}</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{issue.description}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-xs text-primary hover:text-primary/80 hover:underline flex items-center gap-1 transition-colors min-h-[44px] py-1"
            aria-label={expanded ? "Hide fix recommendation" : "Show fix recommendation"}
          >
            {expanded ? <>Hide Fix <ChevronUp className="h-3 w-3" /></> : <>Show Fix <ChevronDown className="h-3 w-3" /></>}
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
   ISSUE ROW (for High/Medium, clickable)
   ════════════════════════════════════════════════════════════════════════════ */

function IssueRow({ issue, onClick }: { issue: IssueBrief & { severity?: string }; onClick?: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick?.(); }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer min-h-[44px]"
      aria-label={`Issue: ${issue.title}`}
    >
      <code className="text-[11px] font-mono text-muted-foreground flex-shrink-0 w-40 truncate hidden sm:block">{issue.file}</code>
      <span className="text-[11px] text-muted-foreground/60 flex-shrink-0 hidden md:block w-10">{issue.line > 0 ? `:${issue.line}` : ""}</span>
      <span className="text-xs text-muted-foreground flex-shrink-0 w-32 truncate hidden lg:block">{issue.category}</span>
      <span className="text-xs font-medium truncate flex-1 group-hover:text-foreground transition-colors">{issue.title}</span>
      <SourceBadge source={issue.source} />
      <PanelRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
    </div>
  );
}

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState<Record<string, boolean>>({
    "XSS Vulnerabilities": true,
    "Authentication & Authorization": true,
    "Cryptography Issues": true,
    "Insecure Storage & Data": true,
  });
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then(setReport).finally(() => setLoading(false));
  }, []);

  /* ── Computed data ──────────────────────────────────────────────────── */

  const donutData = useMemo(() => [
    { label: "Critical", value: report?.summary.critical ?? 0, color: "#ef4444" },
    { label: "High", value: report?.summary.high ?? 0, color: "#f97316" },
    { label: "Medium", value: report?.summary.medium ?? 0, color: "#f59e0b" },
    { label: "Low", value: report?.summary.low ?? 0, color: "#3b82f6" },
  ], [report]);

  const categoryBarData = useMemo(() => (report?.categoryBreakdown ?? []).map((c) => ({
    label: c.category,
    value: c.total,
    color: c.critical > 0 ? "#ef4444" : c.high > 0 ? "#f97316" : "#f59e0b",
  })), [report]);

  const fileHeatData = useMemo(() => (report?.fileHeatmap ?? []).map((f) => ({
    label: f.file.replace("static/", "").replace("app/", ""),
    value: f.total,
    color: f.critical > 0 ? "#ef4444" : f.high > 0 ? "#f97316" : f.critical + f.high > 3 ? "#f59e0b" : "#64748b",
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
      if (q && !i.title.toLowerCase().includes(q) && !i.file.toLowerCase().includes(q)) return false;
      if (filterSource !== "all" && i.source !== filterSource) return false;
      return true;
    });
  }, [report, searchQuery, filterSource]);

  const filteredMedium = useMemo(() => {
    if (!report) return [];
    return report.mediumIssues.filter((i) => {
      const q = searchQuery.toLowerCase();
      if (q && !i.title.toLowerCase().includes(q) && !i.file.toLowerCase().includes(q)) return false;
      if (filterSource !== "all" && i.source !== filterSource) return false;
      return true;
    });
  }, [report, searchQuery, filterSource]);

  /* ── Handlers ───────────────────────────────────────────────────────── */

  const handleSelectIssue = useCallback((issue: Issue) => {
    setSelectedIssue(issue);
    setSelectedSeverity("CRITICAL");
    setSheetOpen(true);
  }, []);

  const handleSelectBriefIssue = useCallback((brief: IssueBrief, severity: string) => {
    // Construct a full Issue from brief data for the sheet
    const fakeIssue: Issue = {
      ...brief,
      description: "Full description available in the detailed audit report.",
      recommendation: "Refer to the comprehensive audit report for detailed remediation steps.",
    };
    setSelectedSeverity(severity.toUpperCase());
    // Try to find matching critical finding for richer data
    const match = report?.criticalFindings.find((f) => f.id === brief.id);
    if (match) {
      setSelectedIssue(match);
    } else {
      setSelectedIssue(fakeIssue);
    }
    setSheetOpen(true);
  }, [report]);

  const handleExportJSON = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ledgererp-audit-report.json"; a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const handleExportCSV = useCallback(() => {
    if (!report) return;
    const all = [
      ...report.criticalFindings.map((i) => ({ ...i, severity: "critical" })),
      ...report.highIssues.map((i) => ({ ...i, severity: "high", description: "", recommendation: "" })),
      ...report.mediumIssues.map((i) => ({ ...i, severity: "medium", description: "", recommendation: "" })),
    ];
    const headers = ["ID", "Severity", "Source", "File", "Line", "Category", "Title", "Description", "Recommendation"];
    const rows = all.map((i) => [i.id, i.severity, i.source, i.file, i.line, i.category, i.title, i.description, i.recommendation].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ledgererp-audit.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const handleCopyToClipboard = useCallback(() => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [report]);

  /* ── Security zones data ────────────────────────────────────────────── */

  const securityZones = useMemo(() => [
    { title: "XSS Vulnerabilities", icon: <Eye className="h-4 w-4 text-red-500" />, color: "text-red-500", items: [
      "b2b.js \u2014 innerHTML merchant data injection",
      "hardware.js \u2014 receipt HTML injection",
      "invoice.js \u2014 addItem DOMPurify bypass",
      "deep-linking.js \u2014 URL param injection",
      "ui-utils.js \u2014 iframe with arbitrary src",
      "ui-utils.js \u2014 Modal.prompt() HTML injection",
      "security.js \u2014 DOMPurify fallback insufficient",
      "shift-management.js \u2014 report innerHTML injection",
      "audit-logs.js \u2014 double HTML encoding bug",
    ]},
    { title: "Authentication & Authorization", icon: <Lock className="h-4 w-4 text-orange-500" />, color: "text-orange-500", items: [
      "KYB middleware \u2014 unauthenticated requests pass through",
      "SSE notifications \u2014 zero authentication required",
      "Blockchain data \u2014 no merchant ownership check",
      "Rate limiting \u2014 bypassed via User-Agent header",
      "KYC \u2014 always returns fake completed status",
      "Refund auth \u2014 browser confirm() only, no server check",
      "Pi tokens \u2014 stored raw in memory and Redis",
    ]},
    { title: "Cryptography Issues", icon: <Zap className="h-4 w-4 text-amber-500" />, color: "text-amber-500", items: [
      "Hardcoded signing secret: 'super_secret_signing_key_change_me'",
      "SHA256 instead of HMAC for subscription signatures",
      "Fallback mnemonic: 55 bits vs required 128 bits entropy",
      "Static PBKDF2 salts (same for all users)",
      "PIN stored as plaintext in IndexedDB",
      "No SRI on CDN resources (Chart.js, QRious, Font Awesome)",
      "Unpkg.com script loaded without integrity check",
    ]},
    { title: "Insecure Storage & Data", icon: <FileWarning className="h-4 w-4 text-violet-500" />, color: "text-violet-500", items: [
      "Transaction data in localStorage (unencrypted)",
      "Stellar public key in localStorage (no integrity)",
      "Merchant ID fallback to 'anonymous'",
      "Offline sync queue in plain localStorage",
      "Canvas fingerprinting for device ID",
      "Payment URL exposed in alert() on error",
      "Invoice ID uses Math.random() not crypto API",
    ]},
    { title: "Supply Chain Risks", icon: <TriangleAlert className="h-4 w-4 text-rose-500" />, color: "text-rose-500", items: [
      "Unpkg.com CDN used for production dependencies",
      "No lockfile validation in production build",
      "Chart.js loaded from unpkg without version pinning",
      "QRious library loaded without integrity hash",
      "Font Awesome from cdnjs \u2014 no SRI verification",
    ]},
    { title: "Performance Issues", icon: <Gauge className="h-4 w-4 text-blue-500" />, color: "text-blue-500", items: [
      "No code splitting on frontend bundle",
      "All JS modules loaded synchronously",
      "No lazy loading for route components",
      "Large monolithic files exceeding 500 lines",
      "No service worker for offline caching strategy",
    ]},
    { title: "Code Quality", icon: <Code2 className="h-4 w-4 text-teal-500" />, color: "text-teal-500", items: [
      "Multiple TODO/FIXME comments in production code",
      "Empty files committed to repository",
      "Incomplete implementations (stub functions)",
      "Inconsistent error handling patterns",
      "Mixed coding styles across modules",
    ]},
    { title: "Privacy Concerns", icon: <Eye className="h-4 w-4 text-pink-500" />, color: "text-pink-500", items: [
      "Canvas fingerprinting for device identification",
      "Transaction history stored unencrypted",
      "No data retention policy implemented",
      "User data exposed in browser console logs",
    ]},
    { title: "Error Handling", icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />, color: "text-yellow-600", items: [
      "Payment errors exposed via alert() dialogs",
      "Generic try-catch swallowing all errors",
      "No error boundary components in React app",
      "API errors not properly propagated to UI",
    ]},
    { title: "Incomplete Code", icon: <FileWarning className="h-4 w-4 text-slate-500" />, color: "text-slate-500", items: [
      "Empty controller files in backend",
      "Stub API endpoints returning placeholder data",
      "Unfinished KYC/KYB verification flows",
      "Missing input validation on several endpoints",
    ]},
    { title: "Deprecated APIs", icon: <Clock className="h-4 w-4 text-neutral-500" />, color: "text-neutral-500", items: [
      "Using deprecated Stellar SDK methods",
      "Old Pi SDK integration patterns",
      "Legacy browser API usage without fallbacks",
    ]},
  ], []);

  /* ── Loading state ──────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div role="status" aria-label="Loading audit report" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-red-100 dark:border-red-900/40 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-red-500 rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Loading Audit Report</p>
            <p className="text-xs text-muted-foreground mt-1">Analyzing 67 files across 4,800+ lines of code</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          {/* Left: Pi logo + title */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Pi Network Logo Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-500/25">
                <ShieldX className="h-5.5 w-5.5 text-white" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center border-2 border-background dark:border-slate-950 shadow-sm">
                <span className="text-[9px] font-black text-white leading-none">π</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold leading-tight tracking-tight truncate">Security Audit Report</h1>
                <Badge className="bg-purple-600/15 text-purple-700 border-purple-500/30 dark:text-purple-300 dark:border-purple-500/40 text-[10px] font-semibold gap-1 px-2 py-0 hidden sm:inline-flex">
                  <CircleDot className="h-2.5 w-2.5" />Pi Network Testnet
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {report.meta.projectName} &bull; {new Date(report.meta.auditDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Badge variant="secondary" className="hidden md:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 font-medium">
              <FileCode2 className="h-3 w-3" />{report.meta.totalFiles} files
            </Badge>
            <Badge variant="secondary" className="hidden md:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 font-medium">
              <Hash className="h-3 w-3" />{report.meta.totalLines} lines
            </Badge>

            {/* Theme Toggle */}
            <Button
              variant="outline" size="sm"
              className="gap-1.5 text-xs h-8 w-8 sm:w-auto sm:px-3"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-3" aria-label="Export options">
                  <Download className="h-3 w-3" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportJSON} className="gap-2 text-xs cursor-pointer">
                  <FileJson className="h-3.5 w-3.5" />Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2 text-xs cursor-pointer">
                  <FileSpreadsheet className="h-3.5 w-3.5" />Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyToClipboard} className="gap-2 text-xs cursor-pointer">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <ClipboardList className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* GitHub */}
            <a href={report.meta.repository} target="_blank" rel="noopener noreferrer" aria-label="View repository on GitHub">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-3">
                <Github className="h-3 w-3" /><span className="hidden sm:inline">GitHub</span>
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN
         ═══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── VERDICT BANNER (with shimmer in dark mode) ─────────────── */}
        <div className="relative rounded-2xl p-6 sm:p-8 mb-8 bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-2xl shadow-red-500/20 overflow-hidden">
          {/* Dark mode shimmer line */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 dark:opacity-100">
            <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-verdict-shimmer" />
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10 flex-shrink-0">
                <ShieldX className="h-10 w-10" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Flame className="h-4 w-4 text-yellow-300" />
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">NOT READY FOR DEPLOYMENT</h2>
                </div>
                <p className="text-red-100 text-sm leading-relaxed max-w-xl">
                  {report.summary.critical} critical vulnerabilities, {report.summary.blockingDeployment} blocking issues,
                  and an overall score of <strong className="text-white">{report.scores.overall}/100</strong>.
                  Immediate action required before any production deployment.
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right flex-shrink-0">
              <div className="text-6xl sm:text-7xl font-black leading-none">
                <AnimatedNumber value={report.scores.overall} duration={1500} />
              </div>
              <div className="text-red-200 text-[11px] font-semibold tracking-widest uppercase mt-1">Overall Score</div>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={XCircle} label="Critical Issues" value={report.summary.critical} color="bg-gradient-to-br from-red-500 to-red-600" delay={0} />
          <StatCard icon={AlertTriangle} label="High Issues" value={report.summary.high} sub={`${report.summary.medium} medium \u00b7 ${report.summary.low} low`} color="bg-gradient-to-br from-orange-500 to-orange-600" delay={100} />
          <StatCard icon={Bug} label="Total Issues" value={report.summary.totalIssues} color="bg-gradient-to-br from-amber-500 to-amber-600" delay={200} />
          <StatCard icon={Radio} label="Blocks Deployment" value={report.summary.blockingDeployment} color="bg-gradient-to-br from-rose-500 to-rose-700" delay={300} />
        </div>

        {/* ── TABS ──────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1.5 bg-muted/50 backdrop-blur-sm overflow-x-auto scrollbar-none">
            {[
              { value: "overview", icon: <Gauge className="h-3.5 w-3.5 hidden sm:block" />, label: "Overview" },
              { value: "critical", icon: <ShieldX className="h-3.5 w-3.5 hidden sm:block" />, label: "Issues" },
              { value: "security", icon: <Lock className="h-3.5 w-3.5 hidden sm:block" />, label: "Security" },
              { value: "architecture", icon: <LayoutGrid className="h-3.5 w-3.5 hidden sm:block" />, label: "Architecture" },
              { value: "pi-network", icon: <Globe className="h-3.5 w-3.5 hidden sm:block" />, label: "Pi Network" },
            ].map((t) => (
              <TabsTrigger key={t.value} value={t.value}
                className="text-xs py-2.5 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all min-w-0">
                {t.icon}{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ──── OVERVIEW TAB ──────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-8">
            {/* Score Rings + Donut */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className={`lg:col-span-2 ${CARD_DEPTH}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Quality Scores</CardTitle>
                  <CardDescription>Comprehensive assessment across all dimensions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
                    <ScoreRing score={report.scores.overall} label="Overall" size={120} />
                    <ScoreRing score={report.scores.backend.overall} label="Backend" size={105} />
                    <ScoreRing score={report.scores.frontend.overall} label="Frontend" size={105} />
                    <ScoreRing score={report.scores.piNetwork.overall} label="Pi Network" size={105} />
                  </div>
                </CardContent>
              </Card>

              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" />Severity Distribution</CardTitle>
                  <CardDescription>Breakdown by severity level</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <DonutChart data={donutData} />
                </CardContent>
              </Card>
            </div>

            {/* Backend / Frontend / Pi scores */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4 text-violet-500" />Backend Scores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LabeledProgress label="Code Quality" value={report.scores.backend.codeQuality} />
                  <LabeledProgress label="Security" value={report.scores.backend.security} />
                  <LabeledProgress label="Architecture" value={report.scores.backend.architecture} />
                </CardContent>
              </Card>
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-cyan-500" />Frontend Scores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LabeledProgress label="Code Quality" value={report.scores.frontend.codeQuality} />
                  <LabeledProgress label="Security" value={report.scores.frontend.security} />
                  <LabeledProgress label="Pi Compliance" value={report.scores.frontend.piCompliance} />
                </CardContent>
              </Card>
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400"><Globe className="h-4 w-4" />Pi Network Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LabeledProgress label="Manifest" value={report.scores.piNetwork.manifestCompliance} />
                  <LabeledProgress label="Domain Verification" value={report.scores.piNetwork.domainVerification} />
                  <LabeledProgress label="API Key Mgmt" value={report.scores.piNetwork.apiKeyManagement} />
                  <LabeledProgress label="Payment Flow" value={report.scores.piNetwork.paymentFlow} />
                  <LabeledProgress label="KYC / KYB" value={report.scores.piNetwork.kycKyb} />
                  <LabeledProgress label="Deployment" value={report.scores.piNetwork.deploymentReadiness} />
                  <LabeledProgress label="Non-Custodial" value={report.scores.piNetwork.nonCustodial} />
                </CardContent>
              </Card>
            </div>

            {/* Category + File charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Issues by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[340px]">
                    <HorizontalBarChart data={categoryBarData} />
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" />File Heatmap (Top 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[340px]">
                    <HorizontalBarChart data={fileHeatData} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-emerald-500" />Top Recommendations ({report.recommendations.length})</CardTitle>
                <CardDescription>Prioritized actions to improve code quality and security</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px] pr-3">
                  <div className="space-y-1">
                    {report.recommendations.slice(0, 12).map((rec) => (
                      <div key={rec.priority} className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                        <span className="w-5 text-center font-bold text-muted-foreground/50 flex-shrink-0">{rec.priority}</span>
                        <ArrowRight className={`h-3 w-3 flex-shrink-0 ${
                          rec.impact === "Critical" ? "text-red-400" : rec.impact === "High" ? "text-orange-400" : "text-amber-400"
                        }`} />
                        <span className="flex-1 truncate">{rec.title}</span>
                        <Badge variant="outline" className={`text-[9px] flex-shrink-0 px-1.5 py-0 ${
                          rec.effort === "Small" ? "text-emerald-600" : rec.effort === "Medium" ? "text-amber-600" : "text-red-600"
                        }`}>{rec.effort}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" />Project Tech Stack</CardTitle>
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

          {/* ──── ISSUES TAB ────────────────────────────────────────────── */}
          <TabsContent value="critical" className="space-y-6">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search issues by title, file, or category\u2026"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-sm"
                  aria-label="Search issues"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="h-10 pl-9 pr-8 text-sm rounded-md border bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                  aria-label="Filter by source"
                >
                  <option value="all">All Sources</option>
                  <option value="Backend">Backend</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Pi Network">Pi Network</option>
                </select>
              </div>
            </div>

            {/* Critical Issues */}
            <Card className={`border-red-200/60 dark:border-red-900/40 ${CARD_DEPTH}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />{filteredCritical.length} Critical Issues
                  {searchQuery && <span className="text-muted-foreground font-normal">(filtered)</span>}
                </CardTitle>
                <CardDescription className="text-[11px]">Click any card to view full details in a slide-over panel</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredCritical.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No issues match your filters</p>
                ) : (
                  <div className="space-y-4">
                    {filteredCritical.map((issue) => (
                      <CriticalIssueCard key={issue.id} issue={issue} index={report.criticalFindings.indexOf(issue)} onSelect={handleSelectIssue} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* High Issues */}
            <Card className={`border-orange-200/60 dark:border-orange-900/40 ${CARD_DEPTH}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />{filteredHigh.length} High Severity Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredHigh.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No issues match your filters</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredHigh.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} onClick={() => handleSelectBriefIssue(issue, "high")} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medium Issues */}
            <Card className={`border-amber-200/60 dark:border-amber-900/40 ${CARD_DEPTH}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" />{filteredMedium.length} Medium Severity Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredMedium.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No issues match your filters</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredMedium.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} onClick={() => handleSelectBriefIssue(issue, "medium")} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Issues */}
            <Card className={`border-sky-200/60 dark:border-sky-900/40 ${CARD_DEPTH}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <ShieldCheck className="h-4 w-4" />{report.summary.low} Low Severity Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground text-center py-4">
                  Low severity issues are tracked in the full audit report. Export JSON or CSV for complete data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──── SECURITY TAB (Collapsible Zones) ─────────────────────── */}
          <TabsContent value="security" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {securityZones.map((zone) => {
                const isOpen = securityOpen[zone.title] ?? false;
                return (
                  <Card key={zone.title} className={CARD_DEPTH}>
                    <Collapsible
                      open={isOpen}
                      onOpenChange={(v) => setSecurityOpen((prev) => ({ ...prev, [zone.title]: v }))}
                    >
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 rounded-t-lg transition-colors">
                          <CardTitle className="text-sm flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2">{zone.icon}{zone.title}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{zone.items.length}</Badge>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                            </div>
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-1.5 pt-0">
                          {zone.items.map((v, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-xs py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                              <XCircle className={`h-3 w-3 ${zone.color} flex-shrink-0 mt-0.5`} />
                              <span className="text-muted-foreground leading-relaxed break-words">{v}</span>
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ──── ARCHITECTURE TAB ────────────────────────────────────── */}
          <TabsContent value="architecture" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-red-500" />Architecture Problems</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.architectureProblems.map((prob, i) => (
                    <div key={i} className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
                      <h4 className="text-sm font-semibold mb-1.5">{prob.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{prob.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-orange-500" />Largest Files (Code Smell)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.codeQuality.largestFiles.map((f) => {
                    const maxSize = report.codeQuality.largestFiles[0].size;
                    return (
                      <div key={f.file} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <code className="text-[11px] font-mono text-muted-foreground truncate max-w-[240px]">{f.file}</code>
                          <span className="text-[10px] text-muted-foreground/70 font-medium">{(f.size / 1024).toFixed(0)}KB &middot; {f.lines}L</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000"
                            style={{ width: `${(f.size / maxSize) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4 text-amber-500" />TODO / FIXME & Incomplete Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {report.codeQuality.todoFixme.map((todo, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
                      <code className="font-mono text-amber-700 dark:text-amber-400 flex-shrink-0 w-28 truncate font-medium">{todo.file}</code>
                      <span className="text-muted-foreground leading-relaxed">{todo.text}</span>
                    </div>
                  ))}
                  <Separator className="my-3" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Empty / Incomplete Files</p>
                  {report.codeQuality.emptyFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <XCircle className="h-3 w-3 text-red-400" />{f}
                    </div>
                  ))}
                  {report.codeQuality.incompleteFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />{f}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-emerald-500" />All Recommendations ({report.recommendations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[480px] pr-3">
                    <div className="space-y-1">
                      {report.recommendations.map((rec) => (
                        <div key={rec.priority} className="flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                          <span className="w-5 text-center font-bold text-muted-foreground/50 flex-shrink-0">{rec.priority}</span>
                          <ArrowRight className={`h-3 w-3 flex-shrink-0 ${
                            rec.impact === "Critical" ? "text-red-400" : rec.impact === "High" ? "text-orange-400" : "text-amber-400"
                          }`} />
                          <span className="flex-1 truncate">{rec.title}</span>
                          <Badge variant="outline" className={`text-[9px] flex-shrink-0 px-1.5 py-0 ${
                            rec.effort === "Small" ? "text-emerald-600" : rec.effort === "Medium" ? "text-amber-600" : "text-red-600"
                          }`}>{rec.effort}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ──── PI NETWORK TAB ───────────────────────────────────────── */}
          <TabsContent value="pi-network" className="space-y-6">
            {/* Blocking Issues */}
            <Card className={`border-red-200/60 dark:border-red-900/40 ${CARD_DEPTH}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5" />{report.piNetworkCompliance.blockingIssues.length} Blocking Issues
                </CardTitle>
                <CardDescription>These issues must ALL be resolved before Pi Network will approve the app</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {report.piNetworkCompliance.blockingIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm leading-relaxed">{issue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4"><CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4 text-orange-500" />Deployment Issues</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {report.piNetworkCompliance.deploymentIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/40">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{issue}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className={CARD_DEPTH}>
                <CardHeader className="pb-4"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" />Missing Security Headers</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {report.piNetworkCompliance.securityHeaders.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{issue}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Non-Custodial Claim */}
            <Card className={`border-red-200/60 dark:border-red-900/40 ${CARD_DEPTH}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <ShieldX className="h-4 w-4" />Non-Custodial Claim Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-5 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-red-700 dark:text-red-400 mb-2">CLAIM IS FALSE &mdash; System is Fundamentally Custodial</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                        The README, SECURITY.md, and manifest all claim this is a &ldquo;non-custodial&rdquo; system.
                        However, the backend deterministically derives ALL user Stellar secret keys from{" "}
                        <code className="mx-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 rounded text-red-700 dark:text-red-400 font-mono text-[10px]">
                          SHA256(SECRET_KEY:UID)
                        </code>{" "}
                        and handles all transaction signing server-side. If the master secret leaks, every user wallet on the platform is compromised.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-[10px] border-red-200 dark:border-red-800">FALSE CLAIM</Badge>
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-[10px] border-red-200 dark:border-red-800">SECURITY BY OBSCURITY</Badge>
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-[10px] border-red-200 dark:border-red-800">SINGLE POINT OF FAILURE</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manifest Issues */}
            <Card className={CARD_DEPTH}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4 text-violet-500" />Manifest Compliance Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {report.piNetworkCompliance.manifestIssues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-900/40">
                    <AlertTriangle className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{issue}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          ISSUE DETAIL SHEET
         ═══════════════════════════════════════════════════════════════════ */}
      <IssueDetailSheet
        issue={selectedIssue}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        repoUrl={report.meta.repository}
        severity={selectedSeverity}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════════════════ */}
      <footer className="mt-auto border-t bg-white/60 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
                <p className="font-semibold">Ledgererp Security Audit Report</p>
                <Badge className="bg-purple-600/15 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/40 text-[9px] font-semibold gap-1 px-1.5 py-0">
                  <CircleDot className="h-2 w-2" />Pi Network
                </Badge>
              </div>
              <p>
                Generated {new Date(report.meta.auditDate).toLocaleString()} &bull; {report.meta.totalFiles} files &bull; {report.meta.totalLines} lines &bull; {report.summary.totalIssues} issues found
              </p>
              <p className="mt-1">
                Prepared for{" "}
                <a
                  href="https://develop.pinet.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  Pi Network Developer Portal <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5"><XCircle className="h-2.5 w-2.5 text-red-500" />{report.summary.critical} Critical</Badge>
              <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5"><AlertTriangle className="h-2.5 w-2.5 text-orange-500" />{report.summary.high} High</Badge>
              <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5"><ShieldAlert className="h-2.5 w-2.5 text-amber-500" />{report.summary.medium} Medium</Badge>
              <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5"><ShieldCheck className="h-2.5 w-2.5 text-sky-500" />{report.summary.low} Low</Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}