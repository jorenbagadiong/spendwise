import { beforeEach, describe, expect, it } from "vitest";

import { calculateMonthlySummary } from "@/lib/finance/calculations";
import { countCategoryUsage } from "@/lib/finance/categories";
import { filterTransactions } from "@/lib/finance/transactions";
import { createCategoryStore, type CategoryStoreApi } from "@/stores/category-store";
import { createTransactionStore, type TransactionStoreApi } from "@/stores/transaction-store";
import type { Account, Category, CategoryInput, Transaction } from "@/types/finance";

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 1_000_000, openingDate: "2026-01-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 50_000, openingDate: "2026-01-01", isActive: true },
];
const initialCategories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "orange", isActive: true },
  { id: "fun", name: "Fun", type: "expense", icon: "clapperboard", color: "violet", isActive: true },
];
const initialTransactions: Transaction[] = [
  { id: "txn-001", type: "income", amount: 2_000_000, date: "2026-01-15", description: "Salary", accountId: "bank", categoryId: "salary" },
  { id: "txn-002", type: "expense", amount: 150_000, date: "2026-01-20", description: "Groceries", accountId: "bank", categoryId: "food" },
  { id: "txn-003", type: "expense", amount: 80_000, date: "2026-01-22", description: "Movie night", accountId: "wallet", categoryId: "fun" },
  { id: "txn-004", type: "transfer", amount: 300_000, date: "2026-01-31", description: "ATM", accountId: "bank", destinationAccountId: "wallet" },
];
const pets: CategoryInput = { name: "  Pets ", type: "expense", icon: "paw-print", color: "amber" };

let categoryStore: CategoryStoreApi;
let transactionStore: TransactionStoreApi;
beforeEach(() => {
  categoryStore = createCategoryStore(initialCategories);
  transactionStore = createTransactionStore(initialTransactions, {
    getAccounts: () => accounts,
    getCategories: () => categoryStore.getState().categories,
  });
});
const cats = () => categoryStore.getState();
const txns = () => transactionStore.getState();

describe("addCategory", () => {
  it("creates an active category with a new id and trimmed name", () => {
    expect(cats().addCategory(pets)).toEqual({
      ok: true,
      category: { id: "cat-001", name: "Pets", type: "expense", icon: "paw-print", color: "amber", isActive: true },
    });
    expect(cats().categories).toHaveLength(4);
  });

  it("generates unique ids", () => {
    cats().addCategory(pets);
    const second = cats().addCategory({ ...pets, name: "Gym" });
    expect(second.ok && second.category.id).toBe("cat-002");
  });

  it("rejects duplicates within a type, case-insensitively", () => {
    expect(cats().addCategory({ ...pets, name: "FOOD" })).toEqual({ ok: false, error: "An expense category named “Food” already exists." });
    expect(cats().addCategory({ ...pets, name: "Food", type: "income" }).ok).toBe(true);
  });

  it("rejects invalid names, icons, and colors", () => {
    for (const input of [
      { ...pets, name: "  " },
      { ...pets, name: "x".repeat(51) },
      { ...pets, icon: "rocket" as never },
      { ...pets, color: "gold" as never },
    ]) {
      expect(cats().addCategory(input).ok).toBe(false);
    }
    expect(cats().categories).toHaveLength(3);
  });
});

describe("updateCategory", () => {
  it("changes name, icon, and color, keeping id, type, and status", () => {
    expect(cats().updateCategory("food", { name: " Meals ", icon: "coffee", color: "rose" })).toEqual({
      ok: true,
      category: { id: "food", name: "Meals", type: "expense", icon: "coffee", color: "rose", isActive: true },
    });
  });

  it("can't change the type, at compile time or at runtime", () => {
    // @ts-expect-error The type isn't part of CategoryUpdate.
    cats().updateCategory("food", { name: "Food", icon: "utensils", color: "orange", type: "income" });
    expect(cats().categories[1].type).toBe("expense");
  });

  it("rejects a duplicate name in the same type", () => {
    expect(cats().updateCategory("fun", { name: "food", icon: "utensils", color: "orange" }).ok).toBe(false);
    expect(cats().categories[2].name).toBe("Fun");
  });

  it("edits archived categories too", () => {
    cats().archiveCategory("fun");
    expect(cats().updateCategory("fun", { name: "Leisure", icon: "clapperboard", color: "violet" })).toMatchObject({
      ok: true,
      category: { name: "Leisure", isActive: false },
    });
  });

  it("handles missing ids", () => {
    expect(cats().updateCategory("nope", { name: "X", icon: "coffee", color: "rose" })).toEqual({ ok: false, error: "This category no longer exists." });
    expect(cats().archiveCategory("nope").ok).toBe(false);
    expect(cats().restoreCategory("nope").ok).toBe(false);
  });

  it("does not mutate the previous array", () => {
    const before = cats().categories;
    cats().updateCategory("food", { name: "Meals", icon: "coffee", color: "rose" });
    expect(before[1].name).toBe("Food");
  });
});

describe("archive and restore", () => {
  it("toggles isActive only, and never deletes", () => {
    expect(cats().archiveCategory("fun")).toEqual({ ok: true, category: { ...initialCategories[2], isActive: false } });
    expect(cats().categories).toHaveLength(3);
    expect(cats().restoreCategory("fun")).toEqual({ ok: true, category: initialCategories[2] });
  });

  it("keeps historical transactions and totals unchanged", () => {
    const before = calculateMonthlySummary(accounts, txns().transactions, "2026-01", "2026-06-01");
    const transactionsBefore = txns().transactions;
    cats().archiveCategory("fun");
    expect(txns().transactions).toBe(transactionsBefore);
    expect(txns().transactions[2].categoryId).toBe("fun");
    expect(calculateMonthlySummary(accounts, txns().transactions, "2026-01", "2026-06-01")).toEqual(before);
  });
});

