"use client";

import { ScoreRing } from "@/components/charts/ScoreRing";
import { AuditReport, CARD_DEPTH } from "@/lib/audit-data";
import { ShieldCheck, AlertTriangle, XCircle } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   VERDICT BANNER — Revolutionary Visual Upgrade
   Gradient mesh background, animated gradient border, pi-gradient-text score,
   and subtle particle/star CSS effect.
   ════════════════════════════════════════════════════════════════════════════ */

export function VerdictBanner({ report }: { report: AuditReport }) {
  const verdictColor = report.scores.overall >= 61
    ? "text-green-600 dark:text-green-400"
    : report.scores.overall >= 41
      ? "text-amber-600 dark:text-amber-400"
      : report.scores.overall >= 26
        ? "text-orange-600 dark:text-orange-400"
        : "text-red-600 dark:text-red-400";

  const verdictText = report.scores.overall >= 61
    ? "مقبول بشروط — يحتاج تحسينات أمنية"
    : report.scores.overall >= 41
      ? "ضعيف — يتطلب إصلاحات عاجلة"
      : report.scores.overall >= 26
        ? "حرج — غير آمن للنشر"
        : "خطير — ثغرات قاتلة";

  const verdictIcon = report.scores.overall >= 61
    ? <ShieldCheck className="h-6 w-6" />
    : report.scores.overall >= 41
      ? <AlertTriangle className="h-6 w-6" />
      : <XCircle className="h-6 w-6" />;

  /* Generate 12 particle stars for the background */
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    top: `${8 + Math.sin(i * 1.7) * 30 + 20}%`,
    left: `${5 + ((i * 37) % 90)}%`,
    size: 1 + (i % 3),
    delay: `${(i * 0.4) % 4}s`,
    duration: `${3 + (i % 3)}s`,
  }));

  return (
    <div className="verdict-banner-wrapper relative rounded-2xl">
      {/* Animated gradient border wrapper */}
      <div className="absolute -inset-[1px] rounded-2xl overflow-hidden animate-verdict-border-spin">
        <div className="absolute inset-0" style={{
          background: "conic-gradient(from 0deg, oklch(0.55 0.25 295 / 60%), oklch(0.75 0.18 80 / 40%), oklch(0.55 0.25 295 / 20%), oklch(0.75 0.18 80 / 60%), oklch(0.55 0.25 295 / 60%))",
          filter: "blur(1px)",
        }} />
      </div>

      {/* Main banner content */}
      <div
        className="verdict-banner relative rounded-2xl border-0 p-5 sm:p-6 overflow-hidden z-10"
        style={{
          background: [
            "radial-gradient(ellipse at 20% 50%, oklch(0.55 0.25 295 / 15%) 0%, transparent 50%)",
            "radial-gradient(ellipse at 80% 50%, oklch(0.75 0.18 80 / 10%) 0%, transparent 50%)",
            "linear-gradient(135deg, oklch(0.15 0.01 280) 0%, oklch(0.12 0 0) 100%)",
          ].join(", "),
          backdropFilter: "blur(16px) saturate(1.3)",
          WebkitBackdropFilter: "blur(16px) saturate(1.3)",
        }}
      >
        {/* Particle / star effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-white/20 dark:bg-white/15 animate-particle-twinkle"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${verdictColor}`}>
            {verdictIcon}
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-right">
            <h2 className="text-lg sm:text-xl font-black mb-1">
              حكم الأمان العام:{" "}
              <span className={report.scores.overall > 50 ? "pi-gradient-text" : verdictColor}>
                {report.scores.overall}/100
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">{verdictText}</p>
          </div>
          <div className="flex-shrink-0 hidden md:flex">
            <ScoreRing score={report.scores.overall} label="النتيجة العامة" size={90} />
          </div>
        </div>
      </div>
    </div>
  );
}