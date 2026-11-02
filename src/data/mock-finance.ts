import type { Account, Category, Transaction } from "@/types/finance";

// Fixed sample data for the dashboard until real data entry (and persistence)
// arrives. All amounts are integer centavos: 1_850_000 = ₱18,500.00.
//
// Months covered: July, August, October, and early November 2026.
// September 2026 intentionally has no transactions.

export const mockAccounts = [
  {
    id: "bpi-savings",
    name: "BPI Savings",
    type: "bank",
    openingBalance: 4_500_000,
    openingDate: "2026-07-01",
    isActive: true,
  },
  {
    id: "gcash",
    name: "GCash",
    type: "e_wallet",
    openingBalance: 250_000,
    openingDate: "2026-07-01",
    isActive: true,
  },
  {
    id: "maya",
    name: "Maya",
    type: "e_wallet",
    openingBalance: 120_000,
    openingDate: "2026-07-01",
    isActive: true,
  },
  {
    id: "cash-wallet",
    name: "Cash Wallet",
    type: "cash",
    openingBalance: 300_000,
    openingDate: "2026-07-01",
    isActive: true,
  },
] as const satisfies readonly Account[];

export const mockCategories = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase" },
  { id: "other-income", name: "Other Income", type: "income", icon: "coins" },
  { id: "food", name: "Food", type: "expense", icon: "utensils" },
  { id: "groceries", name: "Groceries", type: "expense", icon: "shopping-basket" },
  { id: "bills", name: "Bills", type: "expense", icon: "receipt" },
  { id: "transportation", name: "Transportation", type: "expense", icon: "bus" },
  { id: "shopping", name: "Shopping", type: "expense", icon: "shopping-bag" },
  { id: "entertainment", name: "Entertainment", type: "expense", icon: "clapperboard" },
  { id: "other-expenses", name: "Other Expenses", type: "expense", icon: "circle-ellipsis" },
] as const satisfies readonly Category[];

export const mockTransactions = [
  // July 2026 — income ₱37,000.00, expenses ₱7,825.65
  { id: "txn-001", type: "expense", amount: 245_075, date: "2026-07-03", description: "SM Supermarket groceries", accountId: "gcash", categoryId: "groceries" },
  { id: "txn-002", type: "expense", amount: 18_000, date: "2026-07-05", description: "Jeepney and tricycle fare", accountId: "cash-wallet", categoryId: "transportation" },
  { id: "txn-003", type: "expense", amount: 189_900, date: "2026-07-08", description: "PLDT Fiber internet", accountId: "bpi-savings", categoryId: "bills" },
  { id: "txn-004", type: "income", amount: 1_850_000, date: "2026-07-15", description: "Salary — first half of July", accountId: "bpi-savings", categoryId: "salary" },
  { id: "txn-005", type: "transfer", amount: 300_000, date: "2026-07-16", description: "Cash in to GCash", accountId: "bpi-savings", destinationAccountId: "gcash" },
  { id: "txn-006", type: "expense", amount: 38_550, date: "2026-07-19", description: "Jollibee lunch", accountId: "gcash", categoryId: "food" },
  { id: "txn-007", type: "expense", amount: 56_000, date: "2026-07-24", description: "Movie tickets", accountId: "maya", categoryId: "entertainment" },
  { id: "txn-008", type: "income", amount: 1_850_000, date: "2026-07-30", description: "Salary — second half of July", accountId: "bpi-savings", categoryId: "salary" },
  { id: "txn-009", type: "expense", amount: 235_040, date: "2026-07-31", description: "Meralco electricity bill", accountId: "bpi-savings", categoryId: "bills" },

  // August 2026 — income ₱39,500.00, expenses ₱12,458.25
  { id: "txn-010", type: "expense", amount: 312_025, date: "2026-08-02", description: "Puregold groceries", accountId: "bpi-savings", categoryId: "groceries" },
  { id: "txn-011", type: "expense", amount: 45_000, date: "2026-08-06", description: "Grab ride to the office", accountId: "gcash", categoryId: "transportation" },
  { id: "txn-012", type: "income", amount: 250_000, date: "2026-08-10", description: "Freelance logo design", accountId: "gcash", categoryId: "other-income" },
  { id: "txn-013", type: "expense", amount: 499_900, date: "2026-08-12", description: "Running shoes", accountId: "bpi-savings", categoryId: "shopping" },
  { id: "txn-014", type: "income", amount: 1_850_000, date: "2026-08-14", description: "Salary — first half of August", accountId: "bpi-savings", categoryId: "salary" },
  { id: "txn-015", type: "transfer", amount: 500_000, date: "2026-08-15", description: "ATM withdrawal", accountId: "bpi-savings", destinationAccountId: "cash-wallet" },
  { id: "txn-016", type: "expense", amount: 124_000, date: "2026-08-20", description: "Family dinner", accountId: "cash-wallet", categoryId: "food" },
  { id: "txn-017", type: "expense", amount: 189_900, date: "2026-08-27", description: "PLDT Fiber internet", accountId: "bpi-savings", categoryId: "bills" },
  { id: "txn-018", type: "income", amount: 1_850_000, date: "2026-08-28", description: "Salary — second half of August", accountId: "bpi-savings", categoryId: "salary" },
  { id: "txn-019", type: "transfer", amount: 100_000, date: "2026-08-29", description: "Send money to Maya", accountId: "gcash", destinationAccountId: "maya" },
  { id: "txn-020", type: "expense", amount: 75_000, date: "2026-08-30", description: "Birthday gift", accountId: "cash-wallet", categoryId: "other-expenses" },

  // September 2026 — no transactions

  // October 2026 — income ₱38,500.00, expenses ₱18,689.60
  { id: "txn-021", type: "expense", amount: 218_060, date: "2026-10-02", description: "Meralco electricity bill", accountId: "bpi-savings", categoryId: "bills" },
  { id: "txn-022", type: "expense", amount: 286_000, date: "2026-10-04", description: "SM Supermarket groceries", accountId: "gcash", categoryId: "groceries" },
  { id: "txn-023", type: "expense", amount: 50_000, date: "2026-10-09", description: "Beep card reload", accountId: "cash-wallet", categoryId: "transportation" },
  { id: "txn-024", type: "income", amount: 1_925_000, date: "2026-10-15", description: "Salary — first half of October", accountId: "bpi-savings", categoryId: "salary" },
  { id: "txn-025", type: "expense", amount: 64_900, date: "2026-10-17", description: "Netflix and Spotify", accountId: "maya", categoryId: "entertainment" },
  { id: "txn-026", type: "expense", amount: 1_250_000, date: "2026-10-18", description: "New phone", accountId: "bpi-savings", categoryId: "shopping" },
  { id: "txn-027", type: "income", amount: 1_925_000, date: "2026-10-30", description: "Salary — second half of October", accountId: "bpi-savings", categoryId: "salary" },
  { id: "txn-028", type: "transfer", amount: 200_000, date: "2026-10-31", description: "Cash in to GCash", accountId: "bpi-savings", destinationAccountId: "gcash" },

  // November 2026 — income ₱0.00, expenses ₱485.00 (month in progress)
  { id: "txn-029", type: "expense", amount: 27_500, date: "2026-11-01", description: "Breakfast at the carinderia", accountId: "cash-wallet", categoryId: "food" },
  { id: "txn-030", type: "expense", amount: 21_000, date: "2026-11-02", description: "Angkas ride", accountId: "gcash", categoryId: "transportation" },
] as const satisfies readonly Transaction[];
