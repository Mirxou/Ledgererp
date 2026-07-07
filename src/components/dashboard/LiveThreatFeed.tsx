"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, ShieldCheck, Loader2, Brain, Wallet,
  Radio, Activity,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";
import { CARD_DEPTH } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   LIVE THREAT FEED — SOC-style real-time feed
   ════════════════════════════════════════════════════════════════════════════ */

type EventType =
  | "vulnerability_found"
  | "fixed"
  | "in_progress"
  | "ai_analysis"
  | "pi_transaction";

interface FeedEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: Date;
  isNew?: boolean;
}

const EVENT_CONFIG: Record<
  EventType,
  { icon: typeof ShieldAlert; color: string; bgColor: string; label: string; emoji: string }
> = {
  vulnerability_found: {
    icon: ShieldAlert,
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    label: "ثغرة مكتشفة",
    emoji: "🔴",
  },
  fixed: {
    icon: ShieldCheck,
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20",
    label: "تم الإصلاح",
    emoji: "🟢",
  },
  in_progress: {
    icon: Loader2,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    label: "قيد التنفيذ",
    emoji: "🟡",
  },
  ai_analysis: {
    icon: Brain,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    label: "تحليل ذكي",
    emoji: "🔵",
  },
  pi_transaction: {
    icon: Wallet,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    label: "معاملة Pi",
    emoji: "🟣",
  },
};

/* ── Simulated Event Generator ─────────────────────────────────────────── */

const SIMULATED_EVENTS: Omit<FeedEvent, "id" | "timestamp">[] = [
  {
    type: "vulnerability_found",
    title: "ثغرة XSS في نموذج الدفع",
    description: "تم اكتشاف حقن برمجي في حقل مبلغ المعاملة",
  },
  {
    type: "fixed",
    title: "إصلاح مشكلة التشفير الضعيف",
    description: "تم ترقية خوارزمية AES من 128-bit إلى 256-bit",
  },
  {
    type: "in_progress",
    title: "معالجة تسريب بيانات KYC",
    description: "قيد تطبيق التشفير على البيانات الحساسة",
  },
  {
    type: "ai_analysis",
    title: "تحليل ذكي لمنطق المصادقة",
    description: "تم تحديد 3 نقاط ضعف محتملة في flow التحقق",
  },
  {
    type: "pi_transaction",
    title: "مكافأة إصلاح: 50 π",
    description: "تم إرسال مكافأة للباحث PiGuard_EG عن إصلاح ثغرة حرجة",
  },
  {
    type: "vulnerability_found",
    title: "هجوم postMessage محتمل",
    description: "تم رصد استقبال رسائل من مصادر غير موثوقة",
  },
  {
    type: "fixed",
    title: "إصلاح تخزين الرمز غير الآمن",
    description: "تم نقل تخزين API key إلى بيئة آمنة",
  },
  {
    type: "ai_analysis",
    title: "فحص تلقائي لشفرة التوافق",
    description: "تحليل هيكلية حضانة المحفظة — النتيجة: آمن",
  },
  {
    type: "in_progress",
    title: "تحديث سياسات الأمان",
    description: "إعادة تهيئة CORS و CSP headers",
  },
  {
    type: "pi_transaction",
    title: "مكافأة أسبوعية: 200 π",
    description: "صرف مكافآت الأسبوع لأفضل 5 باحثين أمنيين",
  },
  {
    type: "vulnerability_found",
    title: "ثغرة CSRF في API endpoints",
    description: "نقاط نهاية بدون حماية CSRF token",
  },
  {
    type: "fixed",
    title: "إصلاح تحايل KYC",
    description: "تم إضافة التحقق الثنائي لعملية التحقق",
  },
];

let eventCounter = 0;

function generateEvent(): FeedEvent {
  const template =
    SIMULATED_EVENTS[Math.floor(Math.random() * SIMULATED_EVENTS.length)];
  eventCounter++;
  return {
    ...template,
    id: `evt-${Date.now()}-${eventCounter}`,
    timestamp: new Date(),
    isNew: true,
  };
}

/* ── Format Time ───────────────────────────────────────────────────────── */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ── Single Event Row ──────────────────────────────────────────────────── */

