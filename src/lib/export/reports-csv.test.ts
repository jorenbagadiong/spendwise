import { describe, expect, it } from "vitest";

import { UTF8_BOM } from "@/lib/export/csv";
import { parseCsv } from "@/lib/export/csv-test-helpers";
import {
  buildAccountBreakdownCsv,
  buildCategoryBreakdownCsv,
  buildMonthlySummaryCsv,
  reportCsvFilename,
} from "@/lib/export/reports-csv";
import { getExpensesByAccount, getExpensesByCategory, getMonthlyReport } from "@/lib/finance/reports";
import type { Account, Category, Transaction } from "@/types/finance";

// January 2026: income ₱50,000.00; expenses ₱20,000.00 (bills ₱12,000.00,
// food ₱7,000.50, hobby (archived) ₱999.50); one ₱10,000 transfer.
// December 2025: food ₱100.00. February 2026: no transactions.

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 1_000_000, openingDate: "2025-12-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 0, openingDate: "2025-12-01", isActive: true },
  { id: "old-card", name: "=Old Card", type: "bank", openingBalance: 0, openingDate: "2025-12-01", isActive: false },
];

const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "orange", isActive: true },
  { id: "bills", name: "Bills, utilities", type: "expense", icon: "receipt", color: "amber", isActive: true },
  { id: "hobby", name: "Hobby", type: "expense", icon: "gift", color: "violet", isActive: false },
];

const transactions: Transaction[] = [
  { id: "txn-001", type: "expense", amount: 10_000, date: "2025-12-31", description: "Dinner", accountId: "wallet", categoryId: "food" },
  { id: "txn-002", type: "income", amount: 5_000_000, date: "2026-01-01", description: "Salary", accountId: "bank", categoryId: "salary" },
  { id: "txn-003", type: "expense", amount: 1_200_000, date: "2026-01-05", description: "Rent", accountId: "bank", categoryId: "bills" },
  { id: "txn-004", type: "expense", amount: 300_050, date: "2026-01-10", description: "Groceries", accountId: "wallet", categoryId: "food" },
  { id: "txn-005", type: "expense", amount: 99_950, date: "2026-01-20", description: "Paints", accountId: "old-card", categoryId: "hobby" },
  { id: "txn-006", type: "transfer", amount: 1_000_000, date: "2026-01-25", description: "ATM", accountId: "bank", destinationAccountId: "wallet" },
  { id: "txn-007", type: "expense", amount: 400_000, date: "2026-01-31", description: "Restaurant", accountId: "bank", categoryId: "food" },
];

function parse(csv: string) {
  expect(csv.startsWith(UTF8_BOM)).toBe(true);
  return parseCsv(csv.slice(UTF8_BOM.length));
}

describe("monthly summary CSV", () => {
  it("lists the selected month and the five before it, with zero months included", () => {
    const rows = parse(buildMonthlySummaryCsv(transactions, "2026-01"));
    expect(rows[0]).toEqual(["Month", "Income (PHP)", "Expenses (PHP)", "Net Cash Flow (PHP)", "Cash Flow Margin (%)"]);
    expect(rows.slice(1)).toEqual([
      ["2025-08", "0.00", "0.00", "0.00", ""],
      ["2025-09", "0.00", "0.00", "0.00", ""],
      ["2025-10", "0.00", "0.00", "0.00", ""],
      ["2025-11", "0.00", "0.00", "0.00", ""],
      ["2025-12", "0.00", "100.00", "-100.00", ""],
      ["2026-01", "50000.00", "20000.00", "30000.00", "60.00"],
    ]);
  });

  it("matches the Reports page totals and excludes transfers", () => {
    const last = parse(buildMonthlySummaryCsv(transactions, "2026-01")).at(-1)!;
    const report = getMonthlyReport(transactions, "2026-01");
    expect(last[1]).toBe((report.totalIncome / 100).toFixed(2));
    expect(last[2]).toBe((report.totalExpenses / 100).toFixed(2)); // ₱10,000 transfer not counted
  });

  it("handles an empty dataset", () => {
    const rows = parse(buildMonthlySummaryCsv([], "2026-02"));
    expect(rows).toHaveLength(7);
    expect(rows.slice(1).every((r) => r[1] === "0.00" && r[4] === "")).toBe(true);
  });
});

describe("expenses by category CSV", () => {
  it("lists categories highest first with a reconciling Total row", () => {
    const rows = parse(buildCategoryBreakdownCsv(transactions, categories, "2026-01"));
    expect(rows).toEqual([
      ["Month", "Category", "Status", "Expenses (PHP)", "Share of Expenses (%)", "Transactions"],
      ["2026-01", "Bills, utilities", "Active", "12000.00", "60.00", "1"],
      ["2026-01", "Food", "Active", "7000.50", "35.00", "2"],
      ["2026-01", "Hobby", "Archived", "999.50", "5.00", "1"],
      ["2026-01", "Total", "", "20000.00", "100.00", "4"],
    ]);
    expect(getExpensesByCategory(transactions, categories, "2026-01").totalExpenses).toBe(2_000_000);
  });

  it("writes only the header and a zero Total row for a month without expenses", () => {
    expect(parse(buildCategoryBreakdownCsv(transactions, categories, "2026-02")).slice(1)).toEqual([
      ["2026-02", "Total", "", "0.00", "", "0"],
    ]);
  });
});

describe("expenses by account CSV", () => {
  it("lists source accounts, archived ones included, with a Total row", () => {
    const rows = parse(buildAccountBreakdownCsv(transactions, accounts, "2026-01"));
    expect(rows).toEqual([
      ["Month", "Account", "Account Type", "Status", "Expenses (PHP)", "Share of Expenses (%)", "Transactions"],
      ["2026-01", "Bank", "Bank", "Active", "16000.00", "80.00", "2"],
      ["2026-01", "Wallet", "Cash", "Active", "3000.50", "15.00", "1"],
      ["2026-01", "'=Old Card", "Bank", "Archived", "999.50", "5.00", "1"], // formula-like name neutralized
      ["2026-01", "Total", "", "", "20000.00", "100.00", "4"],
    ]);
    expect(getExpensesByAccount(transactions, accounts, "2026-01").totalExpenses).toBe(2_000_000);
  });

  it("sums account rows to the Total row exactly", () => {
    const rows = parse(buildAccountBreakdownCsv(transactions, accounts, "2026-01")).slice(1);
    const centavos = (s: string) => Number(s.replace(".", ""));
    const sum = rows.slice(0, -1).reduce((total, r) => total + centavos(r[4]), 0);
    expect(sum).toBe(centavos(rows.at(-1)![4]));
  });
});

describe("report CSV filenames", () => {
  it("names each dataset by kind and month", () => {
    expect(reportCsvFilename("monthly-summary", "2026-11")).toBe("spendwise-monthly-summary-2026-11.csv");
    expect(reportCsvFilename("expenses-by-category", "2026-11")).toBe("spendwise-expenses-by-category-2026-11.csv");
    expect(reportCsvFilename("expenses-by-account", "2026-11")).toBe("spendwise-expenses-by-account-2026-11.csv");
  });
});

describe("source data", () => {
  it("is never mutated by report exports", () => {
    const before = structuredClone(transactions);
    const frozen = Object.freeze(transactions.map((t) => Object.freeze({ ...t })));
    buildMonthlySummaryCsv(frozen, "2026-01");
    buildCategoryBreakdownCsv(frozen, categories, "2026-01");
    buildAccountBreakdownCsv(frozen, accounts, "2026-01");
    expect(transactions).toEqual(before);
  });
});
