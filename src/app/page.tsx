"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  AlertTriangle,
  Bug,
  Code2,
  Server,
  Globe,
  LayoutGrid,
  FileWarning,
  Terminal,
  Lock,
  Eye,
  XCircle,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Github,
  Zap,
  Target,
  Layers,
  Cpu,
  Gauge,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditReport {
  meta: {
    projectName: string;
    repository: string;
    description: string;
    auditDate: string;
    totalFiles: number;
    totalLines: string;
    techStack: string[];
  };
  scores: {
    backend: { codeQuality: number; security: number; architecture: number; overall: number };
    frontend: { codeQuality: number; security: number; piCompliance: number; overall: number };
    piNetwork: {
      manifestCompliance: number;
      domainVerification: number;
      apiKeyManagement: number;
      paymentFlow: number;
      kycKyb: number;
      deploymentReadiness: number;
      nonCustodial: number;
      overall: number;
    };
    overall: number;
  };
  summary: { totalIssues: number; critical: number; high: number; medium: number; low: number; blockingDeployment: number };
  criticalFindings: Issue[];
  highIssues: IssueBrief[];
  mediumIssues: IssueBrief[];
  piNetworkCompliance: {
    blockingIssues: string[];
    manifestIssues: string[];
    deploymentIssues: string[];
    securityHeaders: string[];
  };
  codeQuality: {
    largestFiles: { file: string; size: number; lines: number }[];
    todoFixme: { file: string; text: string }[];
    emptyFiles: string[];
    incompleteFiles: string[];
  };
  architectureProblems: { title: string; description: string }[];
  recommendations: { priority: number; title: string; effort: string; impact: string }[];
}

interface Issue {
  id: string;
  source: string;
  file: string;
  line: number;
  category: string;
  title: string;
  description: string;
  recommendation: string;
}

interface IssueBrief {
  id: string;
  source: string;
  file: string;
  line: number;
  category: string;
  title: string;
}

// ─── Components ───────────────────────────────────────────────────────────────

function ScoreRing({ score, label, size = 120 }: { score: number; label: string; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : score >= 40 ? "text-orange-500" : "text-red-500";
  const strokeColor =
    score >= 80 ? "stroke-emerald-500" : score >= 60 ? "stroke-amber-500" : score >= 40 ? "stroke-orange-500" : "stroke-red-500";
  const bgColor =
    score >= 80 ? "bg-emerald-500/10" : score >= 60 ? "bg-amber-500/10" : score >= 40 ? "bg-orange-500/10" : "bg-red-500/10";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative rounded-full ${bgColor} p-2`}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={`${strokeColor} transition-all duration-1000 ease-out`}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${color}`}>
          {score}
        </span>
      </div>
      <span className="text-xs font-medium text-muted-foreground text-center max-w-[100px]">{label}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, { className: string; icon: React.ReactNode }> = {
    CRITICAL: { className: "bg-red-500/15 text-red-600 border-red-500/30", icon: <XCircle className="h-3 w-3" /> },
    HIGH: { className: "bg-orange-500/15 text-orange-600 border-orange-500/30", icon: <AlertTriangle className="h-3 w-3" /> },
    MEDIUM: { className: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: <ShieldAlert className="h-3 w-3" /> },
    LOW: { className: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: <ShieldCheck className="h-3 w-3" /> },
  };
  const v = variants[severity] || variants.LOW;
  return (
    <Badge variant="outline" className={`${v.className} gap-1 text-[10px] font-semibold`}>
      {v.icon}
      {severity}
    </Badge>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    Backend: "bg-violet-500/15 text-violet-600 border-violet-500/30",
    Frontend: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
    "Pi Network": "bg-purple-500/15 text-purple-600 border-purple-500/30",
  };
  return (
    <Badge variant="outline" className={`${colors[source] || ""} text-[10px] font-semibold`}>
      {source}
    </Badge>
  );
}

