"use client";

import { usePi } from "@/lib/pi-context";
import {
  SUBSCRIPTION_TIERS,
  getTierKeys,
  type TierKey,
} from "@/lib/subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/* ════════════════════════════════════════════════════════════════════════════
   SUBSCRIPTION CARDS
   3-tier pricing cards with Pi payment integration.
   Current tier highlighted with pi-gradient border.
   ════════════════════════════════════════════════════════════════════════════ */

interface SubscriptionCardsProps {
  currentTier?: TierKey;
}

function TierCard({
  tierKey,
  tier,
  isCurrent,
  isRecommended,
  onUpgrade,
  isPaying,
}: {
  tierKey: TierKey;
  tier: (typeof SUBSCRIPTION_TIERS)[TierKey];
  isCurrent: boolean;
  isRecommended: boolean;
  onUpgrade: () => void;
  isPaying: boolean;
}) {
  const Icon = tier.icon;

  return (
    <Card
      className={`relative flex flex-col overflow-hidden transition-all duration-300 ${
        isRecommended
          ? "border-purple-500/60 dark:border-purple-500/40 shadow-lg shadow-purple-900/20 dark:shadow-purple-900/30 scale-[1.02] md:scale-105"
          : isCurrent
            ? "border-purple-400/40 dark:border-purple-400/30"
            : ""
      } ${isRecommended ? "bg-gradient-to-b from-purple-50/80 to-background dark:from-purple-950/20 dark:to-card" : ""}`}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Badge
            className={`text-[10px] font-bold px-2.5 py-0.5 shadow-md ${
              tierKey === "pro"
                ? "pi-gradient text-white border-0"
                : "bg-amber-500 text-white border-0"
            }`}
          >
            <Star className="h-2.5 w-2.5 ml-1" />
            {tier.badge}
          </Badge>
        </div>
      )}

      {/* pi-gradient top bar for recommended */}
      {isRecommended && (
        <div className="h-1 pi-gradient flex-shrink-0" />
      )}

      <CardHeader className="pb-3 text-center">
        <div
          className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
            isRecommended
              ? "pi-gradient shadow-lg shadow-purple-900/30"
              : isCurrent
                ? "bg-purple-100 dark:bg-purple-900/40"
                : "bg-muted"
          }`}
        >
          <Icon
            className={`h-6 w-6 ${
              isRecommended
                ? "text-white"
                : isCurrent
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-muted-foreground"
            }`}
          />
        </div>
        <CardTitle className="text-base">{tier.name}</CardTitle>
        <div className="flex items-baseline justify-center gap-1 mt-1">
          {tier.price === 0 ? (
            <span className="text-2xl font-bold text-muted-foreground">
              مجاني
            </span>
          ) : (
            <>
              <span className="text-3xl font-bold pi-gradient-text">
                {tier.price}
              </span>
              <span className="text-sm text-muted-foreground font-medium">π</span>
              <span className="text-xs text-muted-foreground mr-1">/ شهرياً</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Features */}
        <ul className="flex-1 space-y-2.5">
          {tier.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <div
                className={`w-4.5 h-4.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isRecommended
                    ? "bg-purple-100 dark:bg-purple-900/40"
                    : isCurrent
                      ? "bg-purple-50 dark:bg-purple-900/20"
                      : "bg-muted"
                }`}
              >
                <Check
                  className={`h-2.5 w-2.5 ${
                    isRecommended
                      ? "text-purple-600 dark:text-purple-400"
                      : isCurrent
                        ? "text-purple-500"
                        : "text-muted-foreground"
                  }`}
                />
              </div>
              <span className="text-muted-foreground leading-relaxed">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="mt-2">
          {isCurrent ? (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled
            >
              خطتك الحالية
            </Button>
          ) : tier.price === 0 ? (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled
            >
              الخطة الافتراضية
            </Button>
          ) : (
            <Button
              onClick={onUpgrade}
              disabled={isPaying}
              className={`w-full rounded-xl font-semibold transition-all duration-300 ${
                isRecommended
                  ? "pi-gradient text-white border-0 shadow-lg shadow-purple-900/30 hover:shadow-xl hover:shadow-purple-900/40 hover:-translate-y-[1px]"
                  : "hover:-translate-y-[1px]"
              }`}
            >
              {isPaying ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الدفع...
                </>
              ) : (
                <>ترقية ← {tier.price}π</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SubscriptionCards({ currentTier = "free" }: SubscriptionCardsProps) {
  const { isPiBrowser, piUser, piBalance } = usePi();
  const [payingTier, setPayingTier] = useState<string | null>(null);

  const handleUpgrade = async (tierKey: TierKey) => {
    const tier = SUBSCRIPTION_TIERS[tierKey];

    if (!isPiBrowser || !piUser) {
      toast.error("يتطلب Pi Browser وتسجيل الدخول للدفع");
      return;
    }

    // Check balance
    if (piBalance !== null && piBalance < tier.price) {
      toast.error(`رصيدك غير كافي. تحتاج ${tier.price}π`);
      return;
    }

    setPayingTier(tierKey);

    try {
      // Call our server to create payment record
      const res = await fetch("/api/pi/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: tier.price,
          memo: `ترقية إلى ${tier.name} — Ledgererp Security Audit`,
          uid: piUser.uid,
          accessToken: "demo_token",
        }),
      });

      if (!res.ok) throw new Error("فشل إنشاء الدفعة");

      const payment = await res.json();

      // In real Pi Browser, we'd call:
      // window.Pi.createPayment({ ... }, callbacks)
      // For demo, simulate completion
      const completeRes = await fetch("/api/pi/payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.paymentId,
          action: "complete",
        }),
      });

      if (!completeRes.ok) throw new Error("فشل إكمال الدفعة");

      toast.success(`تمت الترقية إلى ${tier.name} بنجاح! 🎉`);
    } catch {
      toast.error("فشل في عملية الدفع. يرجى المحاولة لاحقاً.");
    } finally {
      setPayingTier(null);
    }
  };

  const tiers = getTierKeys();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
      {tiers.map((key) => {
        const tier = SUBSCRIPTION_TIERS[key];
        return (
          <TierCard
            key={key}
            tierKey={key}
            tier={tier}
            isCurrent={currentTier === key}
            isRecommended={key === "pro"}
            onUpgrade={() => handleUpgrade(key)}
            isPaying={payingTier === key}
          />
        );
      })}
    </div>
  );
}