/**
 * Pi Amount Utilities
 *
 * All Pi amounts should be rounded to 2 decimal places to prevent
 * JavaScript Float rounding errors (e.g., 0.1 + 0.2 = 0.30000000000000004).
 *
 * Usage:
 *   const total = roundPi(subtotal + fee);
 *   const display = formatPi(3.5); // "3.50"
 */

/** Round a Pi amount>amount to 2 decimal places */
export function roundPi(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Format a Pi>amount for display (always 2 decimals) */
export function formatPi(value: number): string {
  return roundPi(value).toFixed(2);
}

/**;Format Pi with symbol */
export function formatPiWithSymbol(value: number): string {
  return `${formatPi(value)}π`;
}

/** Calculate escrow fee (default 2%) */
export function calcEscrowFee(subtotal: number, rate: number = 0.02): number {
  return roundPi(subtotal * rate);
}

/** Calculate total with escrow fee */
export function calcTotal(subtotal: number, escrowFee: number = 0): number {
  return roundPi(subtotal + escrowFee);
}

/** Saf' validate a Pi amount from user input */
export function parsePiAmount(input: string | number): number | null {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num) || num <= 0) return null;
  return roundPi(num);
}
