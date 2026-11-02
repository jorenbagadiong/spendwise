import { describe, expect, it } from "vitest";

import { formatCurrency } from "@/lib/finance/money";
import { formatPercentOf } from "@/lib/finance/reports";
import { getSampleCategoryTotals, getSampleTotals, sampleTransactions } from "@/lib/landing/sample-month";

describe("landing page sample month", () => {
  it("adds up: transactions → categories → expenses → net cash flow", () => {
    const categories = getSampleCategoryTotals();
    expect(categories.map((c) => [c.category, formatCurrency(c.amount)])).toEqual([
      ["Food", "₱8,450.00"],
      ["Bills", "₱6,200.00"],
      ["Transportation", "₱2,350.00"],
      ["Other", "₱3,000.00"],
    ]);
    const { income, expenses, net } = getSampleTotals();
    expect(categories.reduce((sum, c) => sum + c.amount, 0)).toBe(expenses);
    expect(formatCurrency(income)).toBe("₱45,000.00");
    expect(formatCurrency(expenses)).toBe("₱20,000.00");
    expect(formatCurrency(net)).toBe("₱25,000.00");
    expect(income - expenses).toBe(net);
  });

  it("uses integer centavos and exact shares", () => {
    expect(sampleTransactions.every((t) => Number.isSafeInteger(t.amount) && t.amount > 0)).toBe(true);
    const { expenses } = getSampleTotals();
    expect(getSampleCategoryTotals().map((c) => formatPercentOf(c.amount, expenses))).toEqual(["42.3%", "31.0%", "11.8%", "15.0%"]);
  });
});
