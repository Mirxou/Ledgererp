"use client";

import { usePi } from "@/lib/pi-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LogIn, Loader2 } from "lucide-react";
import { useState } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   PI USER PROFILE
   Shows Pi authentication state — login button or user info card.
   Glassmorphic in dark mode with pi-glow.
   ════════════════════════════════════════════════════════════════════════════ */

export function PiUserProfile() {
  const { isPiBrowser, piUser, piBalance, piAuth } = usePi();
  const [authing, setAuthing] = useState(false);

  const handleAuth = async () => {
    setAuthing(true);
    try {
      await piAuth();
    } finally {
      setAuthing(false);
    }
  };

  /* ── Not in Pi Browser — show a subtle indicator ─────────────────────── */
  if (!isPiBrowser) {
    return (
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Pi logo dot */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center flex-shrink-0 pi-glow">
          <span className="text-white font-bold text-xs sm:text-sm">π</span>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-muted-foreground leading-tight">وضع العرض</p>
          <p className="text-[9px] text-muted-foreground/60">Pi Browser مطلوب</p>
        </div>
      </div>
    );
  }

  /* ── In Pi Browser but not authenticated ─────────────────────────────── */
  if (!piUser) {
    return (
      <Button
        onClick={handleAuth}
        disabled={authing}
        className="h-9 sm:h-10 px-3 sm:px-4 bg-gradient-to-l from-purple-700 via-purple-600 to-purple-800 hover:from-purple-600 hover:via-purple-500 hover:to-purple-700 text-white border-0 shadow-lg shadow-purple-900/30 dark:shadow-purple-900/50 gap-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 hover:-translate-y-[1px] hover:shadow-xl hover:shadow-purple-900/40 dark:hover:shadow-purple-900/60"
      >
        {authing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">تسجيل الدخول عبر Pi</span>
        <span className="sm:hidden">دخول</span>
      </Button>
    );
  }

  /* ── Authenticated — show profile ────────────────────────────────────── */
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-purple-500/40 ring-offset-1 ring-offset-background">
        {piUser.avatar && <AvatarImage src={piUser.avatar} alt={piUser.username} />}
        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-purple-800 text-white text-xs font-bold">
          {piUser.username?.charAt(0)?.toUpperCase() || "π"}
        </AvatarFallback>
      </Avatar>
      <div className="hidden sm:flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold leading-tight">{piUser.username}</span>
          <Badge className="h-4 px-1.5 text-[8px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-0.5">
            <ShieldCheck className="h-2.5 w-2.5" />
            مستخدم موثّق
          </Badge>
        </div>
        {piBalance !== null && (
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            <span className="pi-gradient-text font-bold">π {piBalance.toFixed(2)}</span>
          </p>
        )}
      </div>
      {/* Mobile: just balance */}
      {piBalance !== null && (
        <span className="sm:hidden text-[10px] pi-gradient-text font-bold">π{piBalance.toFixed(2)}</span>
      )}
    </div>
  );
}