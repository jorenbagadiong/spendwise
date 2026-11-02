import type {
  Account,
  Centavos,
  IsoDate,
  MonthKey,
  MonthlySummary,
  Transaction,
} from "@/types/finance";
import { getMonthKey, getReportingCutoff } from "@/lib/finance/months";

// Every function here is pure: same input, same output, no side effects.
// Components call these instead of doing their own arithmetic.

/** Transactions dated within `month` ("YYYY-MM"). */
export function filterTransactionsByMonth(
  transactions: readonly Transaction[],
  month: MonthKey,
): Transaction[] {
  return transactions.filter((t) => getMonthKey(t.date) === month);
}

/** Sum of income transactions. Transfers and opening balances are not income. */
export function calculateTotalIncome(
  transactions: readonly Transaction[],
): Centavos {
  return transactions.reduce(
    (total, t) => (t.type === "income" ? total + t.amount : total),
    0,
  );
}

/** Sum of expense transactions. Transfers are not expenses. */
export function calculateTotalExpenses(
  transactions: readonly Transaction[],
): Centavos {
  return transactions.reduce(
    (total, t) => (t.type === "expense" ? total + t.amount : total),
    0,
  );
}

/** Income minus expenses. Negative when spending exceeds income. */
export function calculateNetCashFlow(
  transactions: readonly Transaction[],
): Centavos {
  return calculateTotalIncome(transactions) - calculateTotalExpenses(transactions);
}

/**
 * An account's balance at the end of `asOf` (inclusive): its opening balance
 * plus the effect of every transaction on or before that date.
 *
 * Always pass the full transaction history. Pre-filtering to a single month
 * would drop earlier activity and produce a wrong balance.
 */
export function calculateAccountBalance(
  account: Account,
  transactions: readonly Transaction[],
  asOf: IsoDate,
): Centavos {
  if (account.openingDate > asOf) return 0;

  return transactions.reduce((balance, t) => {
    if (t.date > asOf) return balance;

    switch (t.type) {
      case "income":
        return t.accountId === account.id ? balance + t.amount : balance;
      case "expense":
        return t.accountId === account.id ? balance - t.amount : balance;
      case "transfer":
        if (t.accountId === account.id) return balance - t.amount;
        if (t.destinationAccountId === account.id) return balance + t.amount;
        return balance;
    }
  }, account.openingBalance);
}

/**
 * Sum of all account balances at the end of `asOf`. Transfers move money
 * between accounts, so they cancel out here. Inactive accounts are included
 * so money held in them is never silently dropped from the total.
 */
export function calculateTotalAccountBalance(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  asOf: IsoDate,
): Centavos {
  return accounts.reduce(
    (total, account) =>
      total + calculateAccountBalance(account, transactions, asOf),
    0,
  );
}

/**
 * Income, expenses, and net cash flow use only `month`'s transactions.
 * The account balance uses the full history up to the reporting cutoff
 * (month end, or `today` if the month is still in progress).
 */
export function calculateMonthlySummary(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  month: MonthKey,
  today: IsoDate,
): MonthlySummary {
  const monthTransactions = filterTransactionsByMonth(transactions, month);
  const balanceAsOf = getReportingCutoff(month, today);

  return {
    month,
    transactionCount: monthTransactions.length,
    totalIncome: calculateTotalIncome(monthTransactions),
    totalExpenses: calculateTotalExpenses(monthTransactions),
    netCashFlow: calculateNetCashFlow(monthTransactions),
    totalAccountBalance: calculateTotalAccountBalance(
      accounts,
      transactions,
      balanceAsOf,
    ),
    balanceAsOf,
  };
}
