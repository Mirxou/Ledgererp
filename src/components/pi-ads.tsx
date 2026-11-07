"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  showBannerAd,
  hideBannerAd,
  showInterstitialAd,
  showRewardedAd,
  isPiAdsAvailable,
  isPiAdsConfigured,
  getAdStatus,
  type PiAdCallbacks,
} from "@/lib/pi-ads";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tv, X, Gift, Megaphone, Eye, Zap } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   PiBannerAd — Banner ad displayed at top or bottom of screen
   ═══════════════════════════════════════════════════════════════ */

interface PiBannerAdProps {
  /** Position: "top" or "bottom" of the page */
  position?: "top" | "bottom";
  /** Whether to auto-show the banner when mounted */
  autoShow?: boolean;
  /** Custom ad unit ID (overrides env var) */
  adUnitId?: string;
}

export function PiBannerAd({
  position = "bottom",
  autoShow = true,
  adUnitId,
}: PiBannerAdProps) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleShow = useCallback(() => {
    setError(null);
    showBannerAd(adUnitId, {
      onAdLoaded: () => {
        if (mountedRef.current) setVisible(true);
      },
      onAdFailedToLoad: (err) => {
        if (mountedRef.current) setError(err);
      },
    });
  }, [adUnitId]);

  const handleHide = useCallback(() => {
    hideBannerAd();
    setVisible(false);
  }, []);

  // Auto-show on mount
  useEffect(() => {
    if (autoShow && isPiAdsAvailable()) {
      // Small delay to let page render first
      const timer = setTimeout(handleShow, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoShow, handleShow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visible) hideBannerAd();
    };
  }, [visible]);

  const adsAvailable = isPiAdsAvailable();

  // If Pi Ads SDK not available, show a subtle placeholder
  if (!adsAvailable) {
    return (
      <div
        className={
          "w-full py-1.5 px-4 flex items-center justify-center text-[10px] text-muted-foreground/40 border-t border-border/30 " +
          (position === "top" ? "order-first" : "order-last")
        }
      >
        <Megaphone className="h-3 w-3 ml-1.5 opacity-30" />
        <span>مساحة إعلانية — Pi Ad Network</span>
      </div>
    );
  }

  return (
    <div
      className={
        "w-full transition-all duration-300 " +
        (position === "top"
          ? "sticky top-14 z-40 border-b bg-background/95"
          : "border-t bg-background/95") +
        (visible ? " py-2" : " h-0 overflow-hidden")
      }
    >
      {visible && (
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <Megaphone className="h-2.5 w-2.5" />إعلان
            </Badge>
            {/* Ad content rendered by Pi SDK into this container */}
            <div id="pi-banner-ad-container" className="flex-1 min-h-[50px]" />
          </div>
          <button
            onClick={handleHide}
            className="p-1 rounded-sm hover:bg-muted text-muted-foreground"
            aria-label="إغلاق الإعلان"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {error && (
        <div className="text-[10px] text-red-500 text-center py-1">
          فشل تحميل الإعلان
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PiInterstitialTrigger — Shows interstitial ad at transitions
   ═══════════════════════════════════════════════════════════════ */

interface PiInterstitialTriggerProps {
  /** Trigger: call this to attempt showing an interstitial */
  onTrigger?: () => void;
  /** Whether to auto-trigger (use sparingly!) */
  autoTrigger?: boolean;
}

/**
 * Hook to trigger interstitial ads at natural transition points.
 * Usage: Call `triggerInterstitial()` when switching tabs, completing actions, etc.
 */
export function useInterstitialAd() {
  const triggerInterstitial = useCallback(() => {
    if (!isPiAdsAvailable()) return false;
    return showInterstitialAd(undefined, {
      onAdLoaded: () => console.log("[Pi Ads] Interstitial shown"),
      onAdClosed: () => console.log("[Pi Ads] Interstitial closed"),
    });
  }, []);

  return { triggerInterstitial };
}

/* ═══════════════════════════════════════════════════════════════
   PiRewardedAdButton — Button that triggers a rewarded ad
   ═══════════════════════════════════════════════════════════════ */

interface PiRewardedAdButtonProps {
  /** Label text for the button */
  label?: string;
  /** Description of the reward */
  rewardDescription?: string;
  /** Callback when reward is earned */
  onReward?: (reward: { type: string; amount: number }) => void;
  /** Custom ad unit ID */
  adUnitId?: string;
}

export function PiRewardedAdButton({
  label = "شاهد إعلان واحصل على مكافأة",
  rewardDescription,
  onReward,
  adUnitId,
}: PiRewardedAdButtonProps) {
  const [loading, setLoading] = useState(false);
  const [earned, setEarned] = useState(false);

  const handleWatch = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setEarned(false);

    const shown = showRewardedAd(adUnitId, {
      onAdLoaded: () => console.log("[Pi Ads] Rewarded ad loaded"),
      onAdClosed: () => setLoading(false),
      onReward: (reward) => {
        setEarned(true);
        onReward?.(reward);
        setTimeout(() => setEarned(false), 3000);
      },
      onAdFailedToLoad: () => setLoading(false),
    });

    if (!shown) {
      setLoading(false);
    }
  }, [loading, adUnitId, onReward]);

  const adsAvailable = isPiAdsAvailable();

  if (!adsAvailable) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs opacity-50">
        <Gift className="h-3.5 w-3.5" />
        {label}
        <Badge variant="secondary" className="text-[8px] h-3.5 px-1">Pi Browser فقط</Badge>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleWatch}
      disabled={loading}
      className={
        "gap-1.5 text-xs transition-all " +
        (earned
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
          : "hover:bg-emerald-500/5 hover:border-emerald-500/20")
      }
    >
      {loading ? (
        <Zap className="h-3.5 w-3.5 animate-pulse" />
      ) : earned ? (
        <Gift className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Gift className="h-3.5 w-3.5" />
      )}
      {earned ? "تم الحصول على المكافأة! 🎉" : label}
      {rewardDescription && !earned && (
        <span className="text-[9px] text-muted-foreground">({rewardDescription})</span>
      )}
    </Button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PiAdNetworkStatus — Dashboard widget showing ad system status
   ═══════════════════════════════════════════════════════════════ */

export function PiAdNetworkStatus() {
  const [status, setStatus] = useState(getAdStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getAdStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-emerald-500/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="h-4 w-4 text-emerald-500" />
            <span className="font-bold text-sm">Pi Ad Network</span>
          </div>
          <Badge
            variant="outline"
            className={
              "text-[9px] gap-1 " +
              (status.isAvailable
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20")
            }
          >
            <span className={"w-1.5 h-1.5 rounded-full " + (status.isAvailable ? "bg-emerald-500" : "bg-amber-500")} />
            {status.isAvailable ? "نشط" : "غير متصل"}
          </Badge>
        </div>

        {/* Ad Types Status */}
        <div className="grid grid-cols-3 gap-2">
          {([
            ["Banner", status.adUnitIds.banner, Tv],
            ["Interstitial", status.adUnitIds.interstitial, Eye],
            ["Rewarded", status.adUnitIds.rewarded, Gift],
          ] as const).map(function([name, configured, Icon]) {
            return (
              <div
                key={name}
                className={
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] " +
                  (configured
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600"
                    : "bg-muted/30 border-border/30 text-muted-foreground")
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-medium">{name}</span>
                <span>{configured ? "✅" : "❌"}</span>
              </div>
            );
          })}
        </div>

        {/* Status Details */}
        <div className="text-[10px] text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>SDK متاح</span>
            <span>{status.isAvailable ? "✅" : "❌"}</span>
          </div>
          <div className="flex justify-between">
            <span>إعلانات مُعَدَّة</span>
            <span>{status.isConfigured ? "✅" : "❌"}</span>
          </div>
          {status.bannerVisible && (
            <div className="flex justify-between text-emerald-600">
              <span>Banner ظاهر</span>
              <span>✅</span>
            </div>
          )}
        </div>

        {/* Manual Ad Test Buttons */}
        {status.isAvailable && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={function() { showBannerAd(); }}
              className="text-[10px] flex-1 gap-1"
            >
              <Tv className="h-3 w-3" />Banner
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={function() { showInterstitialAd(); }}
              className="text-[10px] flex-1 gap-1"
            >
              <Eye className="h-3 w-3" />Interstitial
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={function() { showRewardedAd(); }}
              className="text-[10px] flex-1 gap-1"
            >
              <Gift className="h-3 w-3" />Rewarded
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
