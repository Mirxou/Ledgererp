import type { LucideIcon } from "lucide-react";
import { Shield, Zap, Building2 } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   SUBSCRIPTION TIERS
   3-tier plan system for Pi Network payments.
   ════════════════════════════════════════════════════════════════════════════ */

export type TierKey = "free" | "pro" | "enterprise";

export interface SubscriptionTier {
  name: string;
  nameEn: string;
  price: number;
  features: string[];
  aiAnalysisLimit: number;
  icon: LucideIcon;
  badge?: string;
}

export const SUBSCRIPTION_TIERS: Record<TierKey, SubscriptionTier> = {
  free: {
    name: "مجاني",
    nameEn: "Free",
    price: 0,
    features: [
      "عرض التقرير الأساسي",
      "البحث والتصفية",
      "التصدير الأساسي",
      "٣ تحليلات ذكية شهرياً",
    ],
    aiAnalysisLimit: 3,
    icon: Shield,
  },
  pro: {
    name: "محترف",
    nameEn: "Pro",
    price: 1,
    features: [
      "كل مزايا المجاني",
      "تحليلات ذكية غير محدودة",
      "تتبع الإصلاحات",
      "تصدير PDF",
      "إشعارات فورية",
      "دعم أولوي",
    ],
    aiAnalysisLimit: Infinity,
    icon: Zap,
    badge: "شائع",
  },
  enterprise: {
    name: "مؤسسي",
    nameEn: "Enterprise",
    price: 5,
    features: [
      "كل مزايا المحترف",
      "فحص أمني لعدة مشاريع",
      "واجهة برمجية كاملة",
      "تقارير مخصصة",
      "SLA 99.9%",
      "مدير حساب مخصص",
    ],
    aiAnalysisLimit: Infinity,
    icon: Building2,
    badge: "الأفضل قيمة",
  },
};

/** Get tier data by key */
export function getTier(key: TierKey): SubscriptionTier {
  return SUBSCRIPTION_TIERS[key];
}

/** Get all tier keys in order */
export function getTierKeys(): TierKey[] {
  return ["free", "pro", "enterprise"] as TierKey[];
}