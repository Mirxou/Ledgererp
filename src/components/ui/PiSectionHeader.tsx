"use client";

import type { ReactNode } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   PI SECTION HEADER
   Reusable section title with Pi-purple start border (right in RTL),
   subtle icon, and optional gradient number badge.
   ════════════════════════════════════════════════════════════════════════════ */

export function PiSectionHeader({
  icon,
  children,
  count,
  highlight,
}: {
  icon: ReactNode;
  children: ReactNode;
  count?: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      {/* Pi-purple vertical accent bar — appears on the right/start side in RTL */}
      <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-purple-500 to-purple-700 flex-shrink-0" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-purple-500 dark:text-purple-400 flex-shrink-0">{icon}</span>
        <h3 className="text-sm font-semibold truncate">{children}</h3>
        {count !== undefined && (
          <span className={`text-xs font-bold flex-shrink-0 ${highlight ? "pi-gradient-text" : "text-muted-foreground"}`}>
            {count}
          </span>
        )}
      </div>
    </div>
  );
}