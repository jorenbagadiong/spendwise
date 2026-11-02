import { describe, expect, it } from "vitest";

import {
  calculateAccountBalance,
  calculateMonthlySummary,
  calculateNetCashFlow,
  calculateTotalAccountBalance,
  calculateTotalExpenses,
  calculateTotalIncome,
  filterTransactionsByMonth,
} from "@/lib/finance/calculations";
import type { Account, Transaction } from "@/types/finance";

// Small hand-checked fixture: two accounts, activity in January and March,
// nothing in February.
const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 1_000_000, openingDate: "2026-01-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 50_000, openingDate: "2026-01-01", isActive: true },
];

const transactions: Transaction[] = [
  { id: "1", type: "income", amount: 2_000_000, date: "2026-01-15", description: "Salary", accountId: "bank", categoryId: "salary" },
  { id: "2", type: "expense", amount: 150_050, date: "2026-01-20", description: "Groceries", accountId: "bank", categoryId: "groceries" },
  { id: "3", type: "transfer", amount: 300_000, date: "2026-01-31", description: "ATM withdrawal", accountId: "bank", destinationAccountId: "wallet" },
  { id: "4", type: "expense", amount: 25_025, date: "2026-03-01", description: "Lunch", accountId: "wallet", categoryId: "food" },
  { id: "5", type: "income", amount: 10_000, date: "2026-03-31", description: "Refund", accountId: "wallet", categoryId: "other-income" },
];

describe("income, expenses, and net cash flow", () => {
  it("sums income transactions only", () => {
    expect(calculateTotalIncome(transactions)).toBe(2_010_000);
  });

  it("sums expense transactions only", () => {
    expect(calculateTotalExpenses(transactions)).toBe(175_075);
  });

  it("calculates net cash flow as income minus expenses", () => {
    expect(calculateNetCashFlow(transactions)).toBe(2_010_000 - 175_075);
  });

  it("returns a negative net cash flow when spending exceeds income", () => {
    const march = filterTransactionsByMonth(transactions, "2026-03");
    expect(calculateNetCashFlow(march)).toBe(10_000 - 25_025);
  });

  it("excludes transfers from income and expenses", () => {
    const onlyTransfer = transactions.filter((t) => t.type === "transfer");
    expect(calculateTotalIncome(onlyTransfer)).toBe(0);
    expect(calculateTotalExpenses(onlyTransfer)).toBe(0);
    expect(calculateNetCashFlow(onlyTransfer)).toBe(0);
  });

  it("returns zero for an empty list", () => {
    expect(calculateTotalIncome([])).toBe(0);
    expect(calculateTotalExpenses([])).toBe(0);
    expect(calculateNetCashFlow([])).toBe(0);
  });

  it("keeps centavo totals exact (no floating-point drift)", () => {
    // 0.10 + 0.20 in floating-point pesos is 0.30000000000000004.
    const cents: Transaction[] = [
      { id: "a", type: "income", amount: 10, date: "2026-01-01", description: "", accountId: "bank", categoryId: "x" },
      { id: "b", type: "income", amount: 20, date: "2026-01-01", description: "", accountId: "bank", categoryId: "x" },
    ];
    expect(calculateTotalIncome(cents)).toBe(30);
  });
});

describe("filterTransactionsByMonth", () => {
  it("includes the first and last day of the month", () => {
    const ids = filterTransactionsByMonth(transactions, "2026-03").map((t) => t.id);
    expect(ids).toEqual(["4", "5"]);
  });

  it("excludes the last day of the previous month", () => {
    const ids = filterTransactionsByMonth(transactions, "2026-01").map((t) => t.id);
    expect(ids).toEqual(["1", "2", "3"]);
  });

  it("returns an empty list for a month with no transactions", () => {
    expect(filterTransactionsByMonth(transactions, "2026-02")).toEqual([]);
  });
});

describe("account balances", () => {
  const [bank, wallet] = accounts;

  it("starts from the opening balance, which is not income", () => {
    expect(calculateAccountBalance(bank, [], "2026-01-01")).toBe(1_000_000);
    expect(calculateTotalIncome(transactions.filter((t) => t.date === "2026-01-01"))).toBe(0);
  });

  it("applies income, expenses, and outgoing transfers", () => {
    expect(calculateAccountBalance(bank, transactions, "2026-01-31")).toBe(
      1_000_000 + 2_000_000 - 150_050 - 300_000,
    );
  });

  it("applies incoming transfers to the destination account", () => {
    expect(calculateAccountBalance(wallet, transactions, "2026-01-31")).toBe(50_000 + 300_000);
  });

  it("ignores transactions after the cutoff date", () => {
    expect(calculateAccountBalance(bank, transactions, "2026-01-30")).toBe(
      1_000_000 + 2_000_000 - 150_050,
    );
  });

  it("is zero before the account's opening date", () => {
    expect(calculateAccountBalance(bank, transactions, "2025-12-31")).toBe(0);
  });

  it("uses all history, not just the reporting month", () => {
    // Nothing happened in February, but the balance reflects January.
    expect(calculateAccountBalance(wallet, transactions, "2026-02-28")).toBe(350_000);
  });

  it("transfers move money between accounts without changing the total", () => {
    const withoutTransfer = transactions.filter((t) => t.type !== "transfer");
    expect(calculateTotalAccountBalance(accounts, transactions, "2026-03-31")).toBe(
      calculateTotalAccountBalance(accounts, withoutTransfer, "2026-03-31"),
    );
  });

  it("totals all accounts: opening balances plus net cash flow", () => {
    expect(calculateTotalAccountBalance(accounts, transactions, "2026-03-31")).toBe(
      1_050_000 + calculateNetCashFlow(transactions),
    );
  });

  it("returns zero with no accounts", () => {
    expect(calculateTotalAccountBalance([], transactions, "2026-03-31")).toBe(0);
  });
});

describe("calculateMonthlySummary", () => {
  it("summarizes a past month with its month-end balance", () => {
    expect(calculateMonthlySummary(accounts, transactions, "2026-01", "2026-06-01")).toEqual({
      month: "2026-01",
      transactionCount: 3,
      totalIncome: 2_000_000,
      totalExpenses: 150_050,
      netCashFlow: 1_849_950,
      totalAccountBalance: 1_050_000 + 1_849_950,
      balanceAsOf: "2026-01-31",
    });
  });

  it("returns zero totals for an empty month but keeps the carried-forward balance", () => {
    expect(calculateMonthlySummary(accounts, transactions, "2026-02", "2026-06-01")).toEqual({
      month: "2026-02",
      transactionCount: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      totalAccountBalance: 2_899_950,
      balanceAsOf: "2026-02-28",
    });
  });

  it("uses today as the cutoff for the month in progress", () => {
    const summary = calculateMonthlySummary(accounts, transactions, "2026-03", "2026-03-15");
    expect(summary.balanceAsOf).toBe("2026-03-15");
    // Month totals still cover the whole month.
    expect(summary.transactionCount).toBe(2);
    // The balance excludes the March 31 refund, which is after the cutoff.
    expect(summary.totalAccountBalance).toBe(2_899_950 - 25_025);
  });

  it("handles no accounts and no transactions", () => {
    expect(calculateMonthlySummary([], [], "2026-01", "2026-01-10")).toEqual({
      month: "2026-01",
      transactionCount: 0,
      totalIncome: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      totalAccountBalance: 0,
      balanceAsOf: "2026-01-10",
    });
  });
});
