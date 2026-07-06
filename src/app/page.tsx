"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert, XCircle, AlertTriangle, ShieldCheck,
  LayoutGrid, Flame, Zap, Globe, ShieldX, Server,
  BarChart3, Search, FileCode2, FileWarning, Code2,
  Activity, FolderOpen, Cpu, Target, Gauge, Github,
  Sun, Moon, Wrench,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

/* ── Extracted Components ─────────────────────────────────────────────── */

import { ScoreRing } from "@/components/charts/ScoreRing";
import { DonutChart } from "@/components/charts/DonutChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { SeverityTrendChart } from "@/components/charts/SeverityTrendChart";
import { SecurityRadarChart } from "@/components/charts/SecurityRadarChart";
import { CategoryTreemapChart } from "@/components/charts/CategoryTreemapChart";
import { ScoreComparisonChart } from "@/components/charts/ScoreComparisonChart";
import { FixProgressGauge } from "@/components/charts/FixProgressGauge";
import { StatCard } from "@/components/dashboard/StatCard";
import { AdvancedVerdictBanner } from "@/components/dashboard/AdvancedVerdictBanner";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { ExportDropdown } from "@/components/dashboard/ExportDropdown";
import { SecurityZones } from "@/components/dashboard/SecurityZones";
import { CriticalIssueCard } from "@/components/issues/CriticalIssueCard";
import { IssueRow } from "@/components/issues/IssueRow";
import { IssueDetailSheet } from "@/components/issues/IssueDetailSheet";
import { AiAnalysisDialog } from "@/components/issues/AiAnalysisDialog";
import { FixProgressCard } from "@/components/dashboard/FixProgressCard";
import { FixTimeline } from "@/components/dashboard/FixTimeline";
import { LabeledProgress } from "@/components/ui/LabeledProgress";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { PiUserProfile } from "@/components/dashboard/PiUserProfile";
import { SubscriptionCards } from "@/components/dashboard/SubscriptionCard";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { GamificationPanel } from "@/components/dashboard/GamificationPanel";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { AiAdvisorChat } from "@/components/dashboard/AiAdvisorChat";
import { usePi } from "@/lib/pi-context";
import { toast } from "sonner";
import { PiNetworkMonitor } from "@/components/dashboard/PiNetworkMonitor";
import { PiNetworkStatus } from "@/components/dashboard/PiNetworkStatus";
import { PwaInstallPrompt } from "@/components/dashboard/PwaInstallPrompt";
import { PiWalletCard } from "@/components/dashboard/PiWalletCard";
import { PiEcosystemStats } from "@/components/dashboard/PiEcosystemStats";
import { PiComplianceChecker } from "@/components/dashboard/PiComplianceChecker";
import { PiAuthGate } from "@/components/onboarding/PiAuthGate";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

/* ── Data Layer ───────────────────────────────────────────────────────── */

