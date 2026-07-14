"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Users, Smartphone, ArrowLeftRight, TrendingUp, Zap, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface StatItem {
  label: string;
  displayValue: string;
  numericValue: number;
  suffix?: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  delay: number;
}

const STATS: StatItem[] = [
  {
    label: "المستخدمون النشطون",
    displayValue: "47M",
    numericValue: 47,
    suffix: "M+",
    icon: <Users className="h-5 w-5" />,
    gradient: "from-purple-600/20 via-purple-500/10 to-transparent dark:from-purple-800/30 dark:via-purple-700/15",
    iconBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    delay: 0,
  },
  {
    label: "التطبيقات المنشورة",
    displayValue: "100",
    numericValue: 100,
    suffix: "+",
    icon: <Smartphone className="h-5 w-5" />,
    gradient: "from-amber-600/20 via-amber-500/10 to-transparent dark:from-amber-800/30 dark:via-amber-700/15",
    iconBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
    delay: 0.15,
  },
  {
    label: "المعاملات اليومية",
    displayValue: "1M",
    numericValue: 1,
    suffix: "M+",
    icon: <ArrowLeftRight className="h-5 w-5" />,
    gradient: "from-emerald-600/20 via-emerald-500/10 to-transparent dark:from-emerald-800/30 dark:via-emerald-700/15",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    delay: 0.3,
  },
  {
    label: "حجم الشبكة",
    displayValue: "60M",
    numericValue: 60,
    suffix: "M+",
    icon: <Globe className="h-5 w-5" />,
    gradient: "from-sky-600/20 via-sky-500/10 to-transparent dark:from-sky-800/30 dark:via-sky-700/15",
    iconBg: "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400",
    delay: 0.45,
  },
  {
    label: "سرعة المعاملات",
    displayValue: "150",
    numericValue: 150,
    suffix: " TPS",
    icon: <Zap className="h-5 w-5" />,
    gradient: "from-rose-600/20 via-rose-500/10 to-transparent dark:from-rose-800/30 dark:via-rose-700/15",
    iconBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400",
    delay: 0.6,
  },
  {
    label: "معدل النمو",
    displayValue: "32",
    numericValue: 32,
    suffix: "%",
    icon: <TrendingUp className="h-5 w-5" />,
    gradient: "from-teal-600/20 via-teal-500/10 to-transparent dark:from-teal-800/30 dark:via-teal-700/15",
    iconBg: "bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400",
    delay: 0.75,
  },
];

/* ════════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER HOOK
   ════════════════════════════════════════════════════════════════════════════ */

function useAnimatedCounter(target: number, delay: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(2, -10 * progress);
        setCount(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay * 1000 + 300);
    return () => clearTimeout(timer);
  }, [target, delay, duration]);

  return count;
}

/* ════════════════════════════════════════════════════════════════════════════
   STAT CARD
   ════════════════════════════════════════════════════════════════════════════ */

function EcoStatCard({ stat }: { stat: StatItem }) {
  const count = useAnimatedCounter(stat.numericValue, stat.delay);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: stat.delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <Card className="relative overflow-hidden border-purple-200/30 dark:border-purple-900/20 hover:shadow-lg hover:shadow-purple-900/10 transition-shadow duration-300">
        {/* Gradient background overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} pointer-events-none`} />

        <CardContent className="relative p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg} transition-transform duration-300 group-hover:scale-110`}>
              {stat.icon}
            </div>
            <TrendingUp className="h-4 w-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black pi-gradient-text tabular-nums">
              {count}
              <span className="text-base sm:text-lg">{stat.suffix}</span>
            </p>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function PiEcosystemStats() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {STATS.map((stat) => (
        <EcoStatCard key={stat.label} stat={stat} />
      ))}
    </motion.div>
  );
}