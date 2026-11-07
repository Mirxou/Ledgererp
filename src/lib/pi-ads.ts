/**
 * Pi Ad Network SDK Integration
 *
 * Integrates Pi Network's advertising system into LedgerERP.
 * Supports: Banner, Interstitial, and Rewarded ad types.
 *
 * The Pi Ad SDK is accessed through window.Pi.Ads namespace.
 * When running outside Pi Browser, ads gracefully degrade to placeholders.
 *
 * Ad Unit IDs are configured via environment variables:
 * - NEXT_PUBLIC_PI_BANNER_AD_ID
 * - NEXT_PUBLIC_PI_INTERSTITIAL_AD_ID
 * - NEXT_PUBLIC_PI_REWARDED_AD_ID
 */

"use client";

/* ─── Types ──────────────────────────────────────────────────── */

export type PiAdType = "banner" | "interstitial" | "rewarded";

export interface PiAdCallbacks {
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: string) => void;
  onAdClicked?: () => void;
  onAdClosed?: () => void;
  onAdImpression?: () => void;
  /** Rewarded ad only — called when user earns the reward */
  onReward?: (reward: { type: string; amount: number }) => void;
}

export interface PiAdConfig {
  adUnitId: string;
  type: PiAdType;
  callbacks?: PiAdCallbacks;
}

export interface PiAdsSDK {
  /** Request and show a banner ad */
  showBanner: (adUnitId: string, callbacks?: PiAdCallbacks) => void;
  /** Show an interstitial ad (full-screen) */
  showInterstitial: (adUnitId: string, callbacks?: PiAdCallbacks) => void;
  /** Show a rewarded ad (user watches to earn reward) */
  showRewarded: (adUnitId: string, callbacks?: PiAdCallbacks) => void;
  /** Hide the currently visible banner ad */
  hideBanner: () => void;
  /** Check if a specific ad type is ready to show */
  isAdReady: (type: PiAdType) => boolean;
}

/* ─── Global augmentation ────────────────────────────────────── */

declare global {
  interface Window {
    Pi?: {
      init: (options: { version: string; sandbox?: boolean }) => void;
      authenticate: (scopes: string[], onIncomplete: (p: unknown) => void) => Promise<unknown>;
      createPayment: (data: unknown, callbacks: unknown) => void;
      /** Pi Ad Network SDK — available after Pi.init() in Pi Browser */
      Ads?: PiAdsSDK;
    };
  }
}

/* ─── Configuration ──────────────────────────────────────────── */

/** Ad Unit IDs from Pi Developer Portal → Ad Network → Ad Units */
export const AD_UNIT_IDS = {
  banner: (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PI_BANNER_AD_ID) || "",
  interstitial: (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PI_INTERSTITIAL_AD_ID) || "",
  rewarded: (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PI_REWARDED_AD_ID) || "",
} as const;

/** Whether Pi Ads are configured (at least one ad unit ID set) */
export const isPiAdsConfigured = Boolean(AD_UNIT_IDS.banner || AD_UNIT_IDS.interstitial || AD_UNIT_IDS.rewarded);

/* ─── State ──────────────────────────────────────────────────── */

let bannerVisible = false;
let interstitialShowing = false;
let lastAdShowTime = 0;

/** Minimum milliseconds between interstitial ads (avoid spam) */
const INTERSTITIAL_COOLDOWN_MS = 30_000; // 30 seconds

/** Minimum milliseconds between rewarded ad shows */
const REWARDED_COOLDOWN_MS = 60_000; // 1 minute

/* ─── Helpers ────────────────────────────────────────────────── */

/** Check if we're running inside Pi Browser with Ads SDK available */
export function isPiAdsAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.Pi?.Ads);
}

/** Get the Pi Ads SDK (null if not available) */
export function getPiAdsSDK(): PiAdsSDK | null {
  if (typeof window === "undefined") return null;
  return window.Pi?.Ads ?? null;
}

