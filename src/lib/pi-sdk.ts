/**
 * Pi SDK Client Wrapper
 *
 * Client-side only module that wraps the official Pi Network SDK (loaded from
 * https://sdk.minepi.com/pi-sdk.js). All functions gracefully handle the case
 * where the SDK is unavailable (i.e. the user is NOT inside the Pi Browser).
 */

/* ─── Global type augmentation ─────────────────────────────── */
export interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
}

export interface PiPaymentData {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
}

export interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: { message: string }, payment?: { identifier: string }) => void;
}

/**
 * Minimal shape of the `window.Pi` global object exposed by the SDK.
 */
export interface PiSDK {
  init: (appId: string, version: string) => void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void,
  ) => Promise<PiUser>;
  createPayment: (
    paymentData: PiPaymentData,
    callbacks: PiPaymentCallbacks,
  ) => void;
}

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

/* ─── Config ──────────────────────────────────────────────── */
const PI_APP_ID = "ledgererp-audit";
const PI_APP_VERSION = "1.0.0";

/* ─── State ───────────────────────────────────────────────── */
let sdkInitialized = false;

/* ─── Helpers ─────────────────────────────────────────────── */

export function isPiBrowser(): boolean {
  return typeof window !== "undefined" && window.Pi != null;
}

export function getP(): PiSDK | null {
  if (typeof window === "undefined") return null;
  return window.Pi ?? null;
}

/* ─── Initialization ──────────────────────────────────────── */

/**
 * Initialize the Pi SDK. MUST be called before authenticate() or createPayment().
 * Pi.init(appId, version) — required by Pi SDK v2.0+
 */
export function initPi(): void {
  const pi = getP();
  if (!pi) return;
  if (sdkInitialized) return;

  try {
    pi.init(PI_APP_ID, PI_APP_VERSION);
    sdkInitialized = true;
    console.log("[Pi SDK] Initialized successfully:", PI_APP_ID, PI_APP_VERSION);
  } catch (err) {
    console.error("[Pi SDK] init() failed:", err);
    // Don't throw — some SDK versions may not require init()
  }
}

/* ─── Authentication ──────────────────────────────────────── */

const DEFAULT_SCOPES = ["username", "payments"] as const;

const DEFAULT_ON_INCOMPLETE = (payment: unknown) => {
  console.warn("[Pi SDK] Incomplete payment found:", payment);
};

/**
 * Authenticate the current Pi user.
 * Automatically calls Pi.init() first if not already done.
 */
export async function authenticatePi(
  onIncompletePaymentFound?: (payment: unknown) => void,
): Promise<PiUser> {
  const pi = getP();

  if (!pi) {
    throw new Error(
      "Pi SDK is not available. Please open this application inside the Pi Browser.",
    );
  }

  // Ensure SDK is initialized before calling authenticate
  if (!sdkInitialized) {
    initPi();
  }

  const auth = await pi.authenticate(
    [...DEFAULT_SCOPES],
    onIncompletePaymentFound ?? DEFAULT_ON_INCOMPLETE,
  );

  return auth;
}

/* ─── Payments ────────────────────────────────────────────── */

export function createPiPayment(
  paymentData: PiPaymentData,
  callbacks: PiPaymentCallbacks,
): void {
  const pi = getP();

  if (!pi) {
    callbacks.onError(
      { message: "Pi SDK is not available. Please open this application inside the Pi Browser." },
    );
    return;
  }

  // Ensure SDK is initialized
  if (!sdkInitialized) {
    initPi();
  }

  pi.createPayment(paymentData, callbacks);
}
