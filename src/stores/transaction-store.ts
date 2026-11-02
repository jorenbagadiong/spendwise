import { createStore } from "zustand/vanilla";

import { nextSequentialId } from "@/lib/ids";
import type { Transaction, TransactionInput } from "@/types/finance";

export type TransactionStore = {
  /** The single in-memory source of truth for transactions. */
  transactions: readonly Transaction[];
  /** Adds a transaction with a new unique id and returns it. */
  addTransaction: (input: TransactionInput) => Transaction;
  /** Replaces a transaction, keeping its id. Returns null if the id doesn't exist. */
  updateTransaction: (id: string, input: TransactionInput) => Transaction | null;
  /** Removes a transaction. Returns the removed record, or null if the id doesn't exist. */
  deleteTransaction: (id: string) => Transaction | null;
};

/** Next transaction id: "txn-001", "txn-002", … (never reuses a taken id). */
export function generateTransactionId(existing: readonly Transaction[]): string {
  return nextSequentialId("txn", existing.map((t) => t.id));
}

/**
 * Creates a store instance. The app creates one per browser session in
 * TransactionStoreProvider; tests create a fresh one per test.
 *
 * Every action replaces the array (and the changed object) instead of
 * mutating it, so React and Zustand can detect changes by reference.
 * Totals are never stored here; they're derived with lib/finance.
 */
export function createTransactionStore(initialTransactions: readonly Transaction[]) {
  return createStore<TransactionStore>()((set, get) => ({
    transactions: [...initialTransactions],

    addTransaction: (input) => {
      const transaction: Transaction = {
        ...input,
        id: generateTransactionId(get().transactions),
      };
      set((state) => ({ transactions: [...state.transactions, transaction] }));
      return transaction;
    },

    updateTransaction: (id, input) => {
      if (!get().transactions.some((t) => t.id === id)) return null;
      // Replace the whole object so fields from a previous type (e.g. a
      // category on a transaction changed to a transfer) don't linger.
      const updated: Transaction = { ...input, id };
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
      }));
      return updated;
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