/** Check cooldown period has passed */
function checkCooldown(type: PiAdType): boolean {
  const now = Date.now();
  const cooldown = type === "rewarded" ? REWARDED_COOLDOWN_MS : INTERSTITIAL_COOLDOWN_MS;
  return (now - lastAdShowTime) >= cooldown;
}

/* ─── Banner Ad ──────────────────────────────────────────────── */

/**
 * Show a Pi Banner Ad.
 * Banner ads are typically displayed at the top or bottom of the screen.
 *
 * @param adUnitId - The ad unit ID from Pi Developer Portal
 * @param callbacks - Optional callbacks for ad events
 */
export function showBannerAd(
  adUnitId?: string,
  callbacks?: PiAdCallbacks,
): void {
  const unitId = adUnitId || AD_UNIT_IDS.banner;
  if (!unitId) {
    console.warn("[Pi Ads] No banner ad unit ID configured");
    return;
  }

  const sdk = getPiAdsSDK();
  if (!sdk) {
    console.log("[Pi Ads] Pi Ads SDK not available — banner ad not shown (running outside Pi Browser)");
    callbacks?.onAdFailedToLoad?.("Pi Ads SDK not available");
    return;
  }

  try {
    sdk.showBanner(unitId, {
      onAdLoaded: () => {
        bannerVisible = true;
        console.log("[Pi Ads] Banner ad loaded successfully");
        callbacks?.onAdLoaded?.();
      },
      onAdFailedToLoad: (error) => {
        console.warn("[Pi Ads] Banner ad failed to load:", error);
        callbacks?.onAdFailedToLoad?.(error);
      },
      onAdClicked: () => {
        console.log("[Pi Ads] Banner ad clicked");
        callbacks?.onAdClicked?.();
      },
      onAdImpression: () => {
        console.log("[Pi Ads] Banner ad impression recorded");
        callbacks?.onAdImpression?.();
      },
    });
  } catch (err) {
    console.error("[Pi Ads] Error showing banner ad:", err);
    callbacks?.onAdFailedToLoad?.(String(err));
  }
}

/**
 * Hide the currently visible banner ad.
 */
export function hideBannerAd(): void {
  const sdk = getPiAdsSDK();
  if (!sdk) return;

  try {
    sdk.hideBanner();
    bannerVisible = false;
    console.log("[Pi Ads] Banner ad hidden");
  } catch (err) {
    console.error("[Pi Ads] Error hiding banner ad:", err);
  }
}

/** Check if banner ad is currently visible */
export function isBannerVisible(): boolean {
  return bannerVisible;
}

/* ─── Interstitial Ad ────────────────────────────────────────── */

/**
 * Show a Pi Interstitial Ad (full-screen ad).
 * Interstitial ads should be shown at natural transition points
 * (e.g., between tabs, after completing an action).
 *
 * Includes a cooldown to prevent showing too frequently.
 *
 * @param adUnitId - The ad unit ID from Pi Developer Portal
 * @param callbacks - Optional callbacks for ad events
 * @returns true if ad was shown, false if skipped (cooldown/SDK not available)
 */
export function showInterstitialAd(
  adUnitId?: string,
  callbacks?: PiAdCallbacks,
): boolean {
  const unitId = adUnitId || AD_UNIT_IDS.interstitial;
  if (!unitId) {
    console.warn("[Pi Ads] No interstitial ad unit ID configured");
    return false;
  }

  // Check cooldown
  if (!checkCooldown("interstitial")) {
    console.log("[Pi Ads] Interstitial ad on cooldown — skipping");
    return false;
  }

  // Don't show if one is already displaying
  if (interstitialShowing) {
    console.log("[Pi Ads] Interstitial ad already showing — skipping");
    return false;
  }

  const sdk = getPiAdsSDK();
  if (!sdk) {
    console.log("[Pi Ads] Pi Ads SDK not available — interstitial not shown");
    return false;
  }

  try {
    interstitialShowing = true;
    sdk.showInterstitial(unitId, {
      onAdLoaded: () => {
        lastAdShowTime = Date.now();
        console.log("[Pi Ads] Interstitial ad loaded");
        callbacks?.onAdLoaded?.();
      },
      onAdFailedToLoad: (error) => {
        interstitialShowing = false;
        console.warn("[Pi Ads] Interstitial ad failed:", error);
        callbacks?.onAdFailedToLoad?.(error);
      },
      onAdClosed: () => {
        interstitialShowing = false;
        console.log("[Pi Ads] Interstitial ad closed");
        callbacks?.onAdClosed?.();
      },
      onAdClicked: () => {
        console.log("[Pi Ads] Interstitial ad clicked");
        callbacks?.onAdClicked?.();
      },
    });
    return true;
  } catch (err) {
    interstitialShowing = false;
    console.error("[Pi Ads] Error showing interstitial ad:", err);
    callbacks?.onAdFailedToLoad?.(String(err));
    return false;
  }
}

