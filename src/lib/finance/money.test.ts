import { describe, expect, it } from "vitest";

import {
  formatCentavosForInput,
  formatCurrency,
  parsePesosToCentavos,
} from "@/lib/finance/money";

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

describe("parsePesosToCentavos", () => {
  it.each([
    ["1", 100],
    ["1250", 125_000],
    ["1250.5", 125_050],
    ["1250.50", 125_050],
    ["1,250.50", 125_050],
    ["1,234,567.89", 123_456_789],
    ["0.10", 10],
    ["0.01", 1],
    ["  18500 ", 1_850_000],
    ["007.5", 750],
    ["999999999.99", 99_999_999_999],
  ])("parses %s as %i centavos", (input, expected) => {
    expect(parsePesosToCentavos(input)).toEqual({ ok: true, value: expected });
  });

  it("is exact where floating-point math is not", () => {
    // 0.29 * 100 is 28.999999999999996 in floating point.
    expect(parsePesosToCentavos("0.29")).toEqual({ ok: true, value: 29 });
    expect(parsePesosToCentavos("1.15")).toEqual({ ok: true, value: 115 });
  });

  it.each([
    ["", "Enter an amount."],
    ["   ", "Enter an amount."],
    ["0", "Amount must be greater than zero."],
    ["0.00", "Amount must be greater than zero."],
    ["-5", "Amount must be greater than zero."],
    ["1.234", "Use at most two decimal places."],
    ["1,250.555", "Use at most two decimal places."],
    ["abc", "Enter a valid amount, like 1250 or 1,250.50."],
    ["1e3", "Enter a valid amount, like 1250 or 1,250.50."],
    ["Infinity", "Enter a valid amount, like 1250 or 1,250.50."],
    ["NaN", "Enter a valid amount, like 1250 or 1,250.50."],
    ["12.", "Enter a valid amount, like 1250 or 1,250.50."],
    [".5", "Enter a valid amount, like 1250 or 1,250.50."],
    ["1,23.00", "Enter a valid amount, like 1250 or 1,250.50."],
    ["12,50", "Enter a valid amount, like 1250 or 1,250.50."],
    ["₱100", "Enter a valid amount, like 1250 or 1,250.50."],
    ["1 000", "Enter a valid amount, like 1250 or 1,250.50."],
    ["0x10", "Enter a valid amount, like 1250 or 1,250.50."],
    ["1000000000", "Amount is too large."],
  ])("rejects %j", (input, error) => {
    expect(parsePesosToCentavos(input)).toEqual({ ok: false, error });
  });
});

describe("formatCentavosForInput", () => {
  it("formats centavos as an editable peso value", () => {
    expect(formatCentavosForInput(125_050)).toBe("1250.50");
    expect(formatCentavosForInput(5)).toBe("0.05");
    expect(formatCentavosForInput(1_850_000)).toBe("18500.00");
  });

  it("round-trips through parsePesosToCentavos", () => {
    for (const amount of [1, 99, 100, 123_456, 99_999_999_999]) {
      expect(parsePesosToCentavos(formatCentavosForInput(amount))).toEqual({ ok: true, value: amount });
    }
  });
});
