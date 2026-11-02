import { z } from "zod";

import { formatCentavosForInput, parsePesosToCentavos } from "@/lib/finance/money";
import { isValidIsoDate } from "@/lib/finance/months";
import { validateTransaction } from "@/lib/finance/validation";
import type {
  Account,
  Category,
  IsoDate,
  Transaction,
  TransactionInput,
} from "@/types/finance";

export const DESCRIPTION_MAX_LENGTH = 120;

/**
 * What the form edits. Every field is a string because that's what inputs
 * produce; the schema below turns it into a typed TransactionInput.
 * Fields that don't apply to the selected type are ignored on submit.
 */
export type TransactionFormValues = {
  type: Transaction["type"];
  date: string;
  amount: string;
  description: string;
  /** Income: account credited. Expense: account paid from. Transfer: source. */
  accountId: string;
  /** Transfer only. */
  destinationAccountId: string;
  /** Income and expense only. */
  categoryId: string;
};

export function getEmptyFormValues(today: IsoDate): TransactionFormValues {
  return {
    type: "expense",
    date: today,
    amount: "",
    description: "",
    accountId: "",
    destinationAccountId: "",
    categoryId: "",
  };
}

export function getFormValuesFromTransaction(
  transaction: Transaction,
): TransactionFormValues {
  return {
    type: transaction.type,
    date: transaction.date,
    amount: formatCentavosForInput(transaction.amount),
    description: transaction.description,
    accountId: transaction.accountId,
    destinationAccountId: transaction.destinationAccountId ?? "",
    categoryId: transaction.categoryId ?? "",
  };
}

/** Builds a typed transaction from form values, keeping only the fields its type allows. */
function toTransactionInput(
  values: TransactionFormValues,
  amount: number,
): TransactionInput {
  const common = {
    amount,
    date: values.date,
    description: values.description.trim(),
    accountId: values.accountId,
  };
  return values.type === "transfer"
    ? { ...common, type: "transfer", destinationAccountId: values.destinationAccountId }
    : { ...common, type: values.type, categoryId: values.categoryId };
}

/**
 * Zod schema for the transaction form. It needs the current accounts and
 * categories to check references, so it's created per form. The output is
 * a TransactionInput ready for the store.
 *
 * Pass `original` when editing: an archived account the transaction already
 * uses stays allowed, but nothing can be moved onto a different archived account.
 */
export function createTransactionFormSchema(
  accounts: readonly Account[],
  categories: readonly Category[],
  { original = null }: { original?: Transaction | null } = {},
) {
  const originalAccountIds = new Set(
    [original?.accountId, original?.destinationAccountId].filter(Boolean),
  );

  return z
    .object({
      type: z.enum(["income", "expense", "transfer"]),
      date: z.string(),
      amount: z.string(),
      description: z.string(),
      accountId: z.string(),
      destinationAccountId: z.string(),
      categoryId: z.string(),
    })
    .transform((values, ctx) => {
      const issue = (path: keyof TransactionFormValues, message: string) =>
        ctx.addIssue({ code: "custom", path: [path], message });

      if (!values.description.trim()) {
        issue("description", "Enter a description.");
      } else if (values.description.trim().length > DESCRIPTION_MAX_LENGTH) {
        issue("description", `Use ${DESCRIPTION_MAX_LENGTH} characters or fewer.`);
      }

      const amount = parsePesosToCentavos(values.amount);
      if (!amount.ok) issue("amount", amount.error);

      if (!isValidIsoDate(values.date)) issue("date", "Enter a valid date.");

      // Required-field messages read better than "doesn't exist".
      const requireSelection = (path: keyof TransactionFormValues, message: string) => {
        if (!values[path]) issue(path, message);
        return Boolean(values[path]);
      };
      let complete = requireSelection(
        "accountId",
        values.type === "income" ? "Choose the account that received the money." : "Choose an account.",
      );
      if (values.type === "transfer") {
        complete = requireSelection("destinationAccountId", "Choose the destination account.") && complete;
      } else {
        complete = requireSelection("categoryId", "Choose a category.") && complete;
      }

      if (!amount.ok || !isValidIsoDate(values.date) || !complete) return z.NEVER;

      const input = toTransactionInput(values, amount.value);

      // Shared business rules from SW-003 (existence, category type,
      // opening dates, different transfer accounts).
      for (const { field, message } of validateTransaction(input, accounts, categories)) {
        issue(field, message);
      }
      // Archived accounts can't receive new entries, except the ones this
      // transaction already used before the edit.
      for (const field of ["accountId", "destinationAccountId"] as const) {
        if (field === "destinationAccountId" && values.type !== "transfer") continue;
        const account = accounts.find((a) => a.id === values[field]);
        if (account && !account.isActive && !originalAccountIds.has(account.id)) {
          issue(field, `${account.name} is archived. Choose an active account.`);
        }
      }

      return input;
    });
}
