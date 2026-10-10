/**
 * Pi Amount Utilities
 *
 * All Pi amounts are stored as Int in microPi units (1 Pi = 10,000,000 microPi).
 * This avoids JavaScript Float rounding errors entirely since all DB values are integers.
 *
 * Convention:
 *   - DB storage: Int (microPi) — e.g., 3.5 Pi stored as 35000000
 *   - API/UI: Float (Pi) — converted via microToPi() / piToMicro()
 *
 * Usage:
 *   // Store in DB:
 *   const microAmount = piToMicro(3.5); // 35000000
 *   // Read from DB:
 *   const piDisplay = microToPi(35000000); // 3.5
 *   // Display:
 *   const formatted = formatPi(piDisplay); // "3.5000000"
 */

/** Pi Network supports 7 decimal places */
export const PI_DECIMALS = 7;

/** 1 Pi = 10,000,000 microPi (10^7) */
export const PI_UNIT = 10_000_000;

/** Convert Pi float to microPi integer for DB storage */
export function piToMicro(pi: number): number {
  return Math.round(pi * PI_UNIT);
}

/** Convert microPi integer from DB to Pi float for display/calculation */
export function microToPi(micro: number): number {
  return micro / PI_UNIT;
}

/**
 * @deprecated Use piToMicro()/microToPi() instead for Int-based DB storage.
 * Round a Pi amount to 7 decimal places (legacy compatibility).
 */
export function roundPi(value: number): number {
  return Math.round(value * PI_UNIT) / PI_UNIT;
}

/** Format a Pi amount for display (7 decimal places) */
export function formatPi(value: number): string {
  return value.toFixed(PI_DECIMALS);
}

/** Format Pi with symbol */
export function formatPiWithSymbol(value: number): string {
  return `${formatPi(value)}π`;
}

/** Calculate escrow fee (default 2%) — returns microPi */
export function calcEscrowFeeMicro(subtotalMicro: number, rate: number = 0.02): number {
  return Math.round(subtotalMicro * rate);
}

/** Calculate total with escrow fee — returns microPi */
export function calcTotalMicro(subtotalMicro: number, escrowFeeMicro: number = 0): number {
  return subtotalMicro + escrowFeeMicro;
}

/**
 * @deprecated Use calcEscrowFeeMicro() instead.
 * Calculate escrow fee (default 2%) — legacy Float-based.
 */
export function calcEscrowFee(subtotal: number, rate: number = 0.02): number {
  return roundPi(subtotal * rate);
}

/**
 * @deprecated Use calcTotalMicro() instead.
 * Calculate total with escrow fee — legacy Float-based.
 */
export function calcTotal(subtotal: number, escrowFee: number = 0): number {
  return roundPi(subtotal + escrowFee);
}

/** Format Pi amount with Arabic-aware locale */
export function formatPiLocale(value: number): string {
  return value.toLocaleString("ar-DZ", {
    minimumFractionDigits: PI_DECIMALS,
    maximumFractionDigits: PI_DECIMALS,
  });
}

/** Format microPi for display (converts to Pi first) */
export function formatMicroPi(micro: number): string {
  return formatPi(microToPi(micro));
}

/** Format microPi with symbol */
export function formatMicroPiWithSymbol(micro: number): string {
  return `${formatMicroPi(micro)}π`;
}

/** Safely validate a Pi amount from user input, returns microPi for DB storage */
export function parsePiAmountToMicro(input: string | number): number | null {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num) || num <= 0) return null;
  return piToMicro(num);
}

/**
 * @deprecated Use parsePiAmountToMicro() instead.
 * Safely validate a Pi amount from user input — legacy Float-based.
 */
export function parsePiAmount(input: string | number): number | null {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num) || num <= 0) return null;
  return roundPi(num);
}
