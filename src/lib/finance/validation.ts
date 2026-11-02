import type { Account, Category, TransactionInput } from "@/types/finance";
import { isValidIsoDate } from "@/lib/finance/months";

export type ValidationIssue = {
  field: "amount" | "date" | "accountId" | "destinationAccountId" | "categoryId";
  message: string;
};

/**
 * Rules the type system can't express. Returns a list of problems, each
 * tagged with the field it belongs to so forms can show it inline; an empty
 * list means the transaction is valid.
 */
export function validateTransaction(
  transaction: TransactionInput,
  accounts: readonly Account[],
  categories: readonly Category[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const account = accounts.find((a) => a.id === transaction.accountId);

  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) {
    issues.push({ field: "amount", message: "Amount must be a positive whole number of centavos." });
  }
  if (!isValidIsoDate(transaction.date)) {
    issues.push({ field: "date", message: "Date must be a real calendar date (YYYY-MM-DD)." });
  }
  if (!account) {
    issues.push({ field: "accountId", message: "Choose an existing account." });
  } else if (transaction.date < account.openingDate) {
    issues.push({ field: "date", message: `Date is before ${account.name} was opened.` });
  }

  if (transaction.type === "transfer") {
    const destination = accounts.find(
      (a) => a.id === transaction.destinationAccountId,
    );
    if (transaction.destinationAccountId === transaction.accountId) {
      issues.push({
        field: "destinationAccountId",
        message: "Transfer source and destination must be different accounts.",
      });
    }
    if (!destination) {
      issues.push({ field: "destinationAccountId", message: "Choose an existing account." });
    } else if (transaction.date < destination.openingDate) {
      issues.push({ field: "date", message: `Date is before ${destination.name} was opened.` });
    }
  } else {
    const category = categories.find((c) => c.id === transaction.categoryId);
    if (!category) {
      issues.push({ field: "categoryId", message: "Choose an existing category." });
    } else if (category.type !== transaction.type) {
      issues.push({
        field: "categoryId",
        message: `${category.name} is an ${category.type} category and can't be used for ${transaction.type}.`,
      });
    }
  }

  return issues;
}
