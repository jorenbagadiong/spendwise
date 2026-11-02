import { beforeEach, describe, expect, it } from "vitest";

import {
  calculateAccountBalance,
  calculateMonthlySummary,
  calculateTotalAccountBalance,
} from "@/lib/finance/calculations";
import { filterTransactions, sortTransactions } from "@/lib/finance/transactions";
import {
  createTransactionStore,
  generateTransactionId,
  type TransactionStoreApi,
} from "@/stores/transaction-store";
import type { Account, Category, Transaction, TransactionInput } from "@/types/finance";

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 1_000_000, openingDate: "2026-01-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 50_000, openingDate: "2026-01-01", isActive: true },
];
const [bank, wallet] = accounts;
const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "slate", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "slate", isActive: true },
];

const initial: Transaction[] = [
  { id: "txn-001", type: "income", amount: 2_000_000, date: "2026-01-15", description: "Salary", accountId: "bank", categoryId: "salary" },
  { id: "txn-002", type: "expense", amount: 150_000, date: "2026-01-20", description: "Groceries", accountId: "bank", categoryId: "food" },
  { id: "txn-003", type: "transfer", amount: 300_000, date: "2026-01-31", description: "ATM", accountId: "bank", destinationAccountId: "wallet" },
];

// The store validates references against accounts and categories.
const references = { getAccounts: () => accounts, getCategories: () => categories };

// A fresh store per test keeps tests isolated from each other.
let store: TransactionStoreApi;
beforeEach(() => {
  store = createTransactionStore(initial, references);
});

const state = () => store.getState();
/** Adds through the store and fails the test if the store rejects it. */
function add(input: TransactionInput) {
  const result = state().addTransaction(input);
  if (!result.ok) throw new Error(result.error);
  return result.transaction;
}
function update(id: string, input: TransactionInput) {
  const result = state().updateTransaction(id, input);
  if (!result.ok) throw new Error(result.error);
  return result.transaction;
}
const january = () => calculateMonthlySummary(accounts, state().transactions, "2026-01", "2026-06-01");
const balance = (account: Account, asOf = "2026-01-31") =>
  calculateAccountBalance(account, state().transactions, asOf);

describe("initial state", () => {
  it("starts with the given transactions without sharing the array", () => {
    expect(state().transactions).toEqual(initial);
    expect(state().transactions).not.toBe(initial);
  });

  it("gives each store its own data", () => {
    state().deleteTransaction("txn-001");
    expect(createTransactionStore(initial, references).getState().transactions).toHaveLength(3);
  });
});

describe("addTransaction", () => {
  it("creates income and increases the account balance and income total", () => {
    const created = add({ type: "income", amount: 500_000, date: "2026-01-25", description: "Bonus", accountId: "wallet", categoryId: "salary" });
    expect(created).toEqual({ id: "txn-004", type: "income", amount: 500_000, date: "2026-01-25", description: "Bonus", accountId: "wallet", categoryId: "salary" });
    expect(state().transactions.at(-1)).toBe(created);
    expect(january().totalIncome).toBe(2_500_000);
    expect(balance(wallet)).toBe(50_000 + 300_000 + 500_000);
  });

  it("creates an expense and decreases the account balance", () => {
    add({ type: "expense", amount: 25_050, date: "2026-01-21", description: "Lunch", accountId: "wallet", categoryId: "food" });
    expect(january().totalExpenses).toBe(175_050);
    expect(january().netCashFlow).toBe(2_000_000 - 175_050);
    expect(balance(wallet)).toBe(350_000 - 25_050);
  });

  it("creates a transfer that moves money without changing income, expenses, or the total", () => {
    const before = january();
    add({ type: "transfer", amount: 100_000, date: "2026-01-31", description: "Top up", accountId: "wallet", destinationAccountId: "bank" });
    const after = january();
    expect(after.totalIncome).toBe(before.totalIncome);
    expect(after.totalExpenses).toBe(before.totalExpenses);
    expect(after.netCashFlow).toBe(before.netCashFlow);
    expect(after.totalAccountBalance).toBe(before.totalAccountBalance);
    expect(balance(wallet)).toBe(350_000 - 100_000);
    expect(balance(bank)).toBe(2_550_000 + 100_000);
  });

  it("generates sequential, unique ids", () => {
    const a = add({ type: "expense", amount: 1, date: "2026-01-02", description: "a", accountId: "bank", categoryId: "food" });
    const b = add({ type: "expense", amount: 1, date: "2026-01-02", description: "b", accountId: "bank", categoryId: "food" });
    expect([a.id, b.id]).toEqual(["txn-004", "txn-005"]);
    expect(new Set(state().transactions.map((t) => t.id)).size).toBe(5);
  });

  it("never reuses the id of a deleted transaction that was the highest", () => {
    add({ type: "expense", amount: 1, date: "2026-01-02", description: "a", accountId: "bank", categoryId: "food" });
    state().deleteTransaction("txn-002");
    const next = add({ type: "expense", amount: 1, date: "2026-01-02", description: "b", accountId: "bank", categoryId: "food" });
    expect(next.id).toBe("txn-005");
  });

  it("does not mutate the previous array", () => {
    const before = state().transactions;
    add({ type: "expense", amount: 1, date: "2026-01-02", description: "a", accountId: "bank", categoryId: "food" });
    expect(before).toHaveLength(3);
    expect(state().transactions).not.toBe(before);
  });
});

