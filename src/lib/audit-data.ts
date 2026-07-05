/* ════════════════════════════════════════════════════════════════════════════
   AUDIT DATA — Types, Constants, Helpers, Export Utilities
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Types ────────────────────────────────────────────────────────────── */

export interface Issue {
  id: string;
  source: string;
  file: string;
  line: number;
  category: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface IssueBrief {
  id: string;
  source: string;
  file: string;
  line?: number;
  category: string;
  title: string;
}

export interface AuditReport {
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
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    blockingDeployment: number;
  };
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
  categoryBreakdown: { category: string; critical: number; high: number; medium: number; low: number; total: number }[];
  fileHeatmap: { file: string; critical: number; high: number; medium: number; low: number; total: number }[];
}

/* ── Shared Card Classes ──────────────────────────────────────────────── */

export const CARD_DEPTH =
  "shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] " +
  "dark:shadow-[0_1px_3px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] " +
  "dark:bg-gradient-to-b dark:from-[oklch(0.22_0_0)] dark:to-[oklch(0.18_0_0)] " +
  "hover:dark:shadow-[0_2px_6px_rgba(0,0,0,0.5),0_12px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] " +
  "hover:-translate-y-[1px] transition-all duration-300";

export const GLASS_STAT =
  "dark:bg-white/[0.03] dark:backdrop-blur-xl dark:border-white/[0.06] " + CARD_DEPTH;

/* ── Score Color Helpers ──────────────────────────────────────────────── */

export function getScoreColors(score: number) {
  if (score >= 81)
    return { stroke: "#16a34a", bg: "rgba(22,163,74,0.08)", text: "text-green-600 dark:text-green-400", glow: "rgba(22,163,74,0.3)", bgClass: "bg-green-50/20 dark:bg-green-50/20" };
  if (score >= 61)
    return { stroke: "#059669", bg: "rgba(5,150,105,0.08)", text: "text-emerald-500 dark:text-emerald-400", glow: "rgba(5,150,105,0.3)", bgClass: "bg-emerald-50/20 dark:bg-emerald-50/20" };
  if (score >= 41)
    return { stroke: "#d97706", bg: "rgba(217,119,6,0.08)", text: "text-amber-500 dark:text-amber-400", glow: "rgba(217,119,6,0.3)", bgClass: "bg-amber-50/20 dark:bg-amber-50/20" };
  if (score >= 26)
    return { stroke: "#ea580c", bg: "rgba(234,88,12,0.08)", text: "text-orange-500 dark:text-orange-400", glow: "rgba(234,88,12,0.3)", bgClass: "bg-orange-50/20 dark:bg-orange-50/20" };
  return { stroke: "#dc2626", bg: "rgba(220,38,38,0.08)", text: "text-red-600 dark:text-red-400", glow: "rgba(220,38,38,0.3)", bgClass: "bg-red-50/20 dark:bg-red-50/20" };
}

export function getProgressColors(value: number) {
  if (value >= 81) return { text: "text-green-600 dark:text-green-400", bar: "[&>div]:bg-green-500" };
  if (value >= 61) return { text: "text-emerald-600 dark:text-emerald-400", bar: "[&>div]:bg-emerald-500" };
  if (value >= 41) return { text: "text-amber-600 dark:text-amber-400", bar: "[&>div]:bg-amber-500" };
  if (value >= 26) return { text: "text-orange-600 dark:text-orange-400", bar: "[&>div]:bg-orange-500" };
  return { text: "text-red-600 dark:text-red-400", bar: "[&>div]:bg-red-500" };
}

/* ── Security Zones Config ────────────────────────────────────────────── */

import {
  Bug, Lock, Terminal, Eye, Radio, TriangleAlert,
  ShieldX, Globe, Server,
} from "lucide-react";

export const SECURITY_ZONES = [
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

/* ── Export Utilities ─────────────────────────────────────────────────── */

export function exportJSON(report: AuditReport) {
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

  const blob = new Blob(
    [JSON.stringify({ meta: report.meta, summary: report.summary, issues: all }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ledgererp-audit.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(report: AuditReport) {
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

  const headers = "ID,Severity,Source,File,Line,Category,Title,Description,Recommendation";
  const rows = all.map((i) =>
    [
      i.id, i.severity, i.source, i.file, i.line, i.category,
      `"${(i.title || "").replace(/"/g, '""')}"`,
      `"${((i as Issue).description || "").replace(/"/g, '""')}"`,
      `"${((i as Issue).recommendation || "").replace(/"/g, '""')}"`,
    ].join(","),
  );
  const blob = new Blob(
    ["\uFEFF" + headers + "\n" + rows.join("\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ledgererp-audit.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(report: AuditReport) {
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
  navigator.clipboard.writeText(
    JSON.stringify({ meta: report.meta, summary: report.summary, issues: all }, null, 2),
  );
}