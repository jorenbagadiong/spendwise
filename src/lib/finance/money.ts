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