function EventRow({ event, index }: { event: FeedEvent; index: number }) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{
        duration: 0.35,
        delay: event.isNew ? 0 : index * 0.03,
        ease: "easeOut",
      }}
      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all ${
        config.bgColor
      } ${event.isNew ? "ring-1 ring-white/[0.08]" : ""}`}
    >
      {/* Icon */}
      <div className={`shrink-0 mt-0.5 ${config.color}`}>
        {event.type === "in_progress" ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Icon className="size-4" />
          </motion.div>
        ) : (
          <Icon className="size-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{config.emoji}</span>
          <span className="text-xs font-semibold truncate">{event.title}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
          {event.description}
        </p>
      </div>

      {/* Time + New pulse */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground font-mono">
          {formatTime(event.timestamp)}
        </span>
        {event.isNew && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function LiveThreatFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  /* ── Load initial events from API ─────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : []))
      .then((activities) => {
        if (cancelled) return;
        if (activities?.length) {
          const mapped: FeedEvent[] = activities.slice(0, 15).map((a: Record<string, string>, i: number) => ({
            id: a.id || `init-${i}`,
            type: (a.type as EventType) || "vulnerability_found",
            title: a.title || a.action || "نشاط أمني",
            description: a.details || "",
            timestamp: a.createdAt ? new Date(a.createdAt) : new Date(Date.now() - (15 - i) * 60000),
            isNew: false,
          }));
          setEvents(mapped);
        } else {
          /* Seed with simulated history */
          const seed: FeedEvent[] = Array.from({ length: 8 }, (_, i) => {
            const template = SIMULATED_EVENTS[i % SIMULATED_EVENTS.length];
            return {
              ...template,
              id: `seed-${i}`,
              timestamp: new Date(Date.now() - (8 - i) * 120000),
              isNew: false,
            };
          });
          setEvents(seed);
        }
        setInitialLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        const seed: FeedEvent[] = Array.from({ length: 8 }, (_, i) => {
          const template = SIMULATED_EVENTS[i % SIMULATED_EVENTS.length];
          return {
            ...template,
            id: `seed-${i}`,
            timestamp: new Date(Date.now() - (8 - i) * 120000),
            isNew: false,
          };
        });
        setEvents(seed);
        setInitialLoaded(true);
      });

    return () => { cancelled = true; };
  }, []);

  /* ── Simulate real-time events ───────────────────────────────────── */
  useEffect(() => {
    if (!initialLoaded) return;
    const interval = setInterval(() => {
      if (paused) return;
      setEvents((prev) => {
        const newEvent = generateEvent();
        const updated = [newEvent, ...prev];
        /* Clear isNew on older items */
        return updated.slice(0, 50).map((e, i) =>
          i === 0 ? e : { ...e, isNew: false }
        );
      });
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [initialLoaded, paused]);

  /* ── Auto-scroll ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (paused || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTop = 0;
  }, [events, paused]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-6 ${CARD_DEPTH}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <PiSectionHeader icon={<Radio className="size-4" />}>
          البث المباشر للتهديدات
        </PiSectionHeader>
        <div className="flex items-center gap-2">
          {/* Live Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <motion.div
              className="w-2 h-2 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-semibold text-red-400">
              مباشر
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {events.length} حدث
          </span>
        </div>
      </div>

      {/* Event Type Legend */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {(Object.keys(EVENT_CONFIG) as EventType[]).map((type) => {
          const cfg = EVENT_CONFIG[type];
          const count = events.filter((e) => e.type === type).length;
          return (
            <button
              key={type}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
              <span className="font-semibold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="max-h-96 overflow-y-auto custom-scrollbar space-y-2 pl-1"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="popLayout">
          {events.map((event, idx) => (
            <EventRow key={event.id} event={event} index={idx} />
          ))}
        </AnimatePresence>

        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Activity className="size-8 text-muted-foreground/30" />
            <span className="text-sm text-muted-foreground">جارٍ تحميل الأحداث...</span>
          </div>
        )}
      </div>

      {/* Pause indicator */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-amber-400/70"
          >
            <Activity className="size-3" />
            <span>تم الإيقاف المؤقت — حرّك المؤشر للاستئناف</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}