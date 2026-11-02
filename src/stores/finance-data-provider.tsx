"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "zustand";

import {
  createPersistenceController,
  type PersistenceController,
  type PersistenceState,
} from "@/lib/persistence/controller";
import { STORAGE_KEY } from "@/lib/persistence/snapshot";
import { getBrowserStorage } from "@/lib/persistence/storage";
import { createProfileController, type ProfileController, type ProfileState } from "@/lib/profile/controller";
import { PROFILE_STORAGE_KEY } from "@/lib/profile/profile";
import { demoData } from "@/lib/workspace/workspace";
import { AccountStoreProvider, useAccountStoreApi } from "@/stores/account-store-provider";
import { CategoryStoreProvider, useCategoryStoreApi } from "@/stores/category-store-provider";
import {
  TransactionStoreProvider,
  useTransactionStoreApi,
} from "@/stores/transaction-store-provider";

const PersistenceContext = createContext<PersistenceController | null>(null);
const ProfileContext = createContext<ProfileController | null>(null);

/**
 * Creates the account, category, and transaction stores (empty until
 * storage is read), the persistence controller that loads and saves them,
 * and the local profile controller. Rendered once in the (app) layout.
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

  const [{ controller, profileController }] = useState(() => {
    // On the server there's no window, so this reports "unavailable"; that's
    // fine because loading only happens in the effect below, in the browser.
    const storage = getBrowserStorage();
    return {
      controller: createPersistenceController({
        stores: { accounts, categories, transactions },
        storage: storage.ok ? storage.storage : null,
        unavailableMessage: storage.ok
          ? undefined
          : `${storage.message} Changes only last until this tab is closed.`,
        seed: demoData(),
      }),
      profileController: createProfileController({ storage: storage.ok ? storage.storage : null }),
    };
  });

  useEffect(() => {
    // Both renders (server and first client render) show the loading state;
    // storage is read only after hydration, so there's no mismatch.
    const disconnect = controller.connect();
    controller.initialize();
    profileController.initialize();

    // Fired when another tab or window changes localStorage (key null = cleared).
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        controller.handleExternalChange(event.key === null ? null : event.newValue);
      }
      if (event.key === PROFILE_STORAGE_KEY || event.key === null) {
        profileController.handleExternalChange(event.key === null ? null : event.newValue);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => {
      disconnect();
      window.removeEventListener("storage", handleStorage);
    };
  }, [controller, profileController]);

  return (
    <PersistenceContext.Provider value={controller}>
      <ProfileContext.Provider value={profileController}>{children}</ProfileContext.Provider>
    </PersistenceContext.Provider>
  );
}

export function usePersistence(): PersistenceController {
  const controller = useContext(PersistenceContext);
  if (!controller) throw new Error("usePersistence must be used inside FinanceDataProvider.");
  return controller;
}

export function usePersistenceState<T>(selector: (state: PersistenceState) => T): T {
  return useStore(usePersistence().state, selector);
}

export function useProfileController(): ProfileController {
  const controller = useContext(ProfileContext);
  if (!controller) throw new Error("useProfileController must be used inside FinanceDataProvider.");
  return controller;
}

export function useProfileState<T>(selector: (state: ProfileState) => T): T {
  return useStore(useProfileController().state, selector);
}
