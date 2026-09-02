"use client";

import { Separator } from "@/components/ui/separator";

/* ════════════════════════════════════════════════════════════════════════════
   APP FOOTER — Pi-branded, professional, sticky to bottom
   ════════════════════════════════════════════════════════════════════════════ */

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/30 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand column */}
          <div className="sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, oklch(0.55 0.25 295), oklch(0.40 0.20 280))" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.5 15.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5" />
                </svg>
              </div>
              <span className="font-bold text-sm">Ledgererp</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
              منصة التدقيق الأمني الشاملة لنظام ERP على شبكة Pi Network.
              تحليل ذكي بالذكاء الاصطناعي مع تتبع الإصلاحات في الوقت الفعلي.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              روابط سريعة
            </h4>
            <ul className="space-y-2">
              {[
                { label: "نظرة عامة", href: "#" },
                { label: "المشاكل الحرجة", href: "#" },
                { label: "شبكة بي", href: "#" },
                { label: "المستشار الذكي", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-xs text-muted-foreground/70 hover:text-primary transition-colors"
                    onClick={(e) => e.preventDefault()}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Pi Network */}
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Pi Network
            </h4>
            <ul className="space-y-2">
              {[
                { label: "حول شبكة بي", href: "https://minepi.com" },
                { label: "Pi Developer Portal", href: "https://develop.pinet.com" },
                { label: "Pi Browser", href: "https://browser.minepi.com" },
                { label: "GitHub Repository", href: "https://github.com/Mirxou/Ledgererp" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <svg className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Bottom bar */}
        <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground/50">
            © {new Date().getFullYear()} Ledgererp — مُبنية على شبكة Pi Network
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-primary text-xs font-bold">π</span>
            <span className="text-[10px] text-muted-foreground/40">
              Pi Mainnet Ecosystem App
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}