/* ─── Rewarded Ad ────────────────────────────────────────────── */

/**
 * Show a Pi Rewarded Ad.
 * User watches the ad and receives a reward upon completion.
 * Use for: unlocking features, earning Pi bonuses, etc.
 *
 * @param adUnitId - The ad unit ID from Pi Developer Portal
 * @param callbacks - Must include onReward to handle the earned reward
 * @returns true if ad was shown, false if skipped
 */
export function showRewardedAd(
  adUnitId?: string,
  callbacks?: PiAdCallbacks,
): boolean {
  const unitId = adUnitId || AD_UNIT_IDS.rewarded;
  if (!unitId) {
    console.warn("[Pi Ads] No rewarded ad unit ID configured");
    return false;
  }

  // Check cooldown
  if (!checkCooldown("rewarded")) {
    console.log("[Pi Ads] Rewarded ad on cooldown — skipping");
    return false;
  }

  const sdk = getPiAdsSDK();
  if (!sdk) {
    console.log("[Pi Ads] Pi Ads SDK not available — rewarded ad not shown");
    return false;
  }

  try {
    sdk.showRewarded(unitId, {
      onAdLoaded: () => {
        lastAdShowTime = Date.now();
        console.log("[Pi Ads] Rewarded ad loaded");
        callbacks?.onAdLoaded?.();
      },
      onAdFailedToLoad: (error) => {
        console.warn("[Pi Ads] Rewarded ad failed:", error);
        callbacks?.onAdFailedToLoad?.(error);
      },
      onAdClosed: () => {
        console.log("[Pi Ads] Rewarded ad closed");
        callbacks?.onAdClosed?.();
      },
      onReward: (reward) => {
        console.log("[Pi Ads] Reward earned:", reward);
        callbacks?.onReward?.(reward);
      },
      onAdClicked: () => {
        console.log("[Pi Ads] Rewarded ad clicked");
        callbacks?.onAdClicked?.();
      },
    });
    return true;
  } catch (err) {
    console.error("[Pi Ads] Error showing rewarded ad:", err);
    callbacks?.onAdFailedToLoad?.(String(err));
    return false;
  }
}

/* ─── Ad Status Info ─────────────────────────────────────────── */

/** Get current ad system status for display in UI */
export function getAdStatus(): {
  isAvailable: boolean;
  isConfigured: boolean;
  bannerVisible: boolean;
  interstitialShowing: boolean;
  cooldownRemaining: number;
  adUnitIds: { banner: boolean; interstitial: boolean; rewarded: boolean };
} {
  return {
    isAvailable: isPiAdsAvailable(),
    isConfigured: isPiAdsConfigured,
    bannerVisible,
    interstitialShowing,
    cooldownRemaining: Math.max(0, INTERSTITIAL_COOLDOWN_MS - (Date.now() - lastAdShowTime)),
    adUnitIds: {
      banner: Boolean(AD_UNIT_IDS.banner),
      interstitial: Boolean(AD_UNIT_IDS.interstitial),
      rewarded: Boolean(AD_UNIT_IDS.rewarded),
    },
  };
}
