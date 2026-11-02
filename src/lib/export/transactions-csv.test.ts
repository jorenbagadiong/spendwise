import { describe, expect, it } from "vitest";

import { UTF8_BOM } from "@/lib/export/csv";
import { parseCsv } from "@/lib/export/csv-test-helpers";
import {
  buildTransactionsCsv,
  getSignedAmount,
  selectTransactionsForExport,
  toTransactionCsvRows,
  transactionsCsvFilename,
} from "@/lib/export/transactions-csv";
import { getMonthlyReport } from "@/lib/finance/reports";
import { ALL, getDefaultFilters, paginate, type TransactionFilters } from "@/lib/finance/transactions";
import type { Account, Category, Transaction } from "@/types/finance";

const accounts: Account[] = [
  { id: "bpi", name: "BPI Savings", type: "bank", openingBalance: 1_000_000, openingDate: "2026-01-01", isActive: true },
  { id: "gcash", name: "GCash", type: "e_wallet", openingBalance: 0, openingDate: "2026-01-01", isActive: true },
  { id: "old", name: "Old Wallet", type: "cash", openingBalance: 0, openingDate: "2026-01-01", isActive: false },
];

const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true },
  { id: "food", name: "Food, drinks", type: "expense", icon: "utensils", color: "orange", isActive: true },
  { id: "hobby", name: "Hobby", type: "expense", icon: "gift", color: "violet", isActive: false },
];

const transactions: Transaction[] = [
  { id: "txn-001", type: "income", amount: 3_500_000, date: "2026-02-15", description: "February salary", accountId: "bpi", categoryId: "salary" },
  { id: "txn-002", type: "expense", amount: 12_550, date: "2026-02-16", description: 'Lunch, "special" combo', accountId: "gcash", categoryId: "food" },
  { id: "txn-003", type: "transfer", amount: 500_000, date: "2026-02-17", description: "Cash-in\nfrom BPI", accountId: "bpi", destinationAccountId: "gcash" },
  { id: "txn-004", type: "expense", amount: 99_99, date: "2026-02-18", description: "=HYPERLINK(\"http://evil.example\")", accountId: "old", categoryId: "hobby" },
  { id: "txn-005", type: "expense", amount: 30, date: "2026-03-01", description: "Pandesal para kay Lola – ñ ₱ 😀", accountId: "gcash", categoryId: "food" },
];

const HEADER = ["Date", "Type", "Description", "Category", "From Account", "To Account", "Amount (PHP)"];

function parse(csv: string) {
  expect(csv.startsWith(UTF8_BOM)).toBe(true);
  return parseCsv(csv.slice(UTF8_BOM.length));
}

