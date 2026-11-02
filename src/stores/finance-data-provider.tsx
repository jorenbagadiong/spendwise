"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "zustand";

import { mockAccounts, mockCategories, mockTransactions } from "@/data/mock-finance";
import {
  createPersistenceController,
  type PersistenceController,
  type PersistenceState,
} from "@/lib/persistence/controller";
import { STORAGE_KEY } from "@/lib/persistence/snapshot";
import { getBrowserStorage } from "@/lib/persistence/storage";
import { AccountStoreProvider, useAccountStoreApi } from "@/stores/account-store-provider";
import { CategoryStoreProvider, useCategoryStoreApi } from "@/stores/category-store-provider";
import {
  TransactionStoreProvider,
  useTransactionStoreApi,
} from "@/stores/transaction-store-provider";

const demoData = {
  accounts: mockAccounts,
  categories: mockCategories,
  transactions: mockTransactions,
};

const PersistenceContext = createContext<PersistenceController | null>(null);

/**
 * Creates the account, category, and transaction stores (empty until
 * storage is read) plus the one persistence controller that loads and saves
 * them. Rendered once in the (app) layout.
 */
export function FinanceDataProvider({ children }: { children: React.ReactNode }) {
  return (
    <AccountStoreProvider initialAccounts={[]}>
      <CategoryStoreProvider initialCategories={[]}>
        <TransactionStoreProvider initialTransactions={[]}>
          <PersistenceProvider>{children}</PersistenceProvider>
        </TransactionStoreProvider>
      </CategoryStoreProvider>
    </AccountStoreProvider>
  );
}

function PersistenceProvider({ children }: { children: React.ReactNode }) {
  const accounts = useAccountStoreApi();
  const categories = useCategoryStoreApi();
  const transactions = useTransactionStoreApi();

  const [controller] = useState(() => {
    // On the server there's no window, so this reports "unavailable"; that's
    // fine because loading only happens in the effect below, in the browser.
    const storage = getBrowserStorage();
    return createPersistenceController({
      stores: { accounts, categories, transactions },
      storage: storage.ok ? storage.storage : null,
      unavailableMessage: storage.ok
        ? undefined
        : `${storage.message} Changes only last until this tab is closed.`,
      seed: demoData,
    });
  });

  useEffect(() => {
    // Both renders (server and first client render) show the loading state;
    // storage is read only after hydration, so there's no mismatch.
    const disconnect = controller.connect();
    controller.initialize();

    // Fired when another tab or window changes localStorage.
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        controller.handleExternalChange(event.key === null ? null : event.newValue);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => {
      disconnect();
      window.removeEventListener("storage", handleStorage);
    };
  }, [controller]);

  return <PersistenceContext.Provider value={controller}>{children}</PersistenceContext.Provider>;
}

export function usePersistence(): PersistenceController {
  const controller = useContext(PersistenceContext);
  if (!controller) throw new Error("usePersistence must be used inside FinanceDataProvider.");
  return controller;
}

export function usePersistenceState<T>(selector: (state: PersistenceState) => T): T {
  return useStore(usePersistence().state, selector);
}
