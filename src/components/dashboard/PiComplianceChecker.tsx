"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, ShieldX, Fingerprint, Smartphone,
  Globe, Palette, Lock, CreditCard, Layout, Moon, Languages,
  Settings, FileCheck, ServerCrash, ShieldQuestion,
  Key, Wifi, MonitorSmartphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PiSectionHeader } from "@/components/ui/PiSectionHeader";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

type ComplianceStatus = "compliant" | "partial" | "not-compliant";

interface ComplianceItem {
  title: string;
  description: string;
  status: ComplianceStatus;
  icon: React.ReactNode;
}

interface ComplianceCategory {
  name: string;
  items: ComplianceItem[];
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPLIANCE DATA
   ════════════════════════════════════════════════════════════════════════════ */

const CATEGORIES: ComplianceCategory[] = [
  {
    name: "المتطلبات الأساسية",
    items: [
      {
        title: "Pi-Only Authentication",
        description: "المصادقة حصرياً عبر شبكة بي باستخدام Pi SDK",
        status: "compliant",
        icon: <Fingerprint className="h-4 w-4" />,
      },
      {
        title: "Pi SDK Integration",
        description: "تكامل كامل مع Pi SDK للمصادقة والدفع",
        status: "compliant",
        icon: <Key className="h-4 w-4" />,
      },
      {
        title: "Complete App (not demo)",
        description: "التطبيق مكتمل الوظائف وليس نسخة تجريبية",
        status: "partial",
        icon: <Smartphone className="h-4 w-4" />,
      },
      {
        title: "No External Redirects",
        description: "لا توجد عمليات إعادة توجيه خارجية غير مصرح بها",
        status: "partial",
        icon: <Globe className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "الأمان",
    items: [
      {
        title: "Developer KYC",
        description: "اكتمال التحقق من هوية المطور (KYC)",
        status: "compliant",
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        title: "Data Protection",
        description: "حماية بيانات المستخدمين والتشفير المناسب",
        status: "compliant",
        icon: <Lock className="h-4 w-4" />,
      },
      {
        title: "No External Payment",
        description: "عدم استخدام طرق دفع خارجية بخلاف Pi",
        status: "partial",
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        title: "Pi-Only Transactions",
        description: "جميع المعاملات تتم حصرياً عبر شبكة بي",
        status: "partial",
        icon: <ShieldQuestion className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "تجربة المستخدم",
    items: [
      {
        title: "Professional UI",
        description: "واجهة مستخدم احترافية وجذابة",
        status: "compliant",
        icon: <Palette className="h-4 w-4" />,
      },
      {
        title: "Responsive Design",
        description: "تصميم متجاوب يعمل على جميع الأجهزة",
        status: "compliant",
        icon: <MonitorSmartphone className="h-4 w-4" />,
      },
      {
        title: "Dark Mode",
        description: "دعم الوضع الداكن بالكامل",
        status: "compliant",
        icon: <Moon className="h-4 w-4" />,
      },
      {
        title: "Arabic Support",
        description: "دعم كامل للغة العربية مع تخطيط RTL",
        status: "compliant",
        icon: <Languages className="h-4 w-4" />,
      },
    ],
  },
  {
    name: "الامتثال",
    items: [
      {
        title: "PWA Support",
        description: "دعم تطبيق الويب التقدمي بالكامل",
        status: "compliant",
        icon: <Layout className="h-4 w-4" />,
      },
      {
        title: "Service Worker",
        description: "تسجيل Service Worker للعمل دون اتصال",
        status: "compliant",
        icon: <Wifi className="h-4 w-4" />,
      },
      {
        title: "Manifest Config",
        description: "إعدادات manifest.json صحيحة ومكتملة",
        status: "compliant",
        icon: <FileCheck className="h-4 w-4" />,
      },
      {
        title: "Secure Server Setup",
        description: "إعداد خادم آمن مع رؤوس حماية SSL/CORS",
        status: "not-compliant",
        icon: <ServerCrash className="h-4 w-4" />,
      },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<ComplianceStatus, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  iconColor: string;
  textColor: string;
  badgeClass: string;
  points: number;
}> = {
  compliant: {
    label: "متوافق",
    icon: <ShieldCheck className="h-4 w-4" />,
    bg: "bg-green-50/70 dark:bg-green-950/20",
    border: "border-green-200/60 dark:border-green-900/40",
    iconColor: "text-green-600 dark:text-green-400",
    textColor: "text-green-700 dark:text-green-400",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    points: 1,
  },
  partial: {
    label: "جزئي",
    icon: <ShieldAlert className="h-4 w-4" />,
    bg: "bg-amber-50/70 dark:bg-amber-950/20",
    border: "border-amber-200/60 dark:border-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    textColor: "text-amber-700 dark:text-amber-400",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    points: 0.5,
  },
  "not-compliant": {
    label: "غير متوافق",
    icon: <ShieldX className="h-4 w-4" />,
    bg: "bg-red-50/70 dark:bg-red-950/20",
    border: "border-red-200/60 dark:border-red-900/40",
    iconColor: "text-red-600 dark:text-red-400",
    textColor: "text-red-700 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    points: 0,
  },
};

function computeScore(): { score: number; total: number; percentage: number } {
  let total = 0;
  let score = 0;
  for (const cat of CATEGORIES) {
    for (const item of cat.items) {
      total++;
      score += STATUS_CONFIG[item.status].points;
    }
  }
  return { score: Math.round(score * 2) / 2, total, percentage: Math.round((score / total) * 100) };
}

/* ════════════════════════════════════════════════════════════════════════════
   COMPLIANCE ITEM ROW
   ════════════════════════════════════════════════════════════════════════════ */

function ComplianceItemRow({ item, index }: { item: ComplianceItem; index: number }) {
  const cfg = STATUS_CONFIG[item.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.005] ${cfg.bg} ${cfg.border}`}
    >
      {/* Status icon */}
      <div className={`mt-0.5 flex-shrink-0 ${cfg.iconColor}`}>{cfg.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <div className={`flex-shrink-0 ${cfg.iconColor}`}>{item.icon}</div>
          <h4 className="text-sm font-semibold">{item.title}</h4>
          <Badge className={`${cfg.badgeClass} text-[9px] border-0 px-1.5 py-0 font-bold`}>
            {cfg.label}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */

export function PiComplianceChecker() {
  const { percentage, total, score } = computeScore();

  const scoreColor = percentage >= 80
    ? "text-green-600 dark:text-green-400"
    : percentage >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const scoreRingGradient = percentage >= 80
    ? "from-green-500 to-emerald-600"
    : percentage >= 60
      ? "from-amber-500 to-orange-500"
      : "from-red-500 to-red-700";

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (percentage / 100) * circumference;

  let globalIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={""}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <PiSectionHeader icon={<Settings className="h-4 w-4" />}>
              فحص التوافق مع شبكة بي
            </PiSectionHeader>

            {/* Score circle */}
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.7, type: "spring", stiffness: 120 }}
              className="relative flex items-center justify-center flex-shrink-0"
            >
              <svg width="80" height="80" className="-rotate-90">
                <circle
                  cx="40" cy="40" r="42"
                  fill="none"
                  strokeWidth="5"
                  className="stroke-muted/30"
                />
                <motion.circle
                  cx="40" cy="40" r="42"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  className="stroke-current"
                  style={{ strokeDasharray: circumference }}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-lg font-black ${scoreColor}`}>{percentage}%</span>
                <span className="text-[8px] text-muted-foreground font-medium">التوافق</span>
              </div>
            </motion.div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span>
              <span className="font-bold text-foreground">{score}</span> / {total} نقطة
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              متوافق: {CATEGORIES.flatMap((c) => c.items).filter((i) => i.status === "compliant").length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              جزئي: {CATEGORIES.flatMap((c) => c.items).filter((i) => i.status === "partial").length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              غير متوافق: {CATEGORIES.flatMap((c) => c.items).filter((i) => i.status === "not-compliant").length}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {CATEGORIES.map((category, catIdx) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + catIdx * 0.12, duration: 0.4 }}
            >
              <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                {category.name}
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                  {category.items.length} عنصر
                </Badge>
              </h4>
              <div className="space-y-2">
                {category.items.map((item) => {
                  const idx = globalIndex++;
                  return <ComplianceItemRow key={item.title} item={item} index={idx} />;
                })}
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}