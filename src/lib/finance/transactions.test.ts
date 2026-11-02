import { describe, expect, it } from "vitest";

import {
  ALL,
  areFiltersEqual,
  filterTransactions,
  formatTransactionAmount,
  getDefaultFilters,
  paginate,
  sortTransactions,
  type TransactionFilters,
} from "@/lib/finance/transactions";
import type { Category, Transaction } from "@/types/finance";

const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "slate", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "slate", isActive: true },
  { id: "bills", name: "Bills", type: "expense", icon: "receipt", color: "slate", isActive: true },
];

// Ids are deliberately out of date order to exercise tie-breaking.
const transactions: Transaction[] = [
  { id: "t1", type: "income", amount: 1_000_000, date: "2026-01-15", description: "January salary", accountId: "bank", categoryId: "salary" },
  { id: "t2", type: "expense", amount: 25_000, date: "2026-01-20", description: "Lunch at Jollibee", accountId: "wallet", categoryId: "food" },
  { id: "t3", type: "transfer", amount: 300_000, date: "2026-01-20", description: "ATM withdrawal", accountId: "bank", destinationAccountId: "wallet" },
  { id: "t4", type: "expense", amount: 189_900, date: "2026-02-01", description: "Internet", accountId: "bank", categoryId: "bills" },
  { id: "t5", type: "expense", amount: 25_000, date: "2026-02-28", description: "FOOD court dinner", accountId: "ewallet", categoryId: "food" },
];

const none: TransactionFilters = { search: "", type: ALL, accountId: ALL, categoryId: ALL, month: ALL };
const ids = (list: Transaction[]) => list.map((t) => t.id);
const filter = (overrides: Partial<TransactionFilters>) =>
  ids(filterTransactions(transactions, { ...none, ...overrides }, categories));

describe("filterTransactions", () => {
  it("returns everything with no active filters", () => {
    expect(filter({})).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("searches descriptions case-insensitively", () => {
    expect(filter({ search: "jOLLIBEE" })).toEqual(["t2"]);
    expect(filter({ search: "  salary " })).toEqual(["t1"]);
  });

  it("searches category names, and descriptions and categories together", () => {
    // "food" matches the Food category (t2, t5) and t5's description.
    expect(filter({ search: "Food" })).toEqual(["t2", "t5"]);
    expect(filter({ search: "bill" })).toEqual(["t4"]);
  });

  it("filters by type", () => {
    expect(filter({ type: "income" })).toEqual(["t1"]);
    expect(filter({ type: "expense" })).toEqual(["t2", "t4", "t5"]);
    expect(filter({ type: "transfer" })).toEqual(["t3"]);
  });

  it("filters by account", () => {
    expect(filter({ accountId: "ewallet" })).toEqual(["t5"]);
  });

  it("matches transfers by source or destination account", () => {
    expect(filter({ accountId: "bank" })).toEqual(["t1", "t3", "t4"]);
    expect(filter({ accountId: "wallet" })).toEqual(["t2", "t3"]);
  });

  it("filters by category and never matches transfers to a category", () => {
    expect(filter({ categoryId: "food" })).toEqual(["t2", "t5"]);
    expect(filter({ categoryId: "food", type: "transfer" })).toEqual([]);
  });

  it("filters by month, including the first and last days", () => {
    expect(filter({ month: "2026-01" })).toEqual(["t1", "t2", "t3"]);
    expect(filter({ month: "2026-02" })).toEqual(["t4", "t5"]);
    expect(filter({ month: "2026-03" })).toEqual([]);
  });

  it("combines filters with AND", () => {
    expect(filter({ month: "2026-01", accountId: "wallet" })).toEqual(["t2", "t3"]);
    expect(filter({ month: "2026-01", accountId: "wallet", type: "expense" })).toEqual(["t2"]);
    expect(filter({ month: "2026-02", categoryId: "food", search: "court" })).toEqual(["t5"]);
    expect(filter({ month: "2026-02", search: "jollibee" })).toEqual([]);
  });

  it("returns an empty list for no matches or no data", () => {
    expect(filter({ search: "nothing like this" })).toEqual([]);
    expect(filterTransactions([], none, categories)).toEqual([]);
  });

  it("handles a category id with no matching category", () => {
    expect(filterTransactions(transactions, { ...none, search: "food" }, [])).toHaveLength(1);
  });
});

describe("sortTransactions", () => {
  it("sorts newest first, breaking same-day ties by id", () => {
    expect(ids(sortTransactions(transactions, "date-desc"))).toEqual(["t5", "t4", "t3", "t2", "t1"]);
  });

  it("sorts oldest first, breaking same-day ties by id", () => {
    expect(ids(sortTransactions(transactions, "date-asc"))).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("sorts by amount in centavos, breaking ties by newest first", () => {
    expect(ids(sortTransactions(transactions, "amount-desc"))).toEqual(["t1", "t3", "t4", "t5", "t2"]);
    expect(ids(sortTransactions(transactions, "amount-asc"))).toEqual(["t5", "t2", "t4", "t3", "t1"]);
  });

  it("is deterministic regardless of input order", () => {
    const reversed = [...transactions].reverse();
    for (const sort of ["date-desc", "date-asc", "amount-desc", "amount-asc"] as const) {
      expect(ids(sortTransactions(reversed, sort))).toEqual(ids(sortTransactions(transactions, sort)));
    }
  });

  it("works on filtered results", () => {
    const food = filterTransactions(transactions, { ...none, categoryId: "food" }, categories);
    expect(ids(sortTransactions(food, "date-asc"))).toEqual(["t2", "t5"]);
  });
});

describe("immutability", () => {
  it("never changes the source array or its objects", () => {
    const frozen = Object.freeze(transactions.map((t) => Object.freeze({ ...t })));
    const snapshot = JSON.stringify(frozen);
    sortTransactions(frozen, "amount-asc");
    filterTransactions(frozen, { ...none, search: "food" }, categories);
    paginate(frozen, 2, 2);
    expect(JSON.stringify(frozen)).toBe(snapshot);
  });

  it("returns a new array", () => {
    expect(sortTransactions(transactions, "date-desc")).not.toBe(transactions);
    expect(filterTransactions(transactions, none, categories)).not.toBe(transactions);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);

  it("returns the requested page with its range", () => {
    expect(paginate(items, 1, 10)).toMatchObject({ page: 1, pageCount: 3, total: 23, start: 1, end: 10 });
    expect(paginate(items, 3, 10)).toMatchObject({ items: [21, 22, 23], start: 21, end: 23 });
  });

  it("clamps out-of-range pages", () => {
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, 99, 10).page).toBe(3);
  });

  it("handles no items", () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, start: 0, end: 0 });
  });
});

describe("filter defaults", () => {
  it("defaults to the current month with everything else unfiltered", () => {
    expect(getDefaultFilters("2026-11-02")).toEqual({ ...none, month: "2026-11" });
  });

  it("treats whitespace-only search as unchanged", () => {
    const defaults = getDefaultFilters("2026-11-02");
    expect(areFiltersEqual(defaults, { ...defaults, search: "   " })).toBe(true);
    expect(areFiltersEqual(defaults, { ...defaults, type: "income" })).toBe(false);
  });
});

describe("formatTransactionAmount", () => {
  it("signs income and expenses and keeps transfers neutral", () => {
    expect(formatTransactionAmount(transactions[0])).toBe("+₱10,000.00");
    expect(formatTransactionAmount(transactions[1])).toBe("-₱250.00");
    expect(formatTransactionAmount(transactions[2])).toBe("₱3,000.00");
  });
});
