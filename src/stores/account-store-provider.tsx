"use client";

import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";

import {
  createAccountStore,
  type AccountStore,
  type AccountStoreApi,
} from "@/stores/account-store";
import type { Account } from "@/types/finance";

const AccountStoreContext = createContext<AccountStoreApi | null>(null);

/**
 * One account store per browser session, seeded once from
 * `initialAccounts`. Lives in the (app) layout next to the transaction
 * store, so every page shares it during client-side navigation.
 */
export function AccountStoreProvider({
  initialAccounts,
  children,
}: {
  initialAccounts: readonly Account[];
  children: React.ReactNode;
}) {
  const [store] = useState(() => createAccountStore(initialAccounts));
  return (
    <AccountStoreContext.Provider value={store}>{children}</AccountStoreContext.Provider>
  );
}

/** The store itself, for other stores that need to read accounts. */
export function useAccountStoreApi(): AccountStoreApi {
  const store = useContext(AccountStoreContext);
  if (!store) {
    throw new Error("Account store used outside AccountStoreProvider.");
  }
  return store;
}

/** Reads from the account store; select only what the component needs. */
export function useAccountStore<T>(selector: (state: AccountStore) => T): T {
  return useStore(useAccountStoreApi(), selector);
}
