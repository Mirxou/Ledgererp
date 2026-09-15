"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, Sun, Moon, Bell, Menu, X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePi } from "@/lib/pi-context";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { PiUserProfile } from "@/components/dashboard/PiUserProfile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutGrid, Flame, AlertTriangle, Wrench, Globe,
  Trophy, Bot, Sparkles, Github,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   APP HEADER — Pi Network branded, professional, minimal
   ════════════════════════════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { id: "overview", label: "نظرة عامة", icon: LayoutGrid },
  { id: "critical", label: "حرج", icon: Flame },
  { id: "high", label: "مرتفع", icon: AlertTriangle },
  { id: "medium", label: "متوسط", icon: ShieldAlert },
  { id: "fixes", label: "إصلاحات", icon: Wrench },
  { id: "pi-network", label: "شبكة بي", icon: Globe },
];

export function AppHeader({ activeTab, onTabChange }: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const { theme, setTheme } = useTheme();
  const { piUser } = usePi();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-2xl shadow-sm border-border/50"
          : "bg-background/50 backdrop-blur-xl border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* RIGHT (RTL) — Brand */}
          <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
            {/* Mobile menu */}
            <div className="sm:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <SheetTitle className="sr-only">القائمة</SheetTitle>
                  <div className="flex flex-col h-full">
                    {/* Mobile nav header */}
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: "linear-gradient(135deg, oklch(0.55 0.25 295), oklch(0.40 0.20 280))" }}
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Ledgererp</p>
                          <p className="text-[10px] text-muted-foreground">Pi Network Security Audit</p>
                        </div>
                      </div>
                    </div>
                    {/* Mobile nav items */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                      {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { onTabChange(item.id); setMobileOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                          >
                            <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                            {item.label}
                            {isActive && (
                              <motion.div
                                layoutId="mobile-active"
                                className="mr-auto w-1.5 h-1.5 rounded-full bg-primary"
                              />
                            )}
                          </button>
                        );
                      })}
                      <div className="my-3 border-t border-border/50" />
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                        <Bot className="h-4.5 w-4.5" />
                        المستشار الذكي
                        <Sparkles className="h-3 w-3 text-primary/50 mr-auto" />
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                        <Trophy className="h-4.5 w-4.5" />
                        الإنجازات
                      </button>
                    </nav>
                    {/* Mobile footer */}
                    <div className="p-4 border-t border-border/50">
                      <PiUserProfile />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, oklch(0.55 0.25 295), oklch(0.40 0.20 280))" }}
            >
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-sm font-bold leading-tight truncate">تدقيق Ledgererp الأمني</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Pi Network — Security Audit</p>
            </div>
          </div>

          {/* LEFT (RTL) — Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hidden sm:flex"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="تبديل السمة"
            >
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </motion.div>
            </Button>
            <div className="hidden sm:block">
              <PiUserProfile />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}