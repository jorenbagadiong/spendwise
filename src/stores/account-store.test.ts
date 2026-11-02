import { beforeEach, describe, expect, it } from "vitest";

import {
  calculateAccountBalance,
  calculateMonthlySummary,
  calculateTotalAccountBalance,
} from "@/lib/finance/calculations";
import { filterTransactions } from "@/lib/finance/transactions";
import { validateTransaction } from "@/lib/finance/validation";
import { createAccountStore, type AccountStoreApi } from "@/stores/account-store";
import { createTransactionStore } from "@/stores/transaction-store";
import type { Account, AccountInput, Category, Transaction } from "@/types/finance";

const initialAccounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 1_000_000, openingDate: "2026-01-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 50_000, openingDate: "2026-01-01", isActive: true },
];
const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "slate", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "slate", isActive: true },
];
const initialTransactions: Transaction[] = [
  { id: "txn-001", type: "income", amount: 2_000_000, date: "2026-01-15", description: "Salary", accountId: "bank", categoryId: "salary" },
  { id: "txn-002", type: "transfer", amount: 300_000, date: "2026-01-31", description: "ATM", accountId: "bank", destinationAccountId: "wallet" },
  { id: "txn-003", type: "expense", amount: 100_000, date: "2026-02-10", description: "Dinner", accountId: "wallet", categoryId: "food" },
];

const newAccount: AccountInput = { name: "  Maya  ", type: "e_wallet", openingBalance: 0, openingDate: "2026-03-01" };

let store: AccountStoreApi;
beforeEach(() => {
  store = createAccountStore(initialAccounts);
});
const state = () => store.getState();

describe("addAccount", () => {
  it("creates an active account with a new id and trimmed name", () => {
    const result = state().addAccount(newAccount);
    expect(result).toEqual({
      ok: true,
      account: { id: "acct-001", name: "Maya", type: "e_wallet", openingBalance: 0, openingDate: "2026-03-01", isActive: true },
    });
    expect(state().accounts).toHaveLength(3);
  });

  it("generates unique ids", () => {
    state().addAccount(newAccount);
    const second = state().addAccount({ ...newAccount, name: "GCash" });
    expect(second.ok && second.account.id).toBe("acct-002");
  });

  it("rejects duplicate names case-insensitively, including archived accounts", () => {
    expect(state().addAccount({ ...newAccount, name: " bank " })).toEqual({ ok: false, error: "An account named “Bank” already exists." });
    state().archiveAccount("wallet");
    expect(state().addAccount({ ...newAccount, name: "WALLET" })).toEqual({
      ok: false,
      error: "An archived account named “Wallet” already exists. Restore it instead.",
    });
    expect(state().accounts).toHaveLength(2);
  });

  it("rejects empty, too long, negative, fractional, and badly dated input", () => {
    for (const input of [
      { ...newAccount, name: "   " },
      { ...newAccount, name: "x".repeat(61) },
      { ...newAccount, openingBalance: -1 },
      { ...newAccount, openingBalance: 10.5 },
      { ...newAccount, openingDate: "2026-02-30" },
    ]) {
      expect(state().addAccount(input).ok).toBe(false);
    }
    expect(state().accounts).toHaveLength(2);
  });

  it("does not mutate the previous array", () => {
    const before = state().accounts;
    state().addAccount(newAccount);
    expect(before).toHaveLength(2);
    expect(state().accounts).not.toBe(before);
  });
});

describe("updateAccount", () => {
  it("renames and changes type, keeping id, opening balance, and opening date", () => {
    const result = state().updateAccount("wallet", { name: " Cash Wallet ", type: "e_wallet" });
    expect(result).toEqual({
      ok: true,
      account: { id: "wallet", name: "Cash Wallet", type: "e_wallet", openingBalance: 50_000, openingDate: "2026-01-01", isActive: true },
    });
  });

  it("ignores opening balance and date even if a caller passes them", () => {
    const sneaky = { name: "Wallet", type: "cash", openingBalance: 999, openingDate: "2020-01-01" } as const;
    state().updateAccount("wallet", sneaky);
    expect(state().accounts[1]).toMatchObject({ openingBalance: 50_000, openingDate: "2026-01-01" });
  });

  it("rejects opening balance and date changes at compile time", () => {
    // @ts-expect-error Opening balance isn't part of AccountUpdate.
    state().updateAccount("wallet", { name: "Wallet", type: "cash", openingBalance: 0 });
    // @ts-expect-error Opening date isn't part of AccountUpdate.
    state().updateAccount("wallet", { name: "Wallet", type: "cash", openingDate: "2020-01-01" });
    expect(state().accounts[1]).toEqual(initialAccounts[1]);
  });

  it("allows changing only the letter case of its own name", () => {
    expect(state().updateAccount("bank", { name: "BANK", type: "bank" }).ok).toBe(true);
  });

  it("rejects a name used by another account", () => {
    expect(state().updateAccount("wallet", { name: "bank", type: "cash" })).toEqual({ ok: false, error: "An account named “Bank” already exists." });
    expect(state().accounts[1].name).toBe("Wallet");
  });

  it("returns an error for a missing id", () => {
    expect(state().updateAccount("nope", { name: "X", type: "cash" })).toEqual({ ok: false, error: "This account no longer exists." });
  });
});