describe("transaction store checks categories itself", () => {
  const expense = { type: "expense", amount: 10_000, date: "2026-02-01", description: "Snacks", accountId: "wallet" } as const;

  it("accepts an active category of the right type, including a new one", () => {
    const created = cats().addCategory(pets);
    if (!created.ok) throw new Error(created.error);
    expect(txns().addTransaction({ ...expense, categoryId: created.category.id }).ok).toBe(true);
  });

  it("rejects a nonexistent category", () => {
    expect(txns().addTransaction({ ...expense, categoryId: "ghost" })).toMatchObject({
      ok: false,
      issues: [{ field: "categoryId", message: "Choose an existing category." }],
    });
  });

  it("rejects a category of the other type", () => {
    expect(txns().addTransaction({ ...expense, categoryId: "salary" })).toMatchObject({
      ok: false,
      issues: [{ field: "categoryId", message: "Salary is an income category and can't be used for expense." }],
    });
    expect(txns().addTransaction({ type: "income", amount: 1, date: "2026-02-01", description: "x", accountId: "bank", categoryId: "food" }).ok).toBe(false);
  });

  it("rejects an archived category for new transactions", () => {
    cats().archiveCategory("fun");
    expect(txns().addTransaction({ ...expense, categoryId: "fun" })).toMatchObject({
      ok: false,
      issues: [{ field: "categoryId", message: "Fun is archived. Choose an active category." }],
    });
    expect(txns().transactions).toHaveLength(4);
  });

  it("lets an existing transaction keep its archived category when edited", () => {
    cats().archiveCategory("fun");
    const result = txns().updateTransaction("txn-003", { type: "expense", amount: 90_000, date: "2026-01-22", description: "Movie night", accountId: "wallet", categoryId: "fun" });
    expect(result).toMatchObject({ ok: true, transaction: { id: "txn-003", amount: 90_000, categoryId: "fun" } });
  });

  it("doesn't allow moving a transaction onto a different archived category", () => {
    cats().archiveCategory("fun");
    const result = txns().updateTransaction("txn-002", { type: "expense", amount: 150_000, date: "2026-01-20", description: "Groceries", accountId: "bank", categoryId: "fun" });
    expect(result).toMatchObject({ ok: false, issues: [{ field: "categoryId" }] });
    expect(txns().transactions[1].categoryId).toBe("food");
  });

  it("restoring makes the category usable again", () => {
    cats().archiveCategory("fun");
    cats().restoreCategory("fun");
    expect(txns().addTransaction({ ...expense, categoryId: "fun" }).ok).toBe(true);
  });

  it("transfers never need or keep a category", () => {
    const result = txns().addTransaction({ type: "transfer", amount: 1_000, date: "2026-02-01", description: "Move", accountId: "bank", destinationAccountId: "wallet" });
    expect(result.ok && "categoryId" in result.transaction).toBe(false);
    // Changing an expense into a transfer drops its category.
    const changed = txns().updateTransaction("txn-002", { type: "transfer", amount: 150_000, date: "2026-01-20", description: "Groceries", accountId: "bank", destinationAccountId: "wallet" });
    expect(changed.ok && "categoryId" in changed.transaction).toBe(false);
  });
});

describe("usage counts and labels follow the stores", () => {
  const count = (id: string) => countCategoryUsage(id, txns().transactions);

  it("recalculates after adding, editing, and deleting transactions", () => {
    expect([count("food"), count("fun"), count("salary")]).toEqual([1, 1, 1]);
    txns().addTransaction({ type: "expense", amount: 5_000, date: "2026-02-02", description: "Lunch", accountId: "wallet", categoryId: "food" });
    expect(count("food")).toBe(2);
    txns().updateTransaction("txn-003", { type: "expense", amount: 80_000, date: "2026-01-22", description: "Movie night", accountId: "wallet", categoryId: "food" });
    expect([count("food"), count("fun")]).toEqual([3, 0]);
    txns().deleteTransaction("txn-002");
    expect(count("food")).toBe(2);
    // Transfers never count toward a category.
    txns().updateTransaction("txn-003", { type: "transfer", amount: 80_000, date: "2026-01-22", description: "Movie night", accountId: "wallet", destinationAccountId: "bank" });
    expect(count("food")).toBe(1);
  });

  it("renamed categories are found by search under their new name", () => {
    cats().updateCategory("fun", { name: "Leisure", icon: "clapperboard", color: "violet" });
    const filters = { search: "leisure", type: "all", accountId: "all", categoryId: "all", month: "all" } as const;
    expect(filterTransactions(txns().transactions, filters, cats().categories).map((t) => t.id)).toEqual(["txn-003"]);
    expect(filterTransactions(txns().transactions, { ...filters, search: "fun" }, cats().categories)).toEqual([]);
  });

  it("archived categories can still filter history", () => {
    cats().archiveCategory("fun");
    const filters = { search: "", type: "all", accountId: "all", categoryId: "fun", month: "all" } as const;
    expect(filterTransactions(txns().transactions, filters, cats().categories).map((t) => t.id)).toEqual(["txn-003"]);
  });
});
