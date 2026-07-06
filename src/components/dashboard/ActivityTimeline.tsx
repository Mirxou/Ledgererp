"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, RefreshCw, Brain, Download, Clock, Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface Activity {
  id: string;
  type: "issue_fixed" | "issue_status_changed" | "ai_analysis" | "login" | "export";
  description: string;
  timestamp: string;
  issueId?: string;
  severity?: string;
}

/* ── Relative Time ─────────────────────────────────────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return `منذ ${Math.floor(diff / 604800)} أسبوع`;
}

/* ── Activity Type Config ──────────────────────────────────────────────── */

const TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; label: string }
> = {
  issue_fixed: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "إصلاح",
  },
  issue_status_changed: {
    icon: RefreshCw,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "تغيير حالة",
  },
  ai_analysis: {
    icon: Brain,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    label: "تحليل ذكي",
  },
  export: {
    icon: Download,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "تصدير",
  },
  login: {
    icon: Clock,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-100 dark:bg-sky-900/30",
    label: "تسجيل دخول",
  },
};

/* ── Severity Badge Color ──────────────────────────────────────────────── */

function getSeverityColor(severity?: string) {
  if (!severity) return "";
  const map: Record<string, string> = {
    CRITICAL: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    MEDIUM: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    LOW: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  };
  return map[severity] || "";
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function ActivityTimeline() {
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 10;

  const { data, isLoading } = useQuery<{ activities: Activity[] }>({
    queryKey: ["activities"],
    queryFn: async () => {
      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const activities = data?.activities || [];
  const displayedActivities = showAll ? activities : activities.slice(0, LIMIT);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            سجل الأنشطة
          </CardTitle>
          {activities.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {activities.length}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-2.5 w-1/3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد أنشطة بعد</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              ستظهر هنا الأنشطة عند بدء الإصلاحات
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            <AnimatePresence mode="popLayout">
              {displayedActivities.map((activity, i) => {
                const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.issue_status_changed;
                const IconComp = config.icon;

                return (
                  <motion.div
                    key={activity.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0"
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}
                    >
                      <IconComp className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] h-4 px-1.5 ${config.color} border-current/20`}
                        >
                          {config.label}
                        </Badge>
                        {activity.severity && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] h-4 px-1.5 ${getSeverityColor(activity.severity)}`}
                          >
                            {activity.severity === "CRITICAL"
                              ? "حرج"
                              : activity.severity === "HIGH"
                                ? "مرتفع"
                                : activity.severity === "MEDIUM"
                                  ? "متوسط"
                                  : "منخفض"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-foreground/90 line-clamp-2">
                        {activity.description}
                      </p>
                    </div>

                    {/* Time */}
                    <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 mt-1">
                      {relativeTime(activity.timestamp)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Show All Button */}
            {activities.length > LIMIT && !showAll && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-2"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(true)}
                >
                  عرض الكل ({activities.length})
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}