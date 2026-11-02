import type { IsoDate, MonthKey } from "@/types/finance";

export const REPORTING_TIME_ZONE = "Asia/Manila";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_PATTERN.test(value);
}

function parseMonthKey(month: MonthKey): { year: number; month: number } {
  if (!isMonthKey(month)) {
    throw new RangeError(`Invalid month key: ${month}`);
  }
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, month: monthNumber };
}

function toMonthKey(year: number, month: number): MonthKey {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** "2026-11-02" → "2026-11". Dates are calendar dates, so no time zone math. */
export function getMonthKey(date: IsoDate): MonthKey {
  return date.slice(0, 7);
}

/** "2026-02" → "2026-02-28". */
export function getMonthEndDate(month: MonthKey): IsoDate {
  const { year, month: monthNumber } = parseMonthKey(month);
  // Day 0 of the next month is the last day of this month (UTC avoids DST).
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

/** "2026-11" → "November 2026". */
export function formatMonthLabel(month: MonthKey): string {
  const { year, month: monthNumber } = parseMonthKey(month);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

/** "2026-11-30" → "Nov 30, 2026". */
export function formatDateLabel(date: IsoDate): string {
  const { year, month } = parseMonthKey(getMonthKey(date));
  const day = Number(date.slice(8, 10));
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${day}, ${year}`;
}

/** Moves a month forward (positive) or back (negative): ("2026-01", -1) → "2025-12". */
export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const { year, month: monthNumber } = parseMonthKey(month);
  // Count months from year 0 so year boundaries need no special cases.
  const index = year * 12 + (monthNumber - 1) + delta;
  return toMonthKey(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1);
}

/** Every month from `start` to `end`, inclusive and in ascending order. */
export function listMonths(start: MonthKey, end: MonthKey): MonthKey[] {
  const from = parseMonthKey(start);
  const to = parseMonthKey(end);
  const months: MonthKey[] = [];

  for (
    let year = from.year, month = from.month;
    year < to.year || (year === to.year && month <= to.month);
    month === 12 ? ((month = 1), year++) : month++
  ) {
    months.push(toMonthKey(year, month));
  }
  return months;
}

/** Today's calendar date in Asia/Manila, regardless of the server's time zone. */
export function getTodayInManila(now: Date = new Date()): IsoDate {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The last date included in a month's balance: the month end for past
 * months, today for the current month, so future-dated entries are never
 * counted early.
 */
export function getReportingCutoff(month: MonthKey, today: IsoDate): IsoDate {
  const monthEnd = getMonthEndDate(month);
  return monthEnd < today ? monthEnd : today;
}

/**
 * Months the dashboard can show, newest first: from the earliest recorded
 * date (account opening or transaction) through the current month. Months
 * without transactions inside that range are included; future months aren't.
 */
export function getSelectableMonths(
  dates: readonly IsoDate[],
  today: IsoDate,
): MonthKey[] {
  const currentMonth = getMonthKey(today);
  const months = dates.map(getMonthKey);
  const earliest = months.reduce((min, m) => (m < min ? m : min), currentMonth);
  return listMonths(earliest, currentMonth).reverse();
}

/** True for a real calendar date in "YYYY-MM-DD" form ("2026-02-30" is false). */
export function isValidIsoDate(value: string): value is IsoDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
