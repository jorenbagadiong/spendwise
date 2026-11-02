"use client";

import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";

import { useAccountStoreApi } from "@/stores/account-store-provider";
import { useCategoryStoreApi } from "@/stores/category-store-provider";
import {
  createTransactionStore,
  type TransactionStore,
  type TransactionStoreApi,
} from "@/stores/transaction-store";
import type { Transaction } from "@/types/finance";

const TransactionStoreContext = createContext<TransactionStoreApi | null>(null);

/**
 * Creates one store per browser session (and per server request, so data is
 * never shared between visitors). It lives in the (app) layout, which stays
 * mounted while navigating between pages, so every page sees the same data.
 * A full page refresh starts again from `initialTransactions`.
 */
export function TransactionStoreProvider({
  initialTransactions,
  children,
}: {
  initialTransactions: readonly Transaction[];
  children: React.ReactNode;
}) {
  // Must be inside the account and category providers: the store checks
  // transaction references against them.
  const accountStore = useAccountStoreApi();
  const categoryStore = useCategoryStoreApi();
  const [store] = useState(() =>
    createTransactionStore(initialTransactions, {
      getAccounts: () => accountStore.getState().accounts,
      getCategories: () => categoryStore.getState().categories,
    }),
  );
  return (
    <TransactionStoreContext.Provider value={store}>
      {children}
    </TransactionStoreContext.Provider>
  );
}

/**
 * Reads from the transaction store. Select the smallest piece you need
 * (e.g. `(s) => s.transactions`) so components only re-render when it changes.
 */
export function useTransactionStore<T>(selector: (state: TransactionStore) => T): T {
  const store = useContext(TransactionStoreContext);
  if (!store) {
    throw new Error("useTransactionStore must be used inside TransactionStoreProvider.");
  }
  return useStore(store, selector);
}