describe("archive and restore", () => {
  it("archives and restores without changing anything else", () => {
    const archived = state().archiveAccount("wallet");
    expect(archived).toEqual({ ok: true, account: { ...initialAccounts[1], isActive: false } });
    const restored = state().restoreAccount("wallet");
    expect(restored).toEqual({ ok: true, account: initialAccounts[1] });
  });

  it("is safe to repeat and handles missing ids", () => {
    state().archiveAccount("wallet");
    expect(state().archiveAccount("wallet")).toMatchObject({ ok: true, account: { isActive: false } });
    expect(state().restoreAccount("nope")).toEqual({ ok: false, error: "This account no longer exists." });
  });

  it("never deletes accounts", () => {
    state().archiveAccount("bank");
    expect(state().accounts.map((a) => a.id)).toEqual(["bank", "wallet"]);
  });
});

describe("accounts with transactions", () => {
  const transactions = createTransactionStore(initialTransactions, {
    getAccounts: () => state().accounts,
    getCategories: () => categories,
  });
  const txns = () => transactions.getState().transactions;

  it("leaves transactions untouched when accounts change", () => {
    const before = txns();
    state().updateAccount("bank", { name: "BPI", type: "bank" });
    state().archiveAccount("bank");
    state().addAccount(newAccount);
    expect(txns()).toBe(before);
  });

  it("keeps archived accounts in balances and consolidated totals", () => {
    const totalBefore = calculateTotalAccountBalance(state().accounts, txns(), "2026-02-28");
    const walletBefore = calculateAccountBalance(state().accounts[1], txns(), "2026-02-28");
    state().archiveAccount("wallet");
    expect(calculateTotalAccountBalance(state().accounts, txns(), "2026-02-28")).toBe(totalBefore);
    expect(calculateAccountBalance(state().accounts[1], txns(), "2026-02-28")).toBe(walletBefore);
    expect(totalBefore).toBe(1_050_000 + 2_000_000 - 100_000);
  });

  it("opening balances of new accounts add to the total but not to income", () => {
    state().addAccount({ ...newAccount, openingBalance: 500_000 });
    const march = calculateMonthlySummary(state().accounts, txns(), "2026-03", "2026-06-01");
    expect(march.totalIncome).toBe(0);
    expect(march.totalAccountBalance).toBe(1_050_000 + 2_000_000 - 100_000 + 500_000);
    // Before the new account opened, it contributes nothing.
    expect(calculateTotalAccountBalance(state().accounts, txns(), "2026-02-28")).toBe(2_950_000);
  });

  it("transfers to a new account move money without changing the total", () => {
    const result = state().addAccount(newAccount);
    if (!result.ok) throw new Error(result.error);
    const before = calculateTotalAccountBalance(state().accounts, txns(), "2026-03-31");
    const transfer: Transaction = { id: "x", type: "transfer", amount: 200_000, date: "2026-03-05", description: "Top up", accountId: "bank", destinationAccountId: result.account.id };
    const after = [...txns(), transfer];
    expect(calculateTotalAccountBalance(state().accounts, after, "2026-03-31")).toBe(before);
    expect(calculateAccountBalance(result.account, after, "2026-03-31")).toBe(200_000);
  });

  it("shows negative calculated balances accurately", () => {
    const overspent: Transaction[] = [
      ...txns(),
      { id: "y", type: "expense", amount: 400_000, date: "2026-02-15", description: "Phone", accountId: "wallet", categoryId: "food" },
    ];
    // 50,000 + 300,000 − 100,000 − 400,000
    expect(calculateAccountBalance(state().accounts[1], overspent, "2026-02-28")).toBe(-150_000);
  });

  it("rejects transactions dated before a new account opened", () => {
    const result = state().addAccount(newAccount);
    if (!result.ok) throw new Error(result.error);
    const early = { type: "expense", amount: 100, date: "2026-02-28", description: "Too early", accountId: result.account.id, categoryId: "food" } as const;
    expect(validateTransaction(early, state().accounts, categories)).toEqual([{ field: "date", message: "Date is before Maya was opened." }]);
    expect(validateTransaction({ ...early, date: "2026-03-01" }, state().accounts, categories)).toEqual([]);
  });

  it("archived accounts stay available for filtering history", () => {
    state().archiveAccount("wallet");
    const filters = { search: "", type: "all", accountId: "wallet", categoryId: "all", month: "all" } as const;
    expect(filterTransactions(txns(), filters, categories).map((t) => t.id)).toEqual(["txn-002", "txn-003"]);
  });
});
