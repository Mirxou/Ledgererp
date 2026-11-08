export const ESCROW_FEE_RATE = 0.02;
/* Demo mode:
 * - Always on in local development (NODE_ENV=development)
 * - On production (Vercel) ONLY when NEXT_PUBLIC_DEMO_MODE=true is set at build time
 *   (useful to preview the app in a normal browser — set to false before the real
 *   Pi Network / Ad Network review so real Pi authentication is used)
 */
export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV === "development";
export const DEMO_USER = { uid: "demo_user_pi_uid", username: "demo_user" };
