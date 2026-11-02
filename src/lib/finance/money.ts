import type { Centavos } from "@/types/finance";

type FormatCurrencyOptions = {
  /** Prefix positive amounts with "+" (useful for net cash flow). */
  signed?: boolean;
};

/**
 * Formats integer centavos as Philippine pesos, e.g. 123456 → "₱1,234.56".
 *
 * Built with integer and string operations instead of Intl.NumberFormat so
 * the output is identical on the server and in every browser (no hydration
 * mismatches) and no floating-point division is involved.
 */
export function formatCurrency(
  amount: Centavos,
  { signed = false }: FormatCurrencyOptions = {},
): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Amount must be an integer number of centavos: ${amount}`);
  }

  const absolute = Math.abs(amount);
  const pesos = Math.trunc(absolute / 100);
  const centavos = absolute % 100;
  const groupedPesos = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = `₱${groupedPesos}.${String(centavos).padStart(2, "0")}`;

  if (amount < 0) return `-${formatted}`;
  if (signed && amount > 0) return `+${formatted}`;
  return formatted;
}

/** Largest amount accepted from forms: ₱999,999,999.99. */
export const MAX_AMOUNT: Centavos = 99_999_999_999;

export type ParseAmountResult =
  | { ok: true; value: Centavos }
  | { ok: false; error: string };

/**
 * Parses a peso amount typed by a person ("1250", "1,250.50") into integer
 * centavos using string operations only, so "0.1" becomes exactly 10.
 * Malformed input is rejected, never rounded.
 */
export function parsePesosToCentavos(input: string): ParseAmountResult {
  const value = input.trim();

  if (value === "") return { ok: false, error: "Enter an amount." };
  if (/^-/.test(value)) return { ok: false, error: "Amount must be greater than zero." };
  if (/^(\d+|\d{1,3}(,\d{3})+)\.\d{3,}$/.test(value)) {
    return { ok: false, error: "Use at most two decimal places." };
  }

  // Digits with optional correctly grouped commas and up to two decimals.
  const match = /^(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    return { ok: false, error: "Enter a valid amount, like 1250 or 1,250.50." };
  }

  const pesos = match[1].replaceAll(",", "").replace(/^0+(?=\d)/, "");
  const centavos = (match[2] ?? "").padEnd(2, "0");
  if (pesos.length > 9) return { ok: false, error: "Amount is too large." };

  const amount = Number(pesos) * 100 + Number(centavos);
  if (amount === 0) return { ok: false, error: "Amount must be greater than zero." };
  if (amount > MAX_AMOUNT) return { ok: false, error: "Amount is too large." };
  return { ok: true, value: amount };
}

/** Centavos to an editable form value: 125050 → "1250.50". */
export function formatCentavosForInput(amount: Centavos): string {
  return `${Math.trunc(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}