function CriticalIssueCard({ issue, index }: { issue: Issue; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const categoryColors: Record<string, string> = {
    "Hardcoded Secret": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    "Authentication Bypass": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    "Authorization Bypass": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    "XSS - Stored": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    "XSS - DOM": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    "Insecure Storage": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
    "Weak Cryptography": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
    "Runtime Crash": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    "Custodial Architecture": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    "postMessage Vulnerability": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    "Pi SDK Bug": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    "Supply Chain": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    "Fake KYC": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    "Rate Limiting Bypass": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    "Domain Verification": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    Deployment: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-300 hover:shadow-md ${
        index < 7
          ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
          : "border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-600 dark:text-red-400 font-bold text-xs">{index + 1}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <SeverityBadge severity="CRITICAL" />
            <SourceBadge source={issue.source} />
            <Badge
              variant="outline"
              className={`text-[10px] font-medium ${categoryColors[issue.category] || "bg-gray-100 text-gray-800"}`}
            >
              {issue.category}
            </Badge>
            {index < 7 && (
              <Badge className="bg-red-600 text-white text-[10px] animate-pulse">BLOCKS DEPLOYMENT</Badge>
            )}
          </div>
          <h4 className="font-semibold text-sm mb-1">{issue.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Code2 className="h-3 w-3" />
            <span className="font-mono">{issue.file}</span>
            {issue.line > 0 && <span>Line {issue.line}</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{issue.description}</p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
          >
            {expanded ? (
              <>
                Hide Fix <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Show Fix <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
          {expanded && (
            <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                {issue.recommendation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IssueRow({ issue, severity }: { issue: IssueBrief; severity: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <code className="text-xs font-mono text-muted-foreground flex-shrink-0 w-36 truncate">{issue.file}</code>
      {issue.line > 0 && (
        <code className="text-xs font-mono text-muted-foreground/70 flex-shrink-0">:{issue.line}</code>
      )}
      <span className="text-xs text-muted-foreground flex-shrink-0 w-28 truncate">{issue.category}</span>
      <span className="text-xs font-medium truncate flex-1">{issue.title}</span>
      <SourceBadge source={issue.source} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AuditDashboard() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, []);

  const getScoreColor = useCallback((score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  }, []);

  const getScoreBg = useCallback((score: number) => {
    if (score >= 80) return "from-emerald-500 to-emerald-600";
    if (score >= 60) return "from-amber-500 to-amber-600";
    if (score >= 40) return "from-orange-500 to-orange-600";
    return "from-red-500 to-red-600";
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading audit report...</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <ShieldX className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Security Audit Report</h1>
              <p className="text-xs text-muted-foreground">
                {report.meta.projectName} • {new Date(report.meta.auditDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-xs">
              <Github className="h-3 w-3" />
              {report.meta.totalFiles} files
            </Badge>
            <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-xs">
              <Layers className="h-3 w-3" />
              {report.meta.totalLines} lines
            </Badge>
            <a href={report.meta.repository} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="h-3 w-3" />
                GitHub
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Verdict Banner ─────────────────────────────────────────────────── */}
        <div className={`rounded-2xl p-6 mb-6 bg-gradient-to-r ${getScoreBg(report.scores.overall)} text-white shadow-xl`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ShieldX className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">NOT READY FOR DEPLOYMENT</h2>
                <p className="text-white/80 text-sm mt-1 max-w-xl">
                  This project has {report.summary.critical} critical vulnerabilities, {report.summary.blockingDeployment} blocking issues, 
                  and an overall score of {report.scores.overall}/100. Immediate action required before any production deployment.
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black">{report.scores.overall}</div>
              <div className="text-white/70 text-xs font-medium">OVERALL SCORE</div>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={XCircle}
            label="Critical Issues"
            value={report.summary.critical}
            color="bg-red-500"
          />
          <StatCard
            icon={AlertTriangle}
            label="High Issues"
            value={report.summary.high}
            color="bg-orange-500"
          />
          <StatCard
            icon={ShieldAlert}
            label="Total Issues"
            value={report.summary.totalIssues}
            sub={`${report.summary.medium} medium • ${report.summary.low} low`}
            color="bg-amber-500"
          />
          <StatCard
            icon={Bug}
            label="Blocking Deploy"
            value={report.summary.blockingDeployment}
            color="bg-rose-500"
          />
        </div>

        {/* ── Main Tabs ──────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="overview" className="text-xs py-2 gap-1.5">
              <Gauge className="h-3.5 w-3.5 hidden sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="critical" className="text-xs py-2 gap-1.5">
              <ShieldX className="h-3.5 w-3.5 hidden sm:block" />
              Critical
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs py-2 gap-1.5">
              <Lock className="h-3.5 w-3.5 hidden sm:block" />
              Security
            </TabsTrigger>
            <TabsTrigger value="architecture" className="text-xs py-2 gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5 hidden sm:block" />
              Architecture
            </TabsTrigger>
            <TabsTrigger value="pi-network" className="text-xs py-2 gap-1.5">
              <Globe className="h-3.5 w-3.5 hidden sm:block" />
              Pi Network
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Score Dashboard */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Quality Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="flex flex-col items-center">
                    <ScoreRing score={report.scores.overall} label="Overall" size={110} />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={report.scores.backend.overall} label="Backend" size={100} />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={report.scores.frontend.overall} label="Frontend" size={100} />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={report.scores.piNetwork.overall} label="Pi Network" size={100} />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={report.scores.backend.security} label="Security" size={100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Scores Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="h-4 w-4 text-violet-500" />
                    Backend Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Code Quality", value: report.scores.backend.codeQuality },
                    { label: "Security", value: report.scores.backend.security },
                    { label: "Architecture", value: report.scores.backend.architecture },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-semibold ${getScoreColor(item.value)}`}>{item.value}/100</span>
                      </div>
                      <Progress value={item.value} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-cyan-500" />
                    Frontend Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Code Quality", value: report.scores.frontend.codeQuality },
                    { label: "Security", value: report.scores.frontend.security },
                    { label: "Pi Compliance", value: report.scores.frontend.piCompliance },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-semibold ${getScoreColor(item.value)}`}>{item.value}/100</span>
                      </div>
                      <Progress value={item.value} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Pi Network Scores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  Pi Network Compliance Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {Object.entries(report.scores.piNetwork)
                    .filter(([k]) => k !== "overall")
                    .map(([key, value]) => {
                      const labels: Record<string, string> = {
                        manifestCompliance: "Manifest",
                        domainVerification: "Domain Verify",
                        apiKeyManagement: "API Keys",
                        paymentFlow: "Payment Flow",
                        kycKyb: "KYC/KYB",
                        deploymentReadiness: "Deployment",
                        nonCustodial: "Non-Custodial",
                      };
                      return (
                        <div key={key} className="text-center">
                          <div
                            className={`text-2xl font-bold ${getScoreColor(value as number)}`}
                          >
                            {value as number}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{labels[key]}</p>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Top Recommendations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  Top 10 Priority Actions
                </CardTitle>
                <CardDescription>Ordered by impact — fix these first to unblock deployment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.recommendations.slice(0, 10).map((rec, i) => (
                    <div
                      key={rec.priority}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          rec.impact === "Critical"
                            ? "bg-red-500"
                            : rec.impact === "High"
                              ? "bg-orange-500"
                              : "bg-amber-500"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium flex-1">{rec.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          rec.effort === "Small"
                            ? "text-emerald-600 border-emerald-300"
                            : rec.effort === "Medium"
                              ? "text-amber-600 border-amber-300"
                              : "text-red-600 border-red-300"
                        }`}
                      >
                        {rec.effort}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Project Tech Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {report.meta.techStack.map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Critical Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="critical" className="space-y-4">
            <Card className="border-red-200 dark:border-red-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <ShieldX className="h-4 w-4" />
                  {report.criticalFindings.length} Critical Vulnerabilities
                </CardTitle>
                <CardDescription>
                  These must be fixed immediately. The first 7 issues block Pi Network deployment entirely.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.criticalFindings.map((issue, i) => (
                    <CriticalIssueCard key={issue.id} issue={issue} index={i} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* High Issues */}
            <Card className="border-orange-200 dark:border-orange-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  {report.highIssues.length} High Severity Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5 divide-y">
                  {report.highIssues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} severity="HIGH" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Medium Issues */}
            <Card className="border-amber-200 dark:border-amber-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                  <ShieldAlert className="h-4 w-4" />
                  {report.mediumIssues.length} Medium Severity Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5 divide-y">
                  {report.mediumIssues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} severity="MEDIUM" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Security Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="security" className="space-y-4">
            {/* Security Categories */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4 text-red-500" />
                    XSS Vulnerabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      "b2b.js - innerHTML merchant data injection",
                      "hardware.js - receipt HTML injection",
                      "invoice.js - addItem DOMPurify bypass",
                      "deep-linking.js - URL param injection",
                      "ui-utils.js - iframe with arbitrary src",
                      "ui-utils.js - Modal.prompt() HTML injection",
                      "security.js - DOMPurify fallback insufficient",
                      "shift-management.js - report innerHTML injection",
                      "audit-logs.js - double HTML encoding bug",
                    ].map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lock className="h-4 w-4 text-orange-500" />
                    Authentication & Authorization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      "KYB middleware - unauthenticated requests pass through",
                      "SSE notifications - zero authentication required",
                      "Blockchain data - no merchant ownership check",
                      "Rate limiting - bypassed via User-Agent header",
                      "KYC - always returns fake completed status",
                      "Refund auth - browser confirm() only, no server check",
                      "Pi tokens - stored raw in memory and Redis",
                    ].map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <XCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Cryptography Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      "Hardcoded signing secret: 'super_secret_signing_key_change_me'",
                      "SHA256 instead of HMAC for subscription signatures",
                      "Fallback mnemonic: 55 bits vs required 128 bits entropy",
                      "Static PBKDF2 salts (same for all users)",
                      "PIN stored as plaintext in IndexedDB",
                      "No SRI on CDN resources (Chart.js, QRious, Font Awesome)",
                      "Unpkg.com script loaded without integrity check",
                    ].map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <XCircle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-violet-500" />
                    Insecure Storage & Data Handling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      "Transaction data in localStorage (unencrypted)",
                      "Stellar public key in localStorage (no integrity)",
                      "Merchant ID fallback to 'anonymous'",
                      "Offline sync queue in plain localStorage",
                      "Canvas fingerprinting for device ID",
                      "Payment URL exposed in alert() on error",
                      "Invoice ID uses Math.random() not crypto API",
                    ].map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <XCircle className="h-3 w-3 text-violet-500 flex-shrink-0" />
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Architecture Tab ─────────────────────────────────────────────── */}
          <TabsContent value="architecture" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Architecture Problems */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-red-500" />
                    Architecture Problems
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {report.architectureProblems.map((prob, i) => (
                    <div key={i} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                      <h4 className="text-sm font-semibold mb-1">{prob.title}</h4>
                      <p className="text-xs text-muted-foreground">{prob.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Largest Files */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-500" />
                    Largest Files (Code Smell)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {report.codeQuality.largestFiles.map((f) => {
                    const maxSize = report.codeQuality.largestFiles[0].size;
                    const pct = (f.size / maxSize) * 100;
                    return (
                      <div key={f.file} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <code className="text-xs font-mono text-muted-foreground truncate max-w-[220px]">
                            {f.file}
                          </code>
                          <span className="text-[10px] text-muted-foreground">
                            {(f.size / 1024).toFixed(0)}KB • {f.lines} lines
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* TODOs and Incomplete Code */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-amber-500" />
                    TODO/FIXME & Incomplete Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.codeQuality.todoFixme.map((todo, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                      <code className="font-mono text-amber-700 dark:text-amber-400 flex-shrink-0 w-28 truncate">
                        {todo.file}
                      </code>
                      <span className="text-muted-foreground">{todo.text}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Empty/Incomplete Files
                  </p>
                  {report.codeQuality.emptyFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <XCircle className="h-3 w-3 text-red-400" />
                      {f}
                    </div>
                  ))}
                  {report.codeQuality.incompleteFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      {f}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* All Recommendations */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-500" />
                    All Recommendations ({report.recommendations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-1.5">
                      {report.recommendations.map((rec) => (
                        <div
                          key={rec.priority}
                          className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/50"
                        >
                          <span className="w-5 text-center font-bold text-muted-foreground">{rec.priority}</span>
                          <ArrowRight className={`h-3 w-3 flex-shrink-0 ${
                            rec.impact === "Critical" ? "text-red-500" : rec.impact === "High" ? "text-orange-500" : "text-amber-500"
                          }`} />
                          <span className="flex-1 truncate">{rec.title}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] flex-shrink-0 ${
                              rec.effort === "Small"
                                ? "text-emerald-600"
                                : rec.effort === "Medium"
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {rec.effort}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Pi Network Tab ───────────────────────────────────────────────── */}
          <TabsContent value="pi-network" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Blocking Issues */}
              <Card className="border-red-200 dark:border-red-900/50 md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    {report.piNetworkCompliance.blockingIssues.length} Blocking Issues
                  </CardTitle>
                  <CardDescription>
                    These issues must ALL be resolved before Pi Network will approve the app
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {report.piNetworkCompliance.blockingIssues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50"
                      >
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{issue}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Deployment Issues */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="h-4 w-4 text-orange-500" />
                    Deployment Issues
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.piNetworkCompliance.deploymentIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-orange-50 dark:bg-orange-950/20">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Security Headers */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Missing Security Headers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.piNetworkCompliance.securityHeaders.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Manifest Issues */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-violet-500" />
                    Manifest Compliance Issues
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.piNetworkCompliance.manifestIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-violet-50 dark:bg-violet-950/20">
                      <AlertTriangle className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Non-Custodial Claim Analysis */}
              <Card className="md:col-span-2 border-red-200 dark:border-red-900/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                    <ShieldX className="h-4 w-4" />
                    Non-Custodial Claim Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-red-700 dark:text-red-400 mb-2">
                          CLAIM IS FALSE — System is Fundamentally Custodial
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          The README, SECURITY.md, and manifest all claim this is a &ldquo;non-custodial&rdquo; system. 
                          However, the backend deterministically derives ALL user Stellar secret keys from 
                          <code className="mx-1 px-1 py-0.5 bg-red-100 dark:bg-red-900/50 rounded text-red-700 dark:text-red-400 font-mono text-[10px]">
                            SHA256(SECRET_KEY:UID)
                          </code>
                          and handles all transaction signing server-side. If the master secret leaks, 
                          every user wallet on the platform is compromised. This is the definition of a custodial system.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-red-100 text-red-700 text-[10px] border-red-200">FALSE CLAIM</Badge>
                          <Badge className="bg-red-100 text-red-700 text-[10px] border-red-200">SECURITY BY OBSCURITY</Badge>
                          <Badge className="bg-red-100 text-red-700 text-[10px] border-red-200">SINGLE POINT OF FAILURE</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mt-12 border-t bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Ledgererp Security Audit Report</p>
              <p>Generated on {new Date(report.meta.auditDate).toLocaleString()}</p>
              <p className="mt-1">
                {report.meta.totalFiles} files analyzed • {report.meta.totalLines} lines of code • {report.summary.totalIssues} issues found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <ShieldX className="h-3 w-3 text-red-500" />
                {report.summary.critical} Critical
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                {report.summary.high} High
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <ShieldAlert className="h-3 w-3 text-amber-500" />
                {report.summary.medium} Medium
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}