describe("updateTransaction", () => {
  it("edits the amount in place, keeping the id, and recalculates totals", () => {
    const updated = update("txn-002", { type: "expense", amount: 200_000, date: "2026-01-20", description: "Groceries", accountId: "bank", categoryId: "food" });
    expect(updated?.id).toBe("txn-002");
    expect(state().transactions).toHaveLength(3);
    expect(state().transactions[1]).toEqual({ ...initial[1], amount: 200_000 });
    expect(january().totalExpenses).toBe(200_000);
    expect(balance(bank)).toBe(1_000_000 + 2_000_000 - 200_000 - 300_000);
  });

  it("moves an expense's effect to a different account", () => {
    update("txn-002", { type: "expense", amount: 150_000, date: "2026-01-20", description: "Groceries", accountId: "wallet", categoryId: "food" });
    expect(balance(bank)).toBe(1_000_000 + 2_000_000 - 300_000);
    expect(balance(wallet)).toBe(50_000 + 300_000 - 150_000);
    expect(january().totalAccountBalance).toBe(1_050_000 + 2_000_000 - 150_000);
  });

  it("changes a transaction's type and drops fields from the old type", () => {
    const updated = update("txn-002", { type: "transfer", amount: 150_000, date: "2026-01-20", description: "Groceries", accountId: "bank", destinationAccountId: "wallet" });
    expect(updated).toEqual({ id: "txn-002", type: "transfer", amount: 150_000, date: "2026-01-20", description: "Groceries", accountId: "bank", destinationAccountId: "wallet" });
    expect("categoryId" in state().transactions[1]).toBe(false);
    expect(january().totalExpenses).toBe(0);
    expect(balance(wallet)).toBe(50_000 + 300_000 + 150_000);
  });

  it("changes a transfer's accounts", () => {
    update("txn-003", { type: "transfer", amount: 300_000, date: "2026-01-31", description: "ATM", accountId: "wallet", destinationAccountId: "bank" });
    expect(balance(wallet)).toBe(50_000 - 300_000);
    expect(balance(bank)).toBe(1_000_000 + 2_000_000 - 150_000 + 300_000);
  });

  it("moving a transaction to another month updates both months and keeps history accurate", () => {
    update("txn-001", { type: "income", amount: 2_000_000, date: "2026-02-15", description: "Salary", accountId: "bank", categoryId: "salary" });
    expect(january().totalIncome).toBe(0);
    expect(calculateMonthlySummary(accounts, state().transactions, "2026-02", "2026-06-01").totalIncome).toBe(2_000_000);
    expect(calculateTotalAccountBalance(accounts, state().transactions, "2026-01-31")).toBe(1_050_000 - 150_000);
    expect(calculateTotalAccountBalance(accounts, state().transactions, "2026-02-28")).toBe(1_050_000 - 150_000 + 2_000_000);
  });

  it("returns null and changes nothing for a missing id", () => {
    const before = state().transactions;
    expect(state().updateTransaction("txn-999", { type: "expense", amount: 1, date: "2026-01-02", description: "x", accountId: "bank", categoryId: "food" })).toEqual({
      ok: false,
      error: "This transaction no longer exists. It may have been deleted.",
      issues: [],
    });
    expect(state().transactions).toBe(before);
  });
});

