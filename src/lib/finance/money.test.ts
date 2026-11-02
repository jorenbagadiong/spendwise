import { describe, expect, it } from "vitest";

import { formatCurrency } from "@/lib/finance/money";

describe("formatCurrency", () => {
  it.each([
    [0, "₱0.00"],
    [5, "₱0.05"],
    [99, "₱0.99"],
    [100, "₱1.00"],
    [123_456, "₱1,234.56"],
    [1_850_000, "₱18,500.00"],
    [123_456_789_00, "₱123,456,789.00"],
  ])("formats %i centavos as %s", (amount, expected) => {
    expect(formatCurrency(amount)).toBe(expected);
  });

  it("formats negative amounts with a leading minus", () => {
    expect(formatCurrency(-48_500)).toBe("-₱485.00");
  });

  it("adds a plus sign to positive amounts when signed", () => {
    expect(formatCurrency(48_500, { signed: true })).toBe("+₱485.00");
    expect(formatCurrency(-48_500, { signed: true })).toBe("-₱485.00");
  });

  it("never signs zero", () => {
    expect(formatCurrency(0, { signed: true })).toBe("₱0.00");
    expect(formatCurrency(-0)).toBe("₱0.00");
  });

  it("rejects fractional centavos", () => {
    expect(() => formatCurrency(10.5)).toThrow(RangeError);
  });
});