import {
  AuditReport, Issue,
  exportJSON, exportCSV, copyToClipboard,
} from "@/lib/audit-data";
import { useIssueStore, type IssueWithStatus } from "@/lib/store";
import type { TierKey } from "@/lib/subscription";

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
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { piUser } = usePi();
  const [currentTier] = useState<TierKey>("free");

  /* ── Zustand Store ─────────────────────────────────────────────────── */

  const {
    issues: dbIssues,
    setIssues,
    filterStatus,
    setFilterStatus,
    aiDialogIssue,
    setAiDialogIssue,
    updateLocalIssueStatus,
  } = useIssueStore();

  /* ── TanStack Query: Fetch issues from DB ──────────────────────────── */

  const { data: issuesData, isLoading: issuesLoading } = useQuery<{ issues: IssueWithStatus[] }>({
    queryKey: ["issues", filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      const res = await fetch(`/api/issues?${params.toString()}`);
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (issuesData?.issues) {
      setIssues(issuesData.issues);
    }
  }, [issuesData, setIssues]);

  /* Build lookup map: issueId -> dbIssue */
  const dbIssueMap = useMemo(() => {
    const map = new Map<string, IssueWithStatus>();
    for (const issue of dbIssues) {
      map.set(issue.issueId, issue);
    }
    return map;
  }, [dbIssues]);

  /* ── Status Change Handler ─────────────────────────────────────────── */

  const handleStatusChange = useCallback(async (issueId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/issues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      updateLocalIssueStatus(issueId, newStatus);
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    } catch {
      console.error("Failed to update status");
    }
  }, [updateLocalIssueStatus, queryClient]);

  /* ── AI Analysis Handler ──────────────────────────────────────────── */

  const handleAiAnalysis = useCallback((dbIssue: IssueWithStatus) => {
    setAiDialogIssue(dbIssue);
    setAiDialogOpen(true);
  }, [setAiDialogIssue]);

  /* ── Fetch audit report ───────────────────────────────────────────── */

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setReport(d); setLoading(false); })
      .catch((err) => { console.error("Failed to load audit data:", err); setLoading(false); });
  }, []);

  /* ── Export ────────────────────────────────────────────────────────── */

  const handleExport = useCallback((format: "json" | "csv" | "clipboard") => {
    if (!report) return;
    if (format === "json") exportJSON(report);
    else if (format === "csv") exportCSV(report);
    else {
      copyToClipboard(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [report]);

  /* ── Open issue sheet ──────────────────────────────────────────────── */

  const openSheet = useCallback((issue: Issue, severity: string, isBrief = false) => {
    setSelectedIssue(issue);
    setSelectedSeverity(severity);
    setSelectedIsBrief(isBrief);
    setSheetOpen(true);
  }, []);

  /* ── Toggle security zone ──────────────────────────────────────────── */

  const toggleZone = useCallback((title: string) => {
    setSecurityOpen((prev) => ({ ...prev, [title]: !prev[title] }));
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

  /* ── Fixes tab: filter issues for display ──────────────────────────── */

  const fixesFilteredIssues = useMemo(() => {
    let filtered = dbIssues;
    if (filterStatus !== "ALL") {
      filtered = filtered.filter((i) => i.status === filterStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.file.toLowerCase().includes(q) ||
        i.issueId.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [dbIssues, filterStatus, searchQuery]);

  /* ── Render ────────────────────────────────────────────────────────── */

  if (loading) return <DashboardSkeleton tab={activeTab} />;

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
    <PiAuthGate>
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl">
      <PwaInstallPrompt />

      {/* ═══════════════════════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════════════════════ */}
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Export + Pi Status — inline actions bar below header */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExportDropdown report={report} copied={copied} onExport={handleExport} />
          <PiNetworkStatus />
        </div>
        <QuickActions />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ──── VERDICT BANNER ──────────────────────────────────────── */}
        <AdvancedVerdictBanner report={report} />

        {/* ──── STAT CARDS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard icon={ShieldAlert} label="إجمالي المشاكل" value={report.summary.totalIssues} sub={`${report.meta.totalFiles} ملف`} color="bg-gradient-to-br from-slate-600 to-slate-800" delay={0} />
          <StatCard icon={XCircle} label="حرج" value={report.summary.critical} sub={`${report.summary.blockingDeployment} تعطل النشر`} color="bg-gradient-to-br from-red-500 to-red-700" delay={100} />
          <StatCard icon={AlertTriangle} label="مرتفع" value={report.summary.high} color="bg-gradient-to-br from-orange-500 to-orange-700" delay={200} />
          <StatCard icon={ShieldAlert} label="متوسط" value={report.summary.medium} sub={`${report.summary.low} منخفض`} color="bg-gradient-to-br from-amber-500 to-amber-700" delay={300} />
        </div>

        {/* ──── TABS ────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full bg-muted/50 rounded-2xl p-1.5 gap-1 flex overflow-x-auto no-scrollbar">
            <TabsTrigger value="overview" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5 rounded-xl px-4 py-2.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground/80 transition-all relative">
              <LayoutGrid className="h-3.5 w-3.5 hidden sm:block" />نظرة عامة
              <span className="tab-indicator" />
            </TabsTrigger>
            <TabsTrigger value="critical" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5 rounded-xl px-4 py-2.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground/80 transition-all relative">
              <Flame className="h-3.5 w-3.5 hidden sm:block" />حرج
              <Badge variant="destructive" className="text-[10px] h-4 rounded-full px-1.5 min-w-[18px] flex items-center justify-center">{report.summary.critical}</Badge>
              <span className="tab-indicator" />
            </TabsTrigger>
            <TabsTrigger value="high" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5 rounded-xl px-4 py-2.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground/80 transition-all relative">
              <Zap className="h-3.5 w-3.5 hidden sm:block" />مرتفع
              <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[10px] h-4 rounded-full px-1.5 min-w-[18px] flex items-center justify-center border-0">{report.summary.high}</Badge>
              <span className="tab-indicator" />
            </TabsTrigger>
            <TabsTrigger value="medium" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5 rounded-xl px-4 py-2.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground/80 transition-all relative">
              <AlertTriangle className="h-3.5 w-3.5 hidden sm:block" />متوسط
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] h-4 rounded-full px-1.5 min-w-[18px] flex items-center justify-center border-0">{report.summary.medium}</Badge>
              <span className="tab-indicator" />
            </TabsTrigger>
            <TabsTrigger value="fixes" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5 rounded-xl px-4 py-2.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground/80 transition-all relative">
              <Wrench className="h-3.5 w-3.5 hidden sm:block" />إصلاحات
              <span className="tab-indicator" />
            </TabsTrigger>
            <TabsTrigger value="pi-network" className="flex-1 min-w-0 text-xs sm:text-sm gap-1.5 rounded-xl px-4 py-2.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground/80 transition-all relative">
              <Globe className="h-3.5 w-3.5 hidden sm:block" />شبكة بي
              <span className="tab-indicator" />
            </TabsTrigger>
          </TabsList>

          {/* ──── OVERVIEW TAB ──────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">

            {/* Row 1: FixProgress + Gauge + ActivityTimeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <FixProgressCard issues={dbIssues.length > 0 ? dbIssues : []} />
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardContent className="p-4 flex items-center justify-center">
                  <FixProgressGauge
                    fixed={dbIssues.filter((i) => i.status === "fixed").length}
                    total={dbIssues.length || 95}
                    showHeader={false}
                  />
                </CardContent>
              </Card>
              <ActivityTimeline />
            </div>

            {/* Row 2: Trend + Radar + ScoreRings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SeverityTrendChart />
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardContent className="p-4">
                  <SecurityRadarChart
                    scores={{
                      الأمان: report.scores.backend.security,
                      البنية: report.scores.backend.architecture,
                      "جودة الكود": report.scores.backend.codeQuality,
                      التشفير: Math.round((report.scores.backend.security + report.scores.frontend.security) / 2),
                      المصادقة: report.scores.backend.security,
                      الأداء: report.scores.backend.codeQuality,
                    }}
                    showHeader={false}
                  />
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                  <CardContent className="p-4 flex flex-col items-center">
                    <ScoreRing score={report.scores.backend.overall} label="الخادم" size={100} />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                  <CardContent className="p-4 flex flex-col items-center">
                    <ScoreRing score={report.scores.frontend.overall} label="الواجهة الأمامية" size={100} />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                  <CardContent className="p-4 flex flex-col items-center">
                    <ScoreRing score={report.scores.piNetwork.overall} label="شبكة بي" size={100} />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                  <CardContent className="p-4 flex flex-col items-center">
                    <ScoreRing score={report.scores.overall} label="النتيجة العامة" size={100} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 3: Comparison + Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardHeader className="pb-3">
                  <PiSectionHeader icon={<Server className="h-4 w-4" />}>درجات الخادم</PiSectionHeader>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <LabeledProgress label="جودة الكود" value={report.scores.backend.codeQuality} />
                  <LabeledProgress label="الأمان" value={report.scores.backend.security} />
                  <LabeledProgress label="البنية" value={report.scores.backend.architecture} />
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardHeader className="pb-3">
                  <PiSectionHeader icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                  }>
                    توزيع المشاكل حسب الخطورة
                  </PiSectionHeader>
                </CardHeader>
                <CardContent className="flex justify-center pt-0">
                  <DonutChart data={donutData} size={180} />
                </CardContent>
              </Card>
            </div>

            <Separator className="my-2" />

            {/* Score Comparison Chart */}
            <ScoreComparisonChart
              backend={report.scores.backend}
              frontend={report.scores.frontend}
              piNetwork={report.scores.piNetwork}
              overall={report.scores.overall}
            />

            {/* Category Treemap — full width */}
            <CategoryTreemapChart
              data={(report.categoryBreakdown ?? []).map((c) => ({
                name: c.category,
                size: c.total,
                critical: c.critical,
                high: c.high,
              }))}
            />

            {/* Category breakdown + File heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardHeader className="pb-3">
                  <PiSectionHeader icon={<BarChart3 className="h-4 w-4" />}>توزيع المشاكل حسب الفئة</PiSectionHeader>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="w-full" style={{ maxHeight: 400 }}>
                    <HorizontalBarChart data={categoryBarData} />
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardHeader className="pb-3">
                  <PiSectionHeader icon={<FileCode2 className="h-4 w-4" />}>خريطة الملفات الأكثر مشاكل</PiSectionHeader>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="w-full" style={{ maxHeight: 400 }}>
                    <HorizontalBarChart data={fileHeatData} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-2" />

            {/* Security Zones — full width */}
            <SecurityZones
              report={report}
              securityOpen={securityOpen}
              onToggleZone={toggleZone}
              onOpenIssue={(issue) => openSheet(issue, "CRITICAL")}
            />

            {/* Recommendations + Architecture */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardHeader className="pb-3">
                  <PiSectionHeader icon={<Target className="h-4 w-4" />}>التوصيات حسب الأولوية</PiSectionHeader>
                </CardHeader>
                <CardContent className="pt-0">
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
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardHeader className="pb-3">
                  <PiSectionHeader icon={<Activity className="h-4 w-4" />}>مشاكل البنية المعمارية</PiSectionHeader>
                </CardHeader>
                <CardContent className="pt-2 space-y-3">
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
            </div>

            {/* Code Quality + Tech Stack */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardHeader className="pb-3">
                  <PiSectionHeader icon={<Code2 className="h-4 w-4" />}>جودة الكود</PiSectionHeader>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
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
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardHeader className="pb-3">
                  <PiSectionHeader icon={<Cpu className="h-4 w-4" />}>التقنيات المستخدمة</PiSectionHeader>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {report.meta.techStack.map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs px-3 py-1 font-medium">{tech}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-2" />

            {/* Gamification — full width */}
            <GamificationPanel />
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
                <CriticalIssueCard
                  key={issue.id}
                  issue={issue}
                  index={i}
                  onSelect={(iss) => openSheet(iss, "CRITICAL")}
                  dbIssue={dbIssueMap.get(issue.id)}
                  onStatusChange={handleStatusChange}
                  onAiAnalysis={handleAiAnalysis}
                />
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
            <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
              <CardContent className="p-2">
                {filteredHigh.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={{ ...issue, severity: "HIGH" }}
                    onClick={() => {
                      const fakeIssue: Issue = { id: issue.id, source: issue.source, file: issue.file, line: issue.line || 0, category: issue.category, title: issue.title, description: "", recommendation: "" };
                      openSheet(fakeIssue, "HIGH", true);
                    }}
                    dbIssue={dbIssueMap.get(issue.id)}
                    onStatusChange={handleStatusChange}
                    onAiAnalysis={handleAiAnalysis}
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
            <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
              <CardContent className="p-2">
                {filteredMedium.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={{ ...issue, severity: "MEDIUM" }}
                    onClick={() => {
                      const fakeIssue: Issue = { id: issue.id, source: issue.source, file: issue.file, line: issue.line || 0, category: issue.category, title: issue.title, description: "", recommendation: "" };
                      openSheet(fakeIssue, "MEDIUM", true);
                    }}
                    dbIssue={dbIssueMap.get(issue.id)}
                    onStatusChange={handleStatusChange}
                    onAiAnalysis={handleAiAnalysis}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──── FIXES TAB ─────────────────────────────────────────── */}
          <TabsContent value="fixes" className="space-y-6">
            {/* Progress + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FixProgressCard issues={dbIssues.length > 0 ? dbIssues : []} />
              <FixTimeline />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="بحث في جميع المشاكل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 h-10 text-sm"
                  aria-label="بحث في المشاكل"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-10 text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
                aria-label="تصفية حسب الحالة"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="open">مفتوح</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="fixed">تم الإصلاح</option>
                <option value="wont_fix">لن يُصلح</option>
                <option value="accepted_risk">مخاطر مقبولة</option>
              </select>
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

            <p className="text-xs text-muted-foreground">{fixesFilteredIssues.length} مشكلة</p>

            {/* Issues List */}
            {issuesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">جاري تحميل بيانات الإصلاحات...</p>
                </div>
              </div>
            ) : (
              <Card className="rounded-2xl border border-border/50 hover:border-border/80 transition-colors duration-300">
                <CardContent className="p-2">
                  {fixesFilteredIssues.map((dbIssue) => {
                    const fakeIssue: Issue = {
                      id: dbIssue.issueId,
                      source: dbIssue.source,
                      file: dbIssue.file,
                      line: dbIssue.line,
                      category: dbIssue.category,
                      title: dbIssue.title,
                      description: dbIssue.description,
                      recommendation: dbIssue.recommendation,
                    };
                    return (
                      <IssueRow
                        key={dbIssue.issueId}
                        issue={{ ...fakeIssue, severity: dbIssue.severity }}
                        onClick={() => openSheet(fakeIssue, dbIssue.severity, !dbIssue.description)}
                        dbIssue={dbIssue}
                        onStatusChange={handleStatusChange}
                        onAiAnalysis={handleAiAnalysis}
                      />
                    );
                  })}
                  {fixesFilteredIssues.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ──── PI NETWORK TAB ────────────────────────────────────── */}
          <TabsContent value="pi-network" className="space-y-6">

            {/* Pi Wallet Card */}
            <PiWalletCard />

            {/* Pi Ecosystem Stats */}
            <PiEcosystemStats />

            {/* Pi Compliance Checker */}
            <PiComplianceChecker />

            {/* Subscription Plans */}
            <div className="space-y-4">
              <PiSectionHeader icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L3 7v5c0 5.25 3.83 10.16 9 11.25C17.17 22.16 21 17.25 21 12V7l-9-5z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>}>خطط الاشتراك</PiSectionHeader>
              {piUser && (
                <div className="flex items-center gap-2">
                  <Badge className="pi-gradient text-white border-0 text-[10px] font-bold px-2.5 py-0.5">
                    خطة حالية: مجاني
                  </Badge>
                </div>
              )}
              <SubscriptionCards currentTier={currentTier} />
            </div>

            {/* Live Pi Network Monitoring Dashboard */}
            <PiNetworkMonitor />
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
          AI ANALYSIS DIALOG
         ═══════════════════════════════════════════════════════════════ */}
      <AiAnalysisDialog
        issue={aiDialogIssue}
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
      />

      {/* ═══════════════════════════════════════════════════════════════
          QUICK ACTIONS FAB
         ═══════════════════════════════════════════════════════════════ */}
      <QuickActions
        onQuickAiAnalysis={(issue) => {
          setAiDialogIssue(issue);
          setAiDialogOpen(true);
        }}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ["issues"] });
          queryClient.invalidateQueries({ queryKey: ["timeline"] });
          toast.success("تم تحديث البيانات");
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════
          AI ADVISOR CHAT
         ═══════════════════════════════════════════════════════════════ */}
      <AiAdvisorChat />

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════════════ */}
      <AppFooter />
    </div>
    </PiAuthGate>
  );
}