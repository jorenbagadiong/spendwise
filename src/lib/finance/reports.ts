import type {
  Account,
  Category,
  Centavos,
  IsoDate,
  MonthKey,
  Transaction,
} from "@/types/finance";
import {
  calculateTotalExpenses,
  calculateTotalIncome,
  filterTransactionsByMonth,
} from "@/lib/finance/calculations";
import { getMonthKey, listMonths, shiftMonth } from "@/lib/finance/months";

// Report selectors for the Reports page. Like calculations.ts, every function
// is pure: reports are derived from the transaction list on demand and never
// stored. Totals are summed in integer centavos; percentages are computed
// once, from those exact totals, and only rounded when formatted.

export type MonthlyReport = {
  month: MonthKey;
  transactionCount: number;
  totalIncome: Centavos;
  totalExpenses: Centavos;
  netCashFlow: Centavos;
  /** Net cash flow as a percentage of income; null when there's no income. */
  cashFlowMargin: number | null;
};

/**
 * Net cash flow as a percentage of income (net ÷ income × 100). Returns null
 * when income is zero, because the ratio is undefined; it is never treated
 * as 0% or ±100%. Can be negative when expenses exceed income.
 */
export function getCashFlowMargin(
  totalIncome: Centavos,
  netCashFlow: Centavos,
): number | null {
  if (totalIncome === 0) return null;
  return (netCashFlow * 100) / totalIncome;
}

/**
 * Income, expenses, net cash flow, and cash flow margin for one month, using
 * the same rules as the dashboard: transfers are neither income nor expense,
 * and opening balances aren't transactions, so they never count as income.
 */
export function getMonthlyReport(
  transactions: readonly Transaction[],
  month: MonthKey,
): MonthlyReport {
  const monthTransactions = filterTransactionsByMonth(transactions, month);
  const totalIncome = calculateTotalIncome(monthTransactions);
  const totalExpenses = calculateTotalExpenses(monthTransactions);
  const netCashFlow = totalIncome - totalExpenses;

  return {
    month,
    transactionCount: monthTransactions.length,
    totalIncome,
    totalExpenses,
    netCashFlow,
    cashFlowMargin: getCashFlowMargin(totalIncome, netCashFlow),
  };
}

export type MonthlyTrendPoint = {
  month: MonthKey;
  income: Centavos;
  expenses: Centavos;
  netCashFlow: Centavos;
};

/**
 * Income and expenses for `months` consecutive months ending with
 * `endMonth`, oldest first. Months without activity are included as zeros.
 * One pass over the transactions, however many months are requested.
 */
export function getMonthlyTrend(
  transactions: readonly Transaction[],
  endMonth: MonthKey,
  months = 6,
): MonthlyTrendPoint[] {
  const keys = listMonths(shiftMonth(endMonth, -(months - 1)), endMonth);
  const totals = new Map(keys.map((month) => [month, { income: 0, expenses: 0 }]));

  for (const t of transactions) {
    const bucket = totals.get(getMonthKey(t.date));
    if (!bucket) continue;
    if (t.type === "income") bucket.income += t.amount;
    else if (t.type === "expense") bucket.expenses += t.amount;
  }

  return keys.map((month) => {
    const { income, expenses } = totals.get(month)!;
    return { month, income, expenses, netCashFlow: income - expenses };
  });
}

/** `part` as a percentage of `total`; 0 when the total is 0. */
export function getShare(part: Centavos, total: Centavos): number {
  return total === 0 ? 0 : (part * 100) / total;
}

type BreakdownRowBase = {
  id: string;
  /** Resolved from the shared store; a fallback label if the record is missing. */
  name: string;
  isArchived: boolean;
  amount: Centavos;
  transactionCount: number;
  /** Share of the period's total expenses (0–100, unrounded). */
  percentage: number;
};

export type CategoryBreakdownRow = BreakdownRowBase & {
  /** null only if the category no longer exists (storage integrity checks prevent this). */
  category: Category | null;
};

export type AccountBreakdownRow = BreakdownRowBase & {
  account: Account | null;
};

export type ExpenseBreakdown<Row> = {
  month: MonthKey;
  totalExpenses: Centavos;
  /** Highest spending first. Every referenced record is listed; nothing is folded into "Others". */
  rows: Row[];
};

/** Sums one month's expense transactions by a key (category or account id). */
function groupMonthExpenses(
  transactions: readonly Transaction[],
  month: MonthKey,
  keyOf: (t: Transaction & { type: "expense" }) => string,
) {
  const groups = new Map<string, { amount: Centavos; transactionCount: number }>();
  let total = 0;
  for (const t of transactions) {
    if (t.type !== "expense" || getMonthKey(t.date) !== month) continue;
    const key = keyOf(t);
    const group = groups.get(key) ?? { amount: 0, transactionCount: 0 };
    group.amount += t.amount;
    group.transactionCount += 1;
    groups.set(key, group);
    total += t.amount;
  }
  return { groups, total };
}

/** Highest amount first; ties by name, then id, so the order is stable. */
function byAmountThenName(a: BreakdownRowBase, b: BreakdownRowBase): number {
  return b.amount - a.amount || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/**
 * One month's expenses grouped by category. Income and transfers are
 * excluded. Archived categories are included when their past transactions
 * fall in the month, and are flagged so the UI can label them.
 */
export function getExpensesByCategory(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  month: MonthKey,
): ExpenseBreakdown<CategoryBreakdownRow> {
  const { groups, total } = groupMonthExpenses(transactions, month, (t) => t.categoryId);
  const byId = new Map(categories.map((c) => [c.id, c]));

  const rows = [...groups].map(([id, group]): CategoryBreakdownRow => {
    const category = byId.get(id) ?? null;
    return {
      id,
      name: category?.name ?? "Unknown category",
      isArchived: category ? !category.isActive : false,
      category,
      ...group,
      percentage: getShare(group.amount, total),
    };
  });

  return { month, totalExpenses: total, rows: rows.sort(byAmountThenName) };
}

/**
 * One month's expenses grouped by the account they were paid from. This is
 * spending per payment source, not an account balance: transfers, income,
 * and opening balances are excluded. Archived accounts are included.
 */
export function getExpensesByAccount(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  month: MonthKey,
): ExpenseBreakdown<AccountBreakdownRow> {
  const { groups, total } = groupMonthExpenses(transactions, month, (t) => t.accountId);
  const byId = new Map(accounts.map((a) => [a.id, a]));

  const rows = [...groups].map(([id, group]): AccountBreakdownRow => {
    const account = byId.get(id) ?? null;
    return {
      id,
      name: account?.name ?? "Unknown account",
      isArchived: account ? !account.isActive : false,
      account,
      ...group,
      percentage: getShare(group.amount, total),
    };
  });

  return { month, totalExpenses: total, rows: rows.sort(byAmountThenName) };
}

export type MetricChange = {
  current: Centavos;
  previous: Centavos;
  /** current − previous. Always defined. */
  difference: Centavos;
  /**
   * difference ÷ |previous| × 100, or null when the previous value is zero
   * (the percentage is undefined; show the absolute difference instead).
   */
  percentChange: number | null;
};

export type MonthOverMonthComparison = {
  month: MonthKey;
  previousMonth: MonthKey;
  income: MetricChange;
  expenses: MetricChange;
  netCashFlow: MetricChange;
};

function getChange(current: Centavos, previous: Centavos): MetricChange {
  const difference = current - previous;
  return {
    current,
    previous,
    difference,
    percentChange: previous === 0 ? null : (difference * 100) / Math.abs(previous),
  };
}

/** The selected month against the month immediately before it. */
export function getMonthOverMonthComparison(
  transactions: readonly Transaction[],
  month: MonthKey,
): MonthOverMonthComparison {
  const previousMonth = shiftMonth(month, -1);
  const current = getMonthlyReport(transactions, month);
  const previous = getMonthlyReport(transactions, previousMonth);

  return {
    month,
    previousMonth,
    income: getChange(current.totalIncome, previous.totalIncome),
    expenses: getChange(current.totalExpenses, previous.totalExpenses),
    netCashFlow: getChange(current.netCashFlow, previous.netCashFlow),
  };
}

/**
 * Months the Reports page can show, newest first: from the earliest account
 * opening or transaction through the current month, extended to the latest
 * transaction's month if any are dated in the future, so future-dated
 * records are never silently unreachable.
 */
export function getReportMonths(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  today: IsoDate,
): MonthKey[] {
  let earliest = getMonthKey(today);
  let latest = earliest;
  for (const a of accounts) {
    const m = getMonthKey(a.openingDate);
    if (m < earliest) earliest = m;
  }
  for (const t of transactions) {
    const m = getMonthKey(t.date);
    if (m < earliest) earliest = m;
    if (m > latest) latest = m;
  }
  return listMonths(earliest, latest).reverse();
}

/** Transactions in `month` dated after `today`. They're included in every total. */
export function countFutureDatedTransactions(
  transactions: readonly Transaction[],
  month: MonthKey,
  today: IsoDate,
): number {
  return transactions.filter((t) => t.date > today && getMonthKey(t.date) === month).length;
}

const big = (n: number) => BigInt(n);
const absBig = (n: bigint) => (n < big(0) ? -n : n);

/**
 * `part` as a percentage of `total`, as a decimal string with `decimals`
 * places, e.g. (1_624_950, 3_000_000, 2) → "54.17". Returns null when the
 * total is 0. Computed with exact integer (BigInt) division and rounded
 * half away from zero. Rounding the floating-point percentage instead
 * would turn 54.165 into "54.16", because 54.165 isn't exactly
 * representable as a float. Never returns "-0.00".
 */
export function percentOf(part: Centavos, total: Centavos, decimals = 1): string | null {
  if (total === 0) return null;
  const numerator = big(part) * big(10) ** big(decimals + 2);
  const denominator = big(total);
  let quotient = numerator / denominator; // truncates toward zero
  if (absBig(numerator % denominator) * big(2) >= absBig(denominator)) {
    quotient += (numerator < big(0)) !== (denominator < big(0)) ? big(-1) : big(1);
  }
  const digits = absBig(quotient).toString().padStart(decimals + 1, "0");
  const whole = decimals === 0 ? digits : `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
  return quotient < big(0) ? `-${whole}` : whole;
}

/**
 * Display form of percentOf: "54.2%", "+12.5%" with `signed`, or "N/A"
 * when the total is 0 (the percentage is undefined).
 */
export function formatPercentOf(
  part: Centavos,
  total: Centavos,
  { decimals = 1, signed = false }: { decimals?: number; signed?: boolean } = {},
): string {
  const value = percentOf(part, total, decimals);
  if (value === null) return "N/A";
  const positive = !value.startsWith("-") && /[1-9]/.test(value);
  return `${signed && positive ? "+" : ""}${value}%`;
}

/**
 * A rounded top for a chart's value axis, so gridlines land on clean
 * numbers: 3_712_000 centavos (₱37,120) → 4_000_000 (₱40,000). The step
 * between gridlines is 1, 1.5, 2, 2.5, 3, 4, 5, 6, or 8 × 10ⁿ pesos, so the
 * axis is never more than about a third taller than the data. 0 → 0.
 */
export function getNiceAxisMax(maxValue: Centavos, ticks = 4): Centavos {
  if (maxValue <= 0) return 0;
  const rawStepPesos = maxValue / 100 / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStepPesos));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude).find((s) => s >= rawStepPesos)!;
  return Math.round(step * ticks * 100);
}
