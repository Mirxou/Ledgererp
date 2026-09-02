"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Search, Brain, FileDown, Sun, Moon, Wrench,
  LayoutGrid, Flame, AlertTriangle, ShieldAlert, ShieldCheck,
  Globe, ArrowLeft, Clock, Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useIssueStore, type IssueWithStatus } from "@/lib/store";
import { SeverityBadge } from "@/components/ui/SeverityBadge";

/* ════════════════════════════════════════════════════════════════════════════
   COMMAND PALETTE — Cmd+K / Ctrl+K
   ════════════════════════════════════════════════════════════════════════════ */

const NAV_TABS = [
  { value: "overview", label: "نظرة عامة", icon: LayoutGrid },
  { value: "critical", label: "حرج", icon: Flame },
  { value: "high", label: "مرتفع", icon: AlertTriangle },
  { value: "medium", label: "متوسط", icon: ShieldAlert },
  { value: "fixes", label: "إصلاحات", icon: Wrench },
  { value: "pi-network", label: "شبكة بي", icon: Globe },
] as const;

const QUICK_ACTIONS = [
  { id: "ai-analysis", label: "تحليل ذكي", icon: Brain, shortcut: "AI" },
  { id: "export-pdf", label: "تصدير PDF", icon: FileDown, shortcut: "⌘P" },
  { id: "toggle-theme", label: "تبديل السمة", icon: Sun, shortcut: "⌘D" },
  { id: "open-fixes", label: "فتح تبويب إصلاحات", icon: Wrench, shortcut: "" },
] as const;

/* ── Fuzzy Highlight ──────────────────────────────────────────────────── */

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-purple-500/30 text-purple-300 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ── Recent Searches ──────────────────────────────────────────────────── */

const STORAGE_KEY = "cmd-palette-recent";

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentSearch(term: string) {
  if (!term.trim()) return;
  const recent = getRecentSearches().filter((r) => r !== term);
  recent.unshift(term);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 8)));
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

interface CommandPaletteProps {
  onNavigate?: (tab: string) => void;
  onAction?: (action: string) => void;
}

export function CommandPalette({ onNavigate, onAction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { issues, setSelectedIssue, setAiDialogIssue } = useIssueStore();
  const { theme, setTheme } = useTheme();
  /* Recent searches — recomputed each render when open (lightweight localStorage read) */
  const recentSearches = open ? getRecentSearches() : [];

  /* ── Keyboard shortcut ────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* ── Filtered issues ──────────────────────────────────────────────── */
  const filteredIssues = useMemo(() => {
    if (!query.trim()) return issues.slice(0, 12);
    const q = query.toLowerCase();
    return issues
      .filter(
        (i) =>
          i.issueId.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.severity.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [issues, query]);

  const filteredTabs = useMemo(() => {
    if (!query.trim()) return NAV_TABS;
    const q = query.toLowerCase();
    return NAV_TABS.filter((t) => t.label.includes(q) || t.value.includes(q));
  }, [query]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS;
    const q = query.toLowerCase();
    return QUICK_ACTIONS.filter((a) => a.label.includes(q));
  }, [query]);

  /* ── Handlers ─────────────────────────────────────────────────────── */
  const handleSelectIssue = useCallback(
    (issue: IssueWithStatus) => {
      setSelectedIssue(issue);
      setAiDialogIssue(issue);
      addRecentSearch(query);
      setOpen(false);
      setQuery("");
    },
    [setSelectedIssue, setAiDialogIssue, query]
  );

  const handleNavigate = useCallback(
    (tab: string) => {
      onNavigate?.(tab);
      setOpen(false);
      setQuery("");
    },
    [onNavigate]
  );

  const handleAction = useCallback(
    (actionId: string) => {
      switch (actionId) {
        case "toggle-theme":
          setTheme(theme === "dark" ? "light" : "dark");
          break;
        case "open-fixes":
          onNavigate?.("fixes");
          break;
        default:
          onAction?.(actionId);
      }
      setOpen(false);
      setQuery("");
    },
    [theme, setTheme, onNavigate, onAction]
  );

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
      className="sm:max-w-2xl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex flex-col h-[520px] dark:bg-[oklch(0.15_0.02_280)]/95 backdrop-blur-2xl border-white/[0.08]"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <Search className="size-5 text-purple-400 shrink-0" />
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="البحث عن ثغرة، إجراء، أو تبويب..."
            className="h-10 text-base border-none bg-transparent focus:ring-0 px-0"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-1 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        <CommandList className="flex-1 overflow-hidden">
          <CommandEmpty className="py-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Sparkles className="size-8 text-purple-400/50 mx-auto" />
              <p className="text-muted-foreground text-sm">
                لا توجد نتائج لـ &quot;{query}&quot;
              </p>
            </motion.div>
          </CommandEmpty>

          {/* Recent Searches */}
          {!query.trim() && recentSearches.length > 0 && (
            <CommandGroup heading="عمليات البحث الأخيرة" className="px-2">
              {recentSearches.slice(0, 5).map((term) => (
                <CommandItem
                  key={term}
                  onSelect={() => handleRecentClick(term)}
                  className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer data-[selected=true]:bg-purple-500/10"
                >
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">{term}</span>
                  <ArrowLeft className="size-3 text-muted-foreground/50" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick Actions */}
          {(filteredActions.length > 0 || !query.trim()) && (
            <>
              <CommandSeparator />
              <CommandGroup heading="إجراءات سريعة" className="px-2">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  const isTheme = action.id === "toggle-theme";
                  const ActiveIcon = isTheme
                    ? theme === "dark"
                      ? Moon
                      : Sun
                    : Icon;
                  return (
                    <CommandItem
                      key={action.id}
                      onSelect={() => handleAction(action.id)}
                      className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer data-[selected=true]:bg-purple-500/10"
                    >
                      <ActiveIcon className="size-4 text-purple-400" />
                      <span className="flex-1 text-sm">
                        <HighlightMatch text={action.label} query={query} />
                      </span>
                      {action.shortcut && (
                        <CommandShortcut>{action.shortcut}</CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Navigation Tabs */}
          {(filteredTabs.length > 0 || !query.trim()) && (
            <>
              <CommandSeparator />
              <CommandGroup heading="التنقل" className="px-2">
                {filteredTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <CommandItem
                      key={tab.value}
                      onSelect={() => handleNavigate(tab.value)}
                      className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer data-[selected=true]:bg-purple-500/10"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">
                        <HighlightMatch text={tab.label} query={query} />
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Issues */}
          {(filteredIssues.length > 0 || !query.trim()) && (
            <>
              <CommandSeparator />
              <CommandGroup
                heading={`الثغرات (${issues.length})`}
                className="px-2"
              >
                <AnimatePresence mode="popLayout">
                  {filteredIssues.map((issue, idx) => (
                    <motion.div
                      key={issue.issueId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      layout
                    >
                      <CommandItem
                        onSelect={() => handleSelectIssue(issue)}
                        className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer data-[selected=true]:bg-purple-500/10"
                      >
                        <div className="flex-shrink-0">
                          <SeverityBadge severity={issue.severity} />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm font-medium truncate">
                            <HighlightMatch text={issue.title} query={query} />
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {issue.issueId} · {issue.category}
                          </p>
                        </div>
                      </CommandItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
              تنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
              اختيار
            </span>
          </div>
          <span>Cmd+K لفتح</span>
        </div>
      </motion.div>
    </CommandDialog>
  );
}