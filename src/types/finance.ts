/**
 * Money is stored as an integer number of centavos (₱1.00 = 100).
 * Integers add and subtract exactly; floating-point pesos do not
 * (0.1 + 0.2 !== 0.3).
 */
export type Centavos = number;

/** A calendar date in Asia/Manila local time, formatted "YYYY-MM-DD". */
export type IsoDate = string;

/** A calendar month, formatted "YYYY-MM". */
export type MonthKey = string;

export type AccountType = "cash" | "bank" | "e_wallet";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  /** Balance on `openingDate`, before any recorded transactions. Not income. */
  openingBalance: Centavos;
  openingDate: IsoDate;
  isActive: boolean;
};

/** Fields needed to create an account; it starts active with a new id. */
export type AccountInput = Pick<Account, "name" | "type" | "openingBalance" | "openingDate">;

/**
 * The only fields that can change after creation. Opening balance and date
 * are excluded on purpose: changing them would rewrite historical balances.
 */
export type AccountUpdate = Pick<Account, "name" | "type">;

export type CategoryType = "income" | "expense";

/** Lucide icons a category can use (mapped to components in config/category-appearance.ts). */
export type CategoryIcon =
  | "briefcase"
  | "coins"
  | "piggy-bank"
  | "trending-up"
  | "gift"
  | "utensils"
  | "coffee"
  | "shopping-basket"
  | "receipt"
  | "zap"
  | "wifi"
  | "smartphone"
  | "home"
  | "bus"
  | "car"
  | "fuel"
  | "plane"
  | "shopping-bag"
  | "shirt"
  | "clapperboard"
  | "heart-pulse"
  | "graduation-cap"
  | "baby"
  | "paw-print"
  | "circle-ellipsis";

/** Fixed color palette for categories (mapped to classes in config/category-appearance.ts). */
export type CategoryColor =
  | "emerald"
  | "teal"
  | "sky"
  | "blue"
  | "violet"
  | "pink"
  | "rose"
  | "orange"
  | "amber"
  | "lime"
  | "slate";

export type Category = {
  id: string;
  name: string;
  /** Can't change after creation. */
  type: CategoryType;
  /** Lucide icon identifier, mapped to a component in the UI layer. */
  icon: CategoryIcon;
  color: CategoryColor;
  /** `false` when archived: kept for history, hidden from new transactions. */
  isActive: boolean;
};

/** Fields needed to create a category; it starts active with a new id. */
export type CategoryInput = Pick<Category, "name" | "type" | "icon" | "color">;

/** The only fields that can change after creation (not the type). */
export type CategoryUpdate = Pick<Category, "name" | "icon" | "color">;

type TransactionBase = {
  id: string;
  /** Always positive. The transaction type decides the direction. */
  amount: Centavos;
  date: IsoDate;
  description: string;
  /** Account the money comes from (expense, transfer) or goes to (income). */
  accountId: string;
};

export type IncomeTransaction = TransactionBase & {
  type: "income";
  categoryId: string;
  destinationAccountId?: never;
};

export type ExpenseTransaction = TransactionBase & {
  type: "expense";
  categoryId: string;
  destinationAccountId?: never;
};

export type TransferTransaction = TransactionBase & {
  type: "transfer";
  /** Must differ from `accountId`; checked by `validateTransaction`. */
  destinationAccountId: string;
  categoryId?: never;
};

/**
 * Discriminated union on `type`: TypeScript rejects a transfer with a
 * category, or an income/expense with a destination account.
 */
export type Transaction =
  | IncomeTransaction
  | ExpenseTransaction
  | TransferTransaction;

/** A transaction before it has an id (e.g. new form input). */
export type TransactionInput = Transaction extends infer T
  ? T extends Transaction
    ? Omit<T, "id">
    : never
  : never;

export type MonthlySummary = {
  month: MonthKey;
  transactionCount: number;
  totalIncome: Centavos;
  totalExpenses: Centavos;
  netCashFlow: Centavos;
  /** Total of all account balances at the end of `balanceAsOf`. */
  totalAccountBalance: Centavos;
  /** Reporting cutoff for the balance: month end, or today for the current month. */
  balanceAsOf: IsoDate;
};
