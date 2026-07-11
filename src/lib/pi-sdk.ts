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
  /** Amount in Pi (e.g. 1.00) */
  amount: number;
  /** Short memo shown to the user inside the Pi payment modal */
  memo: string;
  /** Arbitrary key/value pairs stored server-side for your own use */
  metadata: Record<string, unknown>;
}

export interface PiPaymentCallbacks {
  /** Pi signed the payment on-chain — approve it on your backend. */
  onReadyForServerApproval: (paymentId: string) => void;
  /** User confirmed — complete the payment on your backend with the txid. */
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  /** User cancelled the payment flow. */
  onCancel: (paymentId: string) => void;
  /** An error occurred. */
  onError: (error: { message: string }, payment?: { identifier: string }) => void;
}

/**
 * Minimal shape of the `window.Pi` global object exposed by the SDK.
 * We only declare what we actually use — the real object has more.
 */
export interface PiSDK {
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void,
  ) => Promise<PiUser>;
  createPayment: (
    paymentData: PiPaymentData,
    callbacks: PiPaymentCallbacks,
  ) => void;
}

/* Extend the Window interface so TypeScript knows about `window.Pi`. */
declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

/* ─── Helpers ─────────────────────────────────────────────── */

/**
 * Returns `true` when the Pi SDK global (`window.Pi`) exists.
 * In practice this is only `true` inside the official Pi Browser.
 */
export function isPiBrowser(): boolean {
  return typeof window !== "undefined" && window.Pi != null;
}

/**
 * Returns the Pi SDK object, or `null` if it is not loaded.
 */
export function getP(): PiSDK | null {
  if (typeof window === "undefined") return null;
  return window.Pi ?? null;
}

/* ─── Authentication ──────────────────────────────────────── */

/** Default Pi scopes required by Ledgererp. */
const DEFAULT_SCOPES = ["username", "payments"] as const;

/** Default handler for incomplete payments found during auth. */
const DEFAULT_ON_INCOMPLETE = (payment: unknown) => {
  console.warn("[Pi SDK] Incomplete payment found:", payment);
};

/**
 * Authenticate the current Pi user.
 *
 * Resolves with the user object (`{ uid, username, accessToken }`) on success.
 * The `accessToken` MUST be sent to your backend for server-side verification.
 *
 * @param onIncompletePaymentFound  Optional callback for any incomplete payment
 *                                  the SDK discovers during authentication.
 * @throws  When the SDK is not available or authentication is rejected.
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

  const auth = await pi.authenticate(
    [...DEFAULT_SCOPES],
    onIncompletePaymentFound ?? DEFAULT_ON_INCOMPLETE,
  );

  return auth;
}

/* ─── Payments ────────────────────────────────────────────── */

/**
 * Initiate a User-to-App (U2A) payment via the Pi SDK.
 *
 * This is the primary flow used in Ledgererp for escrow deposits:
 * 1. `onReadyForServerApproval`  → backend approves the payment
 * 2. `onReadyForServerCompletion` → backend completes the payment with the txid
 *
 * @param paymentData  Amount, memo, and metadata.
 * @param callbacks    Four lifecycle callbacks (approval, completion, cancel, error).
 * @throws  When the SDK is not available.
 */
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

  pi.createPayment(paymentData, callbacks);
}