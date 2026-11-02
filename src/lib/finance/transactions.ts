import type {
  Category,
  IsoDate,
  MonthKey,
  Transaction,
} from "@/types/finance";
import { formatCurrency } from "@/lib/finance/money";
import { getMonthKey } from "@/lib/finance/months";

export const ALL = "all";

/** Display names for transaction types (table, filters, CSV export). */
export const transactionTypeLabels: Record<Transaction["type"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

export type TransactionFilters = {
  /** Matches description or category name, case-insensitive. */
  search: string;
  type: typeof ALL | Transaction["type"];
  /** Matches the source account, or the destination account of a transfer. */
  accountId: typeof ALL | string;
  /** Transfers have no category, so they never match a specific category. */
  categoryId: typeof ALL | string;
  month: typeof ALL | MonthKey;
};

export type TransactionSort =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc";

export const DEFAULT_SORT: TransactionSort = "date-desc";

/** Defaults: everything in the current month. */
export function getDefaultFilters(today: IsoDate): TransactionFilters {
  return {
    search: "",
    type: ALL,
    accountId: ALL,
    categoryId: ALL,
    month: getMonthKey(today),
  };
}

export function areFiltersEqual(a: TransactionFilters, b: TransactionFilters) {
  return (
    a.search.trim() === b.search.trim() &&
    a.type === b.type &&
    a.accountId === b.accountId &&
    a.categoryId === b.categoryId &&
    a.month === b.month
  );
}

/**
 * Returns the transactions matching every active filter (filters combine
 * with AND). Never mutates the input.
 */
export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
  categories: readonly Category[],
): Transaction[] {
  const query = filters.search.trim().toLowerCase();
  const categoryNames = new Map(
    categories.map((c) => [c.id, c.name.toLowerCase()]),
  );

  return transactions.filter((t) => {
    if (filters.type !== ALL && t.type !== filters.type) return false;

    if (
      filters.accountId !== ALL &&
      t.accountId !== filters.accountId &&
      t.destinationAccountId !== filters.accountId
    ) {
      return false;
    }

    if (filters.categoryId !== ALL && t.categoryId !== filters.categoryId) {
      return false;
    }

    if (filters.month !== ALL && getMonthKey(t.date) !== filters.month) {
      return false;
    }

    if (query) {
      const categoryName = t.categoryId ? categoryNames.get(t.categoryId) : undefined;
      const matches =
        t.description.toLowerCase().includes(query) ||
        (categoryName?.includes(query) ?? false);
      if (!matches) return false;
    }

    return true;
  });
}

function compareStrings(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Returns a sorted copy. Ties are broken by date (newest first) and then by
 * id, so the order is always the same for the same data.
 */
export function sortTransactions(
  transactions: readonly Transaction[],
  sort: TransactionSort,
): Transaction[] {
  const newestFirst = (a: Transaction, b: Transaction) =>
    compareStrings(b.date, a.date) || compareStrings(b.id, a.id);

  const comparators: Record<TransactionSort, (a: Transaction, b: Transaction) => number> = {
    "date-desc": newestFirst,
    "date-asc": (a, b) => compareStrings(a.date, b.date) || compareStrings(a.id, b.id),
    "amount-desc": (a, b) => b.amount - a.amount || newestFirst(a, b),
    "amount-asc": (a, b) => a.amount - b.amount || newestFirst(a, b),
  };

  return [...transactions].sort(comparators[sort]);
}

export type Page<T> = {
  items: T[];
  /** 1-based, clamped to the valid range. */
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first item shown; 0 when there are no items. */
  start: number;
  /** 1-based index of the last item shown; 0 when there are no items. */
  end: number;
};

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const offset = (current - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);

  return {
    items: pageItems,
    page: current,
    pageCount,
    total,
    start: total === 0 ? 0 : offset + 1,
    end: offset + pageItems.length,
  };
}

/** Income "+₱1.00", expense "-₱1.00", transfer "₱1.00" (neutral). */
export function formatTransactionAmount(transaction: Transaction): string {
  switch (transaction.type) {
    case "income":
      return formatCurrency(transaction.amount, { signed: true });
    case "expense":
      return formatCurrency(-transaction.amount);
    case "transfer":
      return formatCurrency(transaction.amount);
  }
}
