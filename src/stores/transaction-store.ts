import { createStore } from "zustand/vanilla";

import { validateTransactionChange, type ValidationIssue } from "@/lib/finance/validation";
import { nextSequentialId } from "@/lib/ids";
import type { Account, Category, Transaction, TransactionInput } from "@/types/finance";

export type TransactionResult =
  | { ok: true; transaction: Transaction }
  /** `issues` are tagged by form field; `error` summarizes them (or explains a missing record). */
  | { ok: false; error: string; issues: ValidationIssue[] };

export type TransactionStore = {
  /** The single in-memory source of truth for transactions. */
  transactions: readonly Transaction[];
  /** Validates and adds a transaction with a new unique id. */
  addTransaction: (input: TransactionInput) => TransactionResult;
  /** Validates and replaces a transaction, keeping its id. */
  updateTransaction: (id: string, input: TransactionInput) => TransactionResult;
  /** Removes a transaction. Returns the removed record, or null if the id doesn't exist. */
  deleteTransaction: (id: string) => Transaction | null;
};

/**
 * Read access to the account and category stores. Transactions reference
 * both, so the store checks those references itself (existence, matching
 * category type, active status) instead of trusting the UI.
 */
export type TransactionReferences = {
  getAccounts: () => readonly Account[];
  getCategories: () => readonly Category[];
};

/** Next transaction id: "txn-001", "txn-002", … (never reuses a taken id). */
export function generateTransactionId(existing: readonly Transaction[]): string {
  return nextSequentialId("txn", existing.map((t) => t.id));
}

function invalid(issues: ValidationIssue[]): TransactionResult {
  return { ok: false, error: issues.map((i) => i.message).join(" "), issues };
}

/**
 * Creates a store instance. The app creates one per browser session in
 * TransactionStoreProvider; tests create a fresh one per test.
 *
 * Every action replaces the array (and the changed object) instead of
 * mutating it, so React and Zustand can detect changes by reference.
 * Totals are never stored here; they're derived with lib/finance.
 */
export function createTransactionStore(
  initialTransactions: readonly Transaction[],
  references: TransactionReferences,
) {
  const check = (input: TransactionInput, original?: Transaction) =>
    validateTransactionChange(input, references.getAccounts(), references.getCategories(), original);

  return createStore<TransactionStore>()((set, get) => ({
    transactions: [...initialTransactions],

    addTransaction: (input) => {
      const issues = check(input);
      if (issues.length > 0) return invalid(issues);
      const transaction: Transaction = {
        ...input,
        id: generateTransactionId(get().transactions),
      };
      set((state) => ({ transactions: [...state.transactions, transaction] }));
      return { ok: true, transaction };
    },

    updateTransaction: (id, input) => {
      const original = get().transactions.find((t) => t.id === id);
      if (!original) {
        return {
          ok: false,
          error: "This transaction no longer exists. It may have been deleted.",
          issues: [],
        };
      }
      const issues = check(input, original);
      if (issues.length > 0) return invalid(issues);
      // Replace the whole object so fields from a previous type (e.g. a
      // category on a transaction changed to a transfer) don't linger.
      const updated: Transaction = { ...input, id };
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
      }));
      return { ok: true, transaction: updated };
    },

    deleteTransaction: (id) => {
      const existing = get().transactions.find((t) => t.id === id);
      if (!existing) return null;
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));
      return existing;
    },
  }));
}

export type TransactionStoreApi = ReturnType<typeof createTransactionStore>;