describe("buildTransactionsCsv", () => {
  it("writes only the header for an empty dataset", () => {
    expect(parse(buildTransactionsCsv([], accounts, categories))).toEqual([HEADER]);
  });

  it("writes a single transaction", () => {
    expect(parse(buildTransactionsCsv([transactions[0]], accounts, categories))).toEqual([
      HEADER,
      ["2026-02-15", "Income", "February salary", "Salary", "", "BPI Savings", "35000.00"],
    ]);
  });

  it("formats income, expense, and transfer rows by the schema rules", () => {
    const rows = parse(buildTransactionsCsv(transactions, accounts, categories)).slice(1);
    // Income: positive, destination only.
    expect(rows[0]).toEqual(["2026-02-15", "Income", "February salary", "Salary", "", "BPI Savings", "35000.00"]);
    // Expense: negative, source only; commas and quotes survive.
    expect(rows[1]).toEqual(["2026-02-16", "Expense", 'Lunch, "special" combo', "Food, drinks", "GCash", "", "-125.50"]);
    // Transfer: positive, both accounts, no category; multiline description survives.
    expect(rows[2]).toEqual(["2026-02-17", "Transfer", "Cash-in\nfrom BPI", "", "BPI Savings", "GCash", "5000.00"]);
  });

  it("resolves archived account and category names without exposing ids", () => {
    const row = parse(buildTransactionsCsv([transactions[3]], accounts, categories))[1];
    expect(row[3]).toBe("Hobby");
    expect(row[4]).toBe("Old Wallet");
    expect(row.join("|")).not.toMatch(/\b(old|hobby|txn-004)\b/);
  });

  it("falls back to a label, never an id, for a missing reference", () => {
    const row = parse(buildTransactionsCsv([transactions[1]], [], []))[1];
    expect(row[3]).toBe("Unknown category");
    expect(row[4]).toBe("Unknown account");
  });

  it("neutralizes formula injection in descriptions only in the export", () => {
    const row = parse(buildTransactionsCsv([transactions[3]], accounts, categories))[1];
    expect(row[2]).toBe("'=HYPERLINK(\"http://evil.example\")");
    expect(row[6]).toBe("-99.99"); // amounts stay numeric
    expect(transactions[3].description).toBe("=HYPERLINK(\"http://evil.example\")"); // record untouched
  });

  it("neutralizes formula-like account and category names too", () => {
    const evilAccounts: Account[] = [{ ...accounts[1], name: "@SUM(1)" }];
    const evilCategories: Category[] = [{ ...categories[1], name: "+cmd" }];
    const row = parse(buildTransactionsCsv([transactions[1]], evilAccounts, evilCategories))[1];
    expect(row[3]).toBe("'+cmd");
    expect(row[4]).toBe("'@SUM(1)");
  });

  it("preserves Unicode text", () => {
    const row = parse(buildTransactionsCsv([transactions[4]], accounts, categories))[1];
    expect(row[2]).toBe("Pandesal para kay Lola – ñ ₱ 😀");
    expect(row[6]).toBe("-0.30");
  });

  it("uses YYYY-MM-DD dates and plain two-decimal amounts", () => {
    for (const row of parse(buildTransactionsCsv(transactions, accounts, categories)).slice(1)) {
      expect(row[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row[6]).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it("reconciles exactly with integer-centavo totals", () => {
    const rows = parse(buildTransactionsCsv(transactions, accounts, categories)).slice(1);
    // Parse amounts back as integer centavos with string math (no float sums).
    const toCentavos = (s: string) => (s.startsWith("-") ? -1 : 1) * Number(s.replace(/[-.]/g, ""));
    const february = rows.filter((r) => r[0].startsWith("2026-02") && r[1] !== "Transfer");
    const net = february.reduce((sum, r) => sum + toCentavos(r[6]), 0);
    expect(net).toBe(getMonthlyReport(transactions, "2026-02").netCashFlow);
    expect(toCentavos("-0.30") + toCentavos("-125.50")).toBe(-12_580);
  });
});

describe("getSignedAmount", () => {
  it("is positive for income and transfers and negative for expenses", () => {
    expect(transactions.map(getSignedAmount)).toEqual([3_500_000, -12_550, 500_000, -9_999, -30]);
  });
});

describe("selectTransactionsForExport", () => {
  const februaryFilters: TransactionFilters = { ...getDefaultFilters("2026-02-20"), month: "2026-02" };

  it("exports every transaction for the 'all' scope, ignoring filters", () => {
    const rows = selectTransactionsForExport("all", transactions, februaryFilters, "date-asc", categories);
    expect(rows.map((t) => t.id)).toEqual(["txn-001", "txn-002", "txn-003", "txn-004", "txn-005"]);
  });

  it("applies the table's filters for the 'filtered' scope", () => {
    const rows = selectTransactionsForExport(
      "filtered",
      transactions,
      { ...februaryFilters, type: "expense" },
      "date-asc",
      categories,
    );
    expect(rows.map((t) => t.id)).toEqual(["txn-002", "txn-004"]);
  });

  it("matches search, account, and category filters", () => {
    const base = { ...februaryFilters, month: ALL };
    const ids = (filters: TransactionFilters) =>
      selectTransactionsForExport("filtered", transactions, filters, "date-asc", categories).map((t) => t.id);
    expect(ids({ ...base, search: "food" })).toEqual(["txn-002", "txn-005"]); // category name
    expect(ids({ ...base, accountId: "gcash" })).toEqual(["txn-002", "txn-003", "txn-005"]); // transfer destination
    expect(ids({ ...base, categoryId: "hobby" })).toEqual(["txn-004"]);
  });

  it("preserves the current sort order", () => {
    const rows = selectTransactionsForExport("all", transactions, februaryFilters, "amount-desc", categories);
    expect(rows.map((t) => t.id)).toEqual(["txn-001", "txn-003", "txn-002", "txn-004", "txn-005"]);
    const csvDates = parse(buildTransactionsCsv(rows, accounts, categories)).slice(1).map((r) => r[0]);
    expect(csvDates).toEqual(["2026-02-15", "2026-02-17", "2026-02-16", "2026-02-18", "2026-03-01"]);
  });

  it("exports every matching row, not just the current page", () => {
    const many: Transaction[] = Array.from({ length: 25 }, (_, i) => ({
      id: `txn-${String(i + 100)}`,
      type: "expense",
      amount: 100 + i,
      date: "2026-02-10",
      description: `Item ${i}`,
      accountId: "gcash",
      categoryId: "food",
    }));
    const exported = selectTransactionsForExport("filtered", many, februaryFilters, "date-desc", categories);
    expect(paginate(exported, 1, 10).items).toHaveLength(10);
    expect(exported).toHaveLength(25);
    expect(parse(buildTransactionsCsv(exported, accounts, categories))).toHaveLength(26);
  });

  it("returns nothing when no transactions match", () => {
    expect(selectTransactionsForExport("filtered", transactions, { ...februaryFilters, search: "zzz" }, "date-desc", categories)).toEqual([]);
  });
});

describe("transactionsCsvFilename", () => {
  const filters = getDefaultFilters("2026-11-02");

  it("stamps all-transaction exports with today's date", () => {
    expect(transactionsCsvFilename("all", filters, "2026-11-02")).toBe("spendwise-transactions-2026-11-02.csv");
  });

  it("names filtered exports by month, or by date when all months are included", () => {
    expect(transactionsCsvFilename("filtered", filters, "2026-11-02")).toBe("spendwise-transactions-filtered-2026-11.csv");
    expect(transactionsCsvFilename("filtered", { ...filters, month: ALL }, "2026-11-02")).toBe(
      "spendwise-transactions-filtered-2026-11-02.csv",
    );
  });
});

describe("source data", () => {
  it("is never mutated by an export", () => {
    const before = structuredClone({ accounts, categories, transactions });
    const frozen = transactions.map((t) => Object.freeze({ ...t }));
    Object.freeze(frozen);
    const rows = selectTransactionsForExport("all", frozen, getDefaultFilters("2026-02-20"), "amount-asc", categories);
    buildTransactionsCsv(rows, Object.freeze([...accounts]), Object.freeze([...categories]));
    toTransactionCsvRows(frozen, accounts, categories);
    expect({ accounts, categories, transactions }).toEqual(before);
    expect(frozen.map((t) => t.id)).toEqual(transactions.map((t) => t.id)); // original order kept
  });
});
