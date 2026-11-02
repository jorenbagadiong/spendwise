import { z } from "zod";

import { parsePesosToCentavos } from "@/lib/finance/money";
import { isValidIsoDate } from "@/lib/finance/months";
import type {
  Account,
  AccountInput,
  AccountType,
  AccountUpdate,
  IsoDate,
  Transaction,
} from "@/types/finance";

export const ACCOUNT_NAME_MAX_LENGTH = 60;

export const accountTypeLabels: Record<AccountType, string> = {
  bank: "Bank",
  e_wallet: "E-wallet",
  cash: "Cash",
};

/**
 * Returns an error message for an invalid account name, or null if it's
 * fine. Names are compared trimmed and case-insensitively against every
 * account, archived ones included, so "gcash" can't sit next to "GCash".
 */
export function validateAccountName(
  name: string,
  accounts: readonly Account[],
  excludeId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter an account name.";
  if (trimmed.length > ACCOUNT_NAME_MAX_LENGTH) {
    return `Use ${ACCOUNT_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const lower = trimmed.toLowerCase();
  const duplicate = accounts.find(
    (a) => a.id !== excludeId && a.name.trim().toLowerCase() === lower,
  );
  if (duplicate) {
    return duplicate.isActive
      ? `An account named “${duplicate.name}” already exists.`
      : `An archived account named “${duplicate.name}” already exists. Restore it instead.`;
  }
  return null;
}

/** Full check for a new account; used by the store as a safety net. */
export function validateAccountInput(
  input: AccountInput,
  accounts: readonly Account[],
): string | null {
  return (
    validateAccountName(input.name, accounts) ??
    (!Number.isSafeInteger(input.openingBalance) || input.openingBalance < 0
      ? "Opening balance must be zero or a positive whole number of centavos."
      : null) ??
    (isValidIsoDate(input.openingDate) ? null : "Opening date must be a real calendar date.") ??
    (Object.hasOwn(accountTypeLabels, input.type) ? null : "Choose an account type.")
  );
}

export function validateAccountUpdate(
  id: string,
  update: AccountUpdate,
  accounts: readonly Account[],
): string | null {
  return (
    validateAccountName(update.name, accounts, id) ??
    (Object.hasOwn(accountTypeLabels, update.type) ? null : "Choose an account type.")
  );
}

/** What the account form edits (all strings, as inputs produce them). */
export type AccountFormValues = {
  name: string;
  type: AccountType;
  openingBalance: string;
  openingDate: string;
};

export function getEmptyAccountFormValues(today: IsoDate): AccountFormValues {
  return { name: "", type: "bank", openingBalance: "0.00", openingDate: today };
}

/**
 * Zod schema for creating an account. The output is an AccountInput with
 * the opening balance converted to centavos.
 */
export function createAccountFormSchema(accounts: readonly Account[]) {
  return z
    .object({
      name: z.string(),
      type: z.enum(["bank", "e_wallet", "cash"]),
      openingBalance: z.string(),
      openingDate: z.string(),
    })
    .transform((values, ctx): AccountInput => {
      const nameError = validateAccountName(values.name, accounts);
      if (nameError) ctx.addIssue({ code: "custom", path: ["name"], message: nameError });

      const balance = parsePesosToCentavos(values.openingBalance, { allowZero: true });
      if (!balance.ok) {
        ctx.addIssue({ code: "custom", path: ["openingBalance"], message: balance.error });
      }

      if (!isValidIsoDate(values.openingDate)) {
        ctx.addIssue({ code: "custom", path: ["openingDate"], message: "Enter a valid date." });
      }

      return {
        name: values.name.trim(),
        type: values.type,
        openingBalance: balance.ok ? balance.value : 0,
        openingDate: values.openingDate,
      };
    });
}

/**
 * Zod schema for editing an account: only the name and type can change.
 * The opening fields are accepted (the form shows them read-only) but ignored.
 */
export function createAccountUpdateSchema(accounts: readonly Account[], id: string) {
  return z
    .object({
      name: z.string(),
      type: z.enum(["bank", "e_wallet", "cash"]),
      openingBalance: z.string(),
      openingDate: z.string(),
    })
    .transform((values, ctx): AccountUpdate => {
      const nameError = validateAccountName(values.name, accounts, id);
      if (nameError) ctx.addIssue({ code: "custom", path: ["name"], message: nameError });
      return { name: values.name.trim(), type: values.type };
    });
}

/**
 * Accounts a transaction form may offer: every active account, plus any
 * archived account the transaction being edited already uses, so existing
 * records stay readable and editable without moving them.
 */
export function getSelectableAccounts(
  accounts: readonly Account[],
  original?: Transaction | null,
): Account[] {
  const keep = new Set(
    [original?.accountId, original?.destinationAccountId].filter(Boolean),
  );
  return accounts.filter((a) => a.isActive || keep.has(a.id));
}

/** Display name with an "(archived)" suffix for archived accounts. */
export function getAccountLabel(account: Account): string {
  return account.isActive ? account.name : `${account.name} (archived)`;
}

/** Number of transactions that touch an account (as source or destination). */
export function countAccountTransactions(
  accountId: string,
  transactions: readonly Transaction[],
): number {
  return transactions.filter(
    (t) => t.accountId === accountId || t.destinationAccountId === accountId,
  ).length;
}