describe("deleteTransaction", () => {
  it("removes an expense and reverses its effect", () => {
    expect(state().deleteTransaction("txn-002")).toEqual(initial[1]);
    expect(state().transactions.map((t) => t.id)).toEqual(["txn-001", "txn-003"]);
    expect(january().totalExpenses).toBe(0);
    expect(balance(bank)).toBe(1_000_000 + 2_000_000 - 300_000);
  });

  it("removing a transfer reverses it on both accounts", () => {
    state().deleteTransaction("txn-003");
    expect(balance(bank)).toBe(1_000_000 + 2_000_000 - 150_000);
    expect(balance(wallet)).toBe(50_000);
  });

  it("keeps opening balances separate from income", () => {
    for (const t of initial) state().deleteTransaction(t.id);
    expect(january()).toMatchObject({ totalIncome: 0, totalExpenses: 0, totalAccountBalance: 1_050_000 });
  });

  it("returns null and changes nothing for a missing id", () => {
    const before = state().transactions;
    expect(state().deleteTransaction("txn-999")).toBeNull();
    expect(state().transactions).toBe(before);
  });
});

describe("filtering and sorting store data", () => {
  it("includes new and edited records in filters and sort order", () => {
    add({ type: "expense", amount: 999_000, date: "2026-01-05", description: "New laptop", accountId: "wallet", categoryId: "food" });
    update("txn-001", { type: "income", amount: 2_000_000, date: "2026-01-15", description: "Salary (edited)", accountId: "bank", categoryId: "salary" });

    const filters = { search: "", type: "all", accountId: "all", categoryId: "all", month: "2026-01" } as const;
    const byAmount = sortTransactions(filterTransactions(state().transactions, filters, categories), "amount-desc");
    expect(byAmount.map((t) => t.description)).toEqual(["Salary (edited)", "New laptop", "ATM", "Groceries"]);

    const walletOnly = filterTransactions(state().transactions, { ...filters, accountId: "wallet" }, categories);
    expect(walletOnly.map((t) => t.id)).toEqual(["txn-003", "txn-004"]);
  });
});

describe("generateTransactionId", () => {
  it("starts at txn-001 and ignores ids outside the sequence", () => {
    expect(generateTransactionId([])).toBe("txn-001");
    expect(generateTransactionId([{ ...initial[0], id: "imported-7" }])).toBe("txn-001");
    expect(generateTransactionId([{ ...initial[0], id: "txn-041" }])).toBe("txn-042");
  });
});

describe("validation at the action boundary", () => {
  it("rejects invalid input without changing state", () => {
    const before = state().transactions;
    const result = state().addTransaction({ type: "expense", amount: 0, date: "2026-02-30", description: "x", accountId: "ghost", categoryId: "food" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((i) => i.field).sort()).toEqual(["accountId", "amount", "date"]);
    }
    expect(state().transactions).toBe(before);
  });

  it("rejects same-account transfers and dates before an account opened", () => {
    expect(state().addTransaction({ type: "transfer", amount: 1, date: "2026-01-05", description: "x", accountId: "bank", destinationAccountId: "bank" }).ok).toBe(false);
    expect(state().addTransaction({ type: "expense", amount: 1, date: "2025-12-31", description: "x", accountId: "bank", categoryId: "food" }).ok).toBe(false);
  });

  it("rejects archived accounts for new transactions but keeps an edited transaction's own", () => {
    const archived = [{ ...accounts[0], isActive: false }, accounts[1]];
    const archivedStore = createTransactionStore(initial, { getAccounts: () => archived, getCategories: () => categories });
    expect(archivedStore.getState().addTransaction({ type: "expense", amount: 1, date: "2026-01-05", description: "x", accountId: "bank", categoryId: "food" })).toMatchObject({
      ok: false,
      issues: [{ field: "accountId", message: "Bank is archived. Choose an active account." }],
    });
    expect(archivedStore.getState().updateTransaction("txn-002", { type: "expense", amount: 1, date: "2026-01-20", description: "Groceries", accountId: "bank", categoryId: "food" }).ok).toBe(true);
  });
});
