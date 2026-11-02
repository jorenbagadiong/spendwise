import { createStore } from "zustand/vanilla";

import { validateAccountInput, validateAccountUpdate } from "@/lib/finance/accounts";
import { nextSequentialId } from "@/lib/ids";
import type { Account, AccountInput, AccountUpdate } from "@/types/finance";

export type AccountResult =
  | { ok: true; account: Account }
  | { ok: false; error: string };

export type AccountStore = {
  /**
   * The single in-memory source of truth for accounts. Balances are never
   * stored here; they're calculated from transactions with lib/finance.
   */
  accounts: readonly Account[];
  /** Creates an active account with a new id. Rejects invalid or duplicate names. */
  addAccount: (input: AccountInput) => AccountResult;
  /** Changes name and type only; opening balance and date can't change. */
  updateAccount: (id: string, update: AccountUpdate) => AccountResult;
  /** Hides an account from new transactions. Its history and balance stay. */
  archiveAccount: (id: string) => AccountResult;
  /** Makes an archived account selectable again. */
  restoreAccount: (id: string) => AccountResult;
};

/** Next account id: "acct-001", "acct-002", … (never reuses a taken id). */
export function generateAccountId(existing: readonly Account[]): string {
  return nextSequentialId("acct", existing.map((a) => a.id));
}

const notFound = { ok: false, error: "This account no longer exists." } as const;

/**
 * Creates an account store. The app creates one per browser session in
 * AccountStoreProvider; tests create a fresh one per test. Accounts are
 * never deleted, only archived, so transactions always resolve their
 * account. This store never touches transactions.
 */
export function createAccountStore(initialAccounts: readonly Account[]) {
  return createStore<AccountStore>()((set, get) => {
    function replace(id: string, change: (account: Account) => Account): AccountResult {
      const existing = get().accounts.find((a) => a.id === id);
      if (!existing) return notFound;
      const account = change(existing);
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? account : a)),
      }));
      return { ok: true, account };
    }

    return {
      accounts: [...initialAccounts],

      addAccount: (input) => {
        const accounts = get().accounts;
        const error = validateAccountInput(input, accounts);
        if (error) return { ok: false, error };

        const account: Account = {
          id: generateAccountId(accounts),
          name: input.name.trim(),
          type: input.type,
          openingBalance: input.openingBalance,
          openingDate: input.openingDate,
          isActive: true,
        };
        set((state) => ({ accounts: [...state.accounts, account] }));
        return { ok: true, account };
      },

      updateAccount: (id, update) => {
        if (!get().accounts.some((a) => a.id === id)) return notFound;
        const error = validateAccountUpdate(id, update, get().accounts);
        if (error) return { ok: false, error };
        // Only copy the editable fields, even if a caller passes more.
        return replace(id, (a) => ({ ...a, name: update.name.trim(), type: update.type }));
      },

      archiveAccount: (id) => replace(id, (a) => (a.isActive ? { ...a, isActive: false } : a)),

      restoreAccount: (id) => replace(id, (a) => (a.isActive ? a : { ...a, isActive: true })),
    };
  });
}

export type AccountStoreApi = ReturnType<typeof createAccountStore>;
