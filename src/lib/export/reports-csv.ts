import { csvFilename, toCsvDocument, type CsvColumn } from "@/lib/export/csv";
import { accountTypeLabels } from "@/lib/finance/accounts";
import { formatCentavosAsDecimal } from "@/lib/finance/money";
import {
  getExpensesByAccount,
  getExpensesByCategory,
  getMonthlyTrend,
  percentOf,
} from "@/lib/finance/reports";
import type { Account, Category, Centavos, MonthKey, Transaction } from "@/types/finance";

// CSV versions of the Reports page tables. Every number comes from the
// SW-008B selectors; nothing is calculated here except formatting.
// Each dataset is its own file, and every row repeats its month, so rows
// stay meaningful if files are combined.

const money = (amount: Centavos) => formatCentavosAsDecimal(amount);
/** Two decimals, exact from the centavo amounts. Empty when the total is 0. */
const percent = (part: Centavos, total: Centavos) => percentOf(part, total, 2) ?? "";

// ---------------------------------------------------------------------------
// Monthly summary: the six months shown in the Reports trend chart. The
// margin is net ÷ income (getCashFlowMargin's rule), formatted exactly.

type MonthlySummaryRow = {
  month: MonthKey;
  income: Centavos;
  expenses: Centavos;
  netCashFlow: Centavos;
};

const MONTHLY_SUMMARY_COLUMNS: readonly CsvColumn<MonthlySummaryRow>[] = [
  { header: "Month", kind: "text", value: (r) => r.month },
  { header: "Income (PHP)", kind: "number", value: (r) => money(r.income) },
  { header: "Expenses (PHP)", kind: "number", value: (r) => money(r.expenses) },
  { header: "Net Cash Flow (PHP)", kind: "number", value: (r) => money(r.netCashFlow) },
  // Empty when the month has no income (shown as N/A on the page).
  { header: "Cash Flow Margin (%)", kind: "number", value: (r) => percent(r.netCashFlow, r.income) },
];

export function getMonthlySummaryRows(
  transactions: readonly Transaction[],
  month: MonthKey,
): MonthlySummaryRow[] {
  return getMonthlyTrend(transactions, month).map((point) => ({
    month: point.month,
    income: point.income,
    expenses: point.expenses,
    netCashFlow: point.netCashFlow,
  }));
}

/** Income, expenses, net, and margin for the selected month and the five before it. */
export function buildMonthlySummaryCsv(transactions: readonly Transaction[], month: MonthKey): string {
  return toCsvDocument(MONTHLY_SUMMARY_COLUMNS, getMonthlySummaryRows(transactions, month));
}

// ---------------------------------------------------------------------------
// Breakdowns: one row per category/account, then a Total row that matches
// the page's total expenses.

type BreakdownCsvRow = {
  month: MonthKey;
  name: string;
  accountType?: string;
  /** "Active" / "Archived"; empty on the Total row. */
  status: string;
  amount: Centavos;
  /** The period's total expenses, for the share column. */
  totalExpenses: Centavos;
  transactionCount: number;
};

function breakdownColumns(nameHeader: string, withAccountType: boolean): CsvColumn<BreakdownCsvRow>[] {
  return [
    { header: "Month", kind: "text", value: (r) => r.month },
    { header: nameHeader, kind: "text", value: (r) => r.name },
    ...(withAccountType
      ? [{ header: "Account Type", kind: "text", value: (r) => r.accountType ?? "" } as CsvColumn<BreakdownCsvRow>]
      : []),
    { header: "Status", kind: "text", value: (r) => r.status },
    { header: "Expenses (PHP)", kind: "number", value: (r) => money(r.amount) },
    { header: "Share of Expenses (%)", kind: "number", value: (r) => percent(r.amount, r.totalExpenses) },
    { header: "Transactions", kind: "number", value: (r) => String(r.transactionCount) },
  ];
}

function totalRow(month: MonthKey, rows: readonly BreakdownCsvRow[], totalExpenses: Centavos): BreakdownCsvRow {
  return {
    month,
    name: "Total",
    accountType: "",
    status: "",
    amount: totalExpenses,
    totalExpenses,
    transactionCount: rows.reduce((sum, r) => sum + r.transactionCount, 0),
  };
}

const status = (isArchived: boolean) => (isArchived ? "Archived" : "Active");

export function getCategoryBreakdownRows(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  month: MonthKey,
): BreakdownCsvRow[] {
  const breakdown = getExpensesByCategory(transactions, categories, month);
  const rows = breakdown.rows.map((r) => ({
    month,
    name: r.name,
    status: status(r.isArchived),
    amount: r.amount,
    totalExpenses: breakdown.totalExpenses,
    transactionCount: r.transactionCount,
  }));
  return [...rows, totalRow(month, rows, breakdown.totalExpenses)];
}

export function getAccountBreakdownRows(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  month: MonthKey,
): BreakdownCsvRow[] {
  const breakdown = getExpensesByAccount(transactions, accounts, month);
  const rows = breakdown.rows.map((r) => ({
    month,
    name: r.name,
    accountType: r.account ? accountTypeLabels[r.account.type] : "",
    status: status(r.isArchived),
    amount: r.amount,
    totalExpenses: breakdown.totalExpenses,
    transactionCount: r.transactionCount,
  }));
  return [...rows, totalRow(month, rows, breakdown.totalExpenses)];
}

export function buildCategoryBreakdownCsv(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  month: MonthKey,
): string {
  return toCsvDocument(breakdownColumns("Category", false), getCategoryBreakdownRows(transactions, categories, month));
}

export function buildAccountBreakdownCsv(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  month: MonthKey,
): string {
  return toCsvDocument(breakdownColumns("Account", true), getAccountBreakdownRows(transactions, accounts, month));
}

export type ReportCsvKind = "monthly-summary" | "expenses-by-category" | "expenses-by-account";

/** e.g. "spendwise-expenses-by-category-2026-11.csv". */
export function reportCsvFilename(kind: ReportCsvKind, month: MonthKey): string {
  return csvFilename(kind, month);
}
