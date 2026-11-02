import type { Account, Category, Transaction } from "@/types/finance";

const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Rules the type system can't express. Returns a list of problems; an empty
 * list means the transaction is valid. Forms (SW-005+) will reuse this.
 */
export function validateTransaction(
  transaction: Transaction,
  accounts: readonly Account[],
  categories: readonly Category[],
): string[] {
  const errors: string[] = [];
  const account = accounts.find((a) => a.id === transaction.accountId);

  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) {
    errors.push("Amount must be a positive whole number of centavos.");
  }
  if (!ISO_DATE_PATTERN.test(transaction.date)) {
    errors.push("Date must be formatted YYYY-MM-DD.");
  }
  if (!account) {
    errors.push(`Unknown account: ${transaction.accountId}.`);
  } else if (transaction.date < account.openingDate) {
    errors.push(`Date is before ${account.name} was opened.`);
  }

  if (transaction.type === "transfer") {
    const destination = accounts.find(
      (a) => a.id === transaction.destinationAccountId,
    );
    if (transaction.destinationAccountId === transaction.accountId) {
      errors.push("Transfer source and destination must be different accounts.");
    }
    if (!destination) {
      errors.push(`Unknown destination account: ${transaction.destinationAccountId}.`);
    } else if (transaction.date < destination.openingDate) {
      errors.push(`Date is before ${destination.name} was opened.`);
    }
  } else {
    const category = categories.find((c) => c.id === transaction.categoryId);
    if (!category) {
      errors.push(`Unknown category: ${transaction.categoryId}.`);
    } else if (category.type !== transaction.type) {
      errors.push(
        `${category.name} is an ${category.type} category and can't be used for ${transaction.type}.`,
      );
    }
  }

  return errors;
}
