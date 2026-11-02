import { describe, expect, it } from "vitest";

import {
  formatDateLabel,
  formatMonthLabel,
  getMonthEndDate,
  getMonthKey,
  getReportingCutoff,
  getSelectableMonths,
  getTodayInManila,
  isMonthKey,
  listMonths,
} from "@/lib/finance/months";

describe("month helpers", () => {
  it("extracts the month key from a date", () => {
    expect(getMonthKey("2026-11-02")).toBe("2026-11");
  });

  it("finds the last day of each month, including leap years", () => {
    expect(getMonthEndDate("2026-01")).toBe("2026-01-31");
    expect(getMonthEndDate("2026-02")).toBe("2026-02-28");
    expect(getMonthEndDate("2028-02")).toBe("2028-02-29");
    expect(getMonthEndDate("2026-09")).toBe("2026-09-30");
    expect(getMonthEndDate("2026-12")).toBe("2026-12-31");
  });

  it("validates month keys", () => {
    expect(isMonthKey("2026-11")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-1")).toBe(false);
    expect(() => getMonthEndDate("2026-00")).toThrow(RangeError);
  });

  it("formats labels", () => {
    expect(formatMonthLabel("2026-09")).toBe("September 2026");
    expect(formatDateLabel("2026-11-02")).toBe("Nov 2, 2026");
  });

  it("lists months across a year boundary", () => {
    expect(listMonths("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(listMonths("2026-05", "2026-05")).toEqual(["2026-05"]);
    expect(listMonths("2026-06", "2026-05")).toEqual([]);
  });
});

describe("Asia/Manila reporting dates", () => {
  it("uses the Manila calendar date, not UTC", () => {
    // 2026-10-31 16:30 UTC is already Nov 1, 00:30 in Manila (UTC+8).
    expect(getTodayInManila(new Date("2026-10-31T16:30:00Z"))).toBe("2026-11-01");
    expect(getTodayInManila(new Date("2026-10-31T15:59:59Z"))).toBe("2026-10-31");
  });

  it("caps the reporting cutoff at today for the current month", () => {
    expect(getReportingCutoff("2026-11", "2026-11-02")).toBe("2026-11-02");
    expect(getReportingCutoff("2026-10", "2026-11-02")).toBe("2026-10-31");
    expect(getReportingCutoff("2026-10", "2026-10-31")).toBe("2026-10-31");
  });
});

describe("getSelectableMonths", () => {
  it("lists months from the earliest date to the current month, newest first", () => {
    expect(getSelectableMonths(["2026-08-15", "2026-07-01"], "2026-10-05")).toEqual([
      "2026-10",
      "2026-09",
      "2026-08",
      "2026-07",
    ]);
  });

  it("never offers future months, even for future-dated records", () => {
    expect(getSelectableMonths(["2026-12-01"], "2026-10-05")).toEqual(["2026-10"]);
  });

  it("offers only the current month when there is no data", () => {
    expect(getSelectableMonths([], "2026-10-05")).toEqual(["2026-10"]);
  });
});
