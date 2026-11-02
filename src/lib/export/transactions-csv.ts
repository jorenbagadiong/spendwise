import { csvFilename, toCsvDocument, type CsvColumn } from "@/lib/export/csv";
import { formatCentavosAsDecimal } from "@/lib/finance/money";
import {
  ALL,
  filterTransactions,
  sortTransactions,
  transactionTypeLabels,
  type TransactionFilters,
  type TransactionSort,
} from "@/lib/finance/transactions";
import type { Account, Category, Centavos, IsoDate, Transaction } from "@/types/finance";

export type TransactionExportScope = "filtered" | "all";

/** One CSV line. Names are resolved; internal ids never appear. */
export type TransactionCsvRow = {
  date: IsoDate;
  type: string;
  description: string;
  category: string;
  fromAccount: string;
  toAccount: string;
  /** Signed: income +, expense −, transfer + (money moved, not gained). */
  amount: Centavos;
};

export const TRANSACTION_CSV_COLUMNS: readonly CsvColumn<TransactionCsvRow>[] = [
  { header: "Date", kind: "text", value: (r) => r.date },
  { header: "Type", kind: "text", value: (r) => r.type },
  { header: "Description", kind: "text", value: (r) => r.description },
  { header: "Category", kind: "text", value: (r) => r.category },
  { header: "From Account", kind: "text", value: (r) => r.fromAccount },
  { header: "To Account", kind: "text", value: (r) => r.toAccount },
  { header: "Amount (PHP)", kind: "number", value: (r) => formatCentavosAsDecimal(r.amount) },
];

/** Stored amounts are always positive; the CSV shows expenses as negative. */
export function getSignedAmount(transaction: Transaction): Centavos {
  return transaction.type === "expense" ? -transaction.amount : transaction.amount;
}

/**
 * Maps transactions to CSV rows, in the given order. Account and category
 * names come from the current stores, archived ones included (plain names,
 * without the "(archived)" suffix the UI adds). A missing reference, which
 * storage integrity checks prevent, shows as "Unknown …" rather than an id.
 */
export function toTransactionCsvRows(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  categories: readonly Category[],
): TransactionCsvRow[] {
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const accountName = (id: string) => accountNames.get(id) ?? "Unknown account";

  return transactions.map((t): TransactionCsvRow => {
    const base = {
      date: t.date,
      type: transactionTypeLabels[t.type],
      description: t.description,
      amount: getSignedAmount(t),
    };
    switch (t.type) {
      case "income":
        // Income has no source account: the money arrives in `accountId`.
        return {
          ...base,
          category: categoryNames.get(t.categoryId) ?? "Unknown category",
          fromAccount: "",
          toAccount: accountName(t.accountId),
        };
      case "expense":
        return {
          ...base,
          category: categoryNames.get(t.categoryId) ?? "Unknown category",
          fromAccount: accountName(t.accountId),
          toAccount: "",
        };
      case "transfer":
        return {
          ...base,
          category: "",
          fromAccount: accountName(t.accountId),
          toAccount: accountName(t.destinationAccountId),
        };
    }
  });
}

/**
 * The transactions an export contains, in the table's current sort order.
 * "filtered" uses the table's own filter function, so it matches the table
 * exactly, across every page (pagination is never applied). "all" ignores
 * the filters. The input array is never changed.
 */
export function selectTransactionsForExport(
  scope: TransactionExportScope,
  transactions: readonly Transaction[],
  filters: TransactionFilters,
  sort: TransactionSort,
  categories: readonly Category[],
): Transaction[] {
  const included = scope === "all" ? transactions : filterTransactions(transactions, filters, categories);
  return sortTransactions(included, sort);
}

/** The complete CSV file contents (with BOM) for the given transactions. */
export function buildTransactionsCsv(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  categories: readonly Category[],
): string {
  return toCsvDocument(TRANSACTION_CSV_COLUMNS, toTransactionCsvRows(transactions, accounts, categories));
}

/**
 * "spendwise-transactions-2026-11-02.csv" for all transactions (stamped
 * with today's Manila date); "spendwise-transactions-filtered-2026-11.csv"
 * when a month filter is active, or "…-filtered-2026-11-02.csv" without one.
 */
export function transactionsCsvFilename(
  scope: TransactionExportScope,
  filters: TransactionFilters,
  today: IsoDate,
): string {
  if (scope === "all") return csvFilename("transactions", today);
  return csvFilename("transactions", "filtered", filters.month === ALL ? today : filters.month);
}
