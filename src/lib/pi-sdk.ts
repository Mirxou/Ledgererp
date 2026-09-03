/**
 * Pi SDK Client Wrapper
 *
 * Client-side only module that wraps the official Pi Network SDK.
 *
 * Pi.init() takes an OBJECT: { version: "2.0", sandbox: boolean }
 * - sandbox: true  → Pi Sandbox / Developer Portal preview
 * - sandbox: false → Pi Mainnet (production)
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

/** Pi SDK init options — takes an OBJECT, not separate args */
export interface PiInitOptions {
  version: string;
  sandbox?: boolean;
}

/**
 * Minimal shape of the `window.Pi` global object exposed by the SDK.
 */
export interface PiSDK {
  init: (options: PiInitOptions) => void;
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
// Auto-detect sandbox: if hostname includes 'sandbox' or we're in Pi Dev Portal
function detectSandbox(): boolean {
  if (typeof window === "undefined") return true;
  // Pi Browser Developer Portal preview = sandbox
  // Production domain = mainnet
  const host = window.location.hostname;
  // If not on our production domain, assume sandbox for safety
  if (host === "ledgererp.online") return false;
  return true;
}

/* ─── State ───────────────────────────────────────────────── */
let sdkInitialized = false;
let initError: string | null = null;

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
 * Initialize the Pi SDK.
 * Pi.init({ version: "2.0", sandbox: true/false })
 */
export function initPi(): void {
  const pi = getP();
  if (!pi) return;
  if (sdkInitialized) return;

  try {
    const sandbox = detectSandbox();
    pi.init({ version: "2.0", sandbox });
    sdkInitialized = true;
    console.log("[Pi SDK] Initialized:", { version: "2.0", sandbox });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Pi SDK] init() failed:", msg);
    initError = msg;
    // Mark as initialized anyway to prevent infinite retries
    sdkInitialized = true;
  }
}

/** Get the last init error, if any */
export function getInitError(): string | null {
  return initError;
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
