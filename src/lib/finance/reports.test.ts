import { describe, expect, it } from "vitest";

import { calculateMonthlySummary } from "@/lib/finance/calculations";
import { formatCompactCurrency } from "@/lib/finance/money";
import { shiftMonth } from "@/lib/finance/months";
import {
  countFutureDatedTransactions,
  formatPercentOf,
  getCashFlowMargin,
  getExpensesByAccount,
  getExpensesByCategory,
  getMonthlyReport,
  getMonthlyTrend,
  getMonthOverMonthComparison,
  getNiceAxisMax,
  getReportMonths,
  getShare,
  percentOf,
} from "@/lib/finance/reports";
import { createPersistenceController } from "@/lib/persistence/controller";
import { createSnapshot, type FinancialData } from "@/lib/persistence/snapshot";
import type { StorageLike } from "@/lib/persistence/storage";
import { createAccountStore } from "@/stores/account-store";
import { createCategoryStore } from "@/stores/category-store";
import { createTransactionStore } from "@/stores/transaction-store";
import type { Account, Category, Transaction } from "@/types/finance";

// Hand-calculated fixture (amounts in centavos).
//
// December 2025: expenses ₱100.00                  → net -₱100.00
// January 2026:  income ₱50,000.00, expenses ₱20,000.00, one transfer
//                food ₱7,000.50 · bills ₱12,000.00 · hobby (archived) ₱999.50
//                bank ₱16,000.00 · wallet ₱3,000.50 · old card (archived) ₱999.50
// February 2026: no income, expenses ₱2,500.00     → net -₱2,500.00
// March 2026:    no transactions
// April 2026:    income ₱1,000.00, no expenses

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 1_000_000, openingDate: "2025-12-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 50_000, openingDate: "2025-12-01", isActive: true },
  { id: "old-card", name: "Old Card", type: "bank", openingBalance: 0, openingDate: "2026-01-01", isActive: false },
];

const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "orange", isActive: true },
  { id: "bills", name: "Bills", type: "expense", icon: "receipt", color: "amber", isActive: true },
  { id: "hobby", name: "Hobby", type: "expense", icon: "gift", color: "violet", isActive: false },
];

const transactions: Transaction[] = [
  { id: "txn-001", type: "expense", amount: 10_000, date: "2025-12-31", description: "Dinner", accountId: "wallet", categoryId: "food" },
  { id: "txn-002", type: "income", amount: 5_000_000, date: "2026-01-01", description: "Salary", accountId: "bank", categoryId: "salary" },
  { id: "txn-003", type: "expense", amount: 1_200_000, date: "2026-01-05", description: "Rent", accountId: "bank", categoryId: "bills" },
  { id: "txn-004", type: "expense", amount: 300_050, date: "2026-01-10", description: "Groceries", accountId: "wallet", categoryId: "food" },
  { id: "txn-005", type: "expense", amount: 99_950, date: "2026-01-20", description: "Paints", accountId: "old-card", categoryId: "hobby" },
  { id: "txn-006", type: "transfer", amount: 1_000_000, date: "2026-01-25", description: "ATM", accountId: "bank", destinationAccountId: "wallet" },
  { id: "txn-007", type: "expense", amount: 400_000, date: "2026-01-31", description: "Restaurant", accountId: "bank", categoryId: "food" },
  { id: "txn-008", type: "expense", amount: 250_000, date: "2026-02-01", description: "Lunch", accountId: "wallet", categoryId: "food" },
  { id: "txn-009", type: "income", amount: 100_000, date: "2026-04-15", description: "Refund", accountId: "bank", categoryId: "salary" },
];

describe("getMonthlyReport", () => {
  it("totals income, expenses, net cash flow, and margin for the month", () => {
    expect(getMonthlyReport(transactions, "2026-01")).toEqual({
      month: "2026-01",
      transactionCount: 6,
      totalIncome: 5_000_000,
      totalExpenses: 2_000_000,
      netCashFlow: 3_000_000,
      cashFlowMargin: 60,
    });
  });

  it("excludes transfers from income and expenses", () => {
    const onlyTransfer = transactions.filter((t) => t.type === "transfer");
    const report = getMonthlyReport(onlyTransfer, "2026-01");
    expect(report.transactionCount).toBe(1);
    expect(report).toMatchObject({ totalIncome: 0, totalExpenses: 0, netCashFlow: 0 });
  });

  it("never counts opening balances as income", () => {
    // Accounts open in December/January with ₱10,500 of opening balances;
    // December income stays zero and January income is only the salary.
    expect(getMonthlyReport(transactions, "2025-12").totalIncome).toBe(0);
    expect(getMonthlyReport(transactions, "2026-01").totalIncome).toBe(5_000_000);
  });

  it("reports negative net cash flow and N/A margin when there's no income", () => {
    expect(getMonthlyReport(transactions, "2026-02")).toMatchObject({
      totalIncome: 0,
      totalExpenses: 250_000,
      netCashFlow: -250_000,
      cashFlowMargin: null,
    });
  });

  it("handles income with no expenses", () => {
    expect(getMonthlyReport(transactions, "2026-04")).toMatchObject({
      totalIncome: 100_000,
      totalExpenses: 0,
      netCashFlow: 100_000,
      cashFlowMargin: 100,
    });
  });

  it("returns zeros for a month without transactions and for an empty dataset", () => {
    const zero = { transactionCount: 0, totalIncome: 0, totalExpenses: 0, netCashFlow: 0, cashFlowMargin: null };
    expect(getMonthlyReport(transactions, "2026-03")).toMatchObject(zero);
    expect(getMonthlyReport([], "2026-01")).toMatchObject(zero);
  });

  it("uses calendar-month boundaries (first and last day included, neighbours excluded)", () => {
    // 2025-12-31 is December; 2026-01-01 and 2026-01-31 are January; 2026-02-01 is February.
    expect(getMonthlyReport(transactions, "2025-12").totalExpenses).toBe(10_000);
    expect(getMonthlyReport(transactions, "2026-02").totalExpenses).toBe(250_000);
    expect(getMonthlyReport(transactions, "2026-01").totalExpenses).toBe(2_000_000);
  });

  it("agrees with the dashboard summary for the same month", () => {
    for (const month of ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]) {
      const report = getMonthlyReport(transactions, month);
      const summary = calculateMonthlySummary(accounts, transactions, month, "2026-11-02");
      expect(report).toMatchObject({
        transactionCount: summary.transactionCount,
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        netCashFlow: summary.netCashFlow,
      });
    }
  });
});

describe("getCashFlowMargin", () => {
  it("is net cash flow divided by income × 100", () => {
    expect(getCashFlowMargin(5_000_000, 3_000_000)).toBe(60);
    expect(getCashFlowMargin(300, 100)).toBeCloseTo(33.333, 3);
  });

  it("is negative when expenses exceed income", () => {
    expect(getCashFlowMargin(100_000, -50_000)).toBe(-50);
  });

  it("is null when income is zero instead of dividing by zero", () => {
    expect(getCashFlowMargin(0, -250_000)).toBeNull();
    expect(getCashFlowMargin(0, 0)).toBeNull();
  });
});

describe("getMonthlyTrend", () => {
  it("returns the selected month and the five before it, oldest first", () => {
    expect(getMonthlyTrend(transactions, "2026-04").map((p) => p.month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  it("includes months without activity as zeros", () => {
    const trend = getMonthlyTrend(transactions, "2026-04");
    expect(trend[0]).toEqual({ month: "2025-11", income: 0, expenses: 0, netCashFlow: 0 });
    expect(trend[4]).toEqual({ month: "2026-03", income: 0, expenses: 0, netCashFlow: 0 });
  });

  it("matches the monthly report for every month, across the year boundary", () => {
    const trend = getMonthlyTrend(transactions, "2026-04");
    expect(trend[1]).toEqual({ month: "2025-12", income: 0, expenses: 10_000, netCashFlow: -10_000 });
    expect(trend[2]).toEqual({ month: "2026-01", income: 5_000_000, expenses: 2_000_000, netCashFlow: 3_000_000 });
    expect(trend[3]).toEqual({ month: "2026-02", income: 0, expenses: 250_000, netCashFlow: -250_000 });
    for (const point of trend) {
      const report = getMonthlyReport(transactions, point.month);
      expect(point.income).toBe(report.totalIncome);
      expect(point.expenses).toBe(report.totalExpenses);
    }
  });

  it("ignores transactions outside the window, including later ones", () => {
    const trend = getMonthlyTrend(transactions, "2026-02");
    expect(trend.map((p) => p.month)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(trend.reduce((sum, p) => sum + p.income, 0)).toBe(5_000_000); // April refund excluded
  });

  it("returns six zero months for an empty dataset", () => {
    const trend = getMonthlyTrend([], "2026-01");
    expect(trend).toHaveLength(6);
    expect(trend.every((p) => p.income === 0 && p.expenses === 0 && p.netCashFlow === 0)).toBe(true);
  });
});

describe("getExpensesByCategory", () => {
  it("groups expenses by category, highest first, with exact shares", () => {
    const breakdown = getExpensesByCategory(transactions, categories, "2026-01");
    expect(breakdown.totalExpenses).toBe(2_000_000);
    expect(breakdown.rows.map((r) => [r.id, r.amount, r.transactionCount, r.percentage])).toEqual([
      ["bills", 1_200_000, 1, 60],
      ["food", 700_050, 2, 35.0025],
      ["hobby", 99_950, 1, 4.9975],
    ]);
  });

  it("excludes income and transfers", () => {
    const breakdown = getExpensesByCategory(transactions, categories, "2026-01");
    expect(breakdown.rows.some((r) => r.id === "salary")).toBe(false);
    expect(breakdown.rows.reduce((sum, r) => sum + r.amount, 0)).toBe(breakdown.totalExpenses);
  });

  it("includes archived categories used by historical transactions", () => {
    const hobby = getExpensesByCategory(transactions, categories, "2026-01").rows.find((r) => r.id === "hobby");
    expect(hobby).toMatchObject({ name: "Hobby", isArchived: true, amount: 99_950 });
    expect(hobby?.category?.color).toBe("violet");
  });

  it("keeps a row with a fallback name if a category record is missing", () => {
    const rows = getExpensesByCategory(transactions, [], "2026-01").rows;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.name === "Unknown category" && r.category === null)).toBe(true);
  });

  it("returns an empty breakdown for a month with income but no expenses", () => {
    expect(getExpensesByCategory(transactions, categories, "2026-04")).toEqual({
      month: "2026-04",
      totalExpenses: 0,
      rows: [],
    });
  });

  it("orders ties by name so the list is stable", () => {
    const tied: Transaction[] = [
      { id: "a", type: "expense", amount: 500, date: "2026-05-01", description: "", accountId: "bank", categoryId: "food" },
      { id: "b", type: "expense", amount: 500, date: "2026-05-02", description: "", accountId: "bank", categoryId: "bills" },
    ];
    expect(getExpensesByCategory(tied, categories, "2026-05").rows.map((r) => r.name)).toEqual(["Bills", "Food"]);
  });
});

describe("getExpensesByAccount", () => {
  it("groups expenses by source account, highest first", () => {
    const breakdown = getExpensesByAccount(transactions, accounts, "2026-01");
    expect(breakdown.totalExpenses).toBe(2_000_000);
    expect(breakdown.rows.map((r) => [r.id, r.amount, r.percentage])).toEqual([
      ["bank", 1_600_000, 80],
      ["wallet", 300_050, 15.0025],
      ["old-card", 99_950, 4.9975],
    ]);
  });

  it("does not count transfers against either account", () => {
    // The ₱10,000 bank → wallet transfer in January changes neither total.
    const rows = getExpensesByAccount(transactions, accounts, "2026-01").rows;
    expect(rows.find((r) => r.id === "bank")?.amount).toBe(1_600_000);
    expect(rows.find((r) => r.id === "wallet")?.amount).toBe(300_050);
  });

  it("includes archived accounts with historical spending", () => {
    const oldCard = getExpensesByAccount(transactions, accounts, "2026-01").rows.find((r) => r.id === "old-card");
    expect(oldCard).toMatchObject({ name: "Old Card", isArchived: true, amount: 99_950 });
  });

  it("returns an empty breakdown for an empty dataset", () => {
    expect(getExpensesByAccount([], accounts, "2026-01").rows).toEqual([]);
  });
});

describe("getMonthOverMonthComparison", () => {
  it("compares with the immediately preceding month", () => {
    const comparison = getMonthOverMonthComparison(transactions, "2026-02");
    expect(comparison.previousMonth).toBe("2026-01");
    expect(comparison.income).toEqual({ current: 0, previous: 5_000_000, difference: -5_000_000, percentChange: -100 });
    expect(comparison.expenses).toEqual({ current: 250_000, previous: 2_000_000, difference: -1_750_000, percentChange: -87.5 });
    expect(comparison.netCashFlow.difference).toBe(-3_250_000);
    expect(comparison.netCashFlow.percentChange).toBeCloseTo(-108.333, 3);
  });

  it("crosses the year boundary (January vs December)", () => {
    const comparison = getMonthOverMonthComparison(transactions, "2026-01");
    expect(comparison.previousMonth).toBe("2025-12");
    expect(comparison.expenses).toEqual({ current: 2_000_000, previous: 10_000, difference: 1_990_000, percentChange: 19_900 });
  });

  it("leaves the percentage undefined when the previous value is zero", () => {
    const comparison = getMonthOverMonthComparison(transactions, "2026-01");
    expect(comparison.income).toEqual({ current: 5_000_000, previous: 0, difference: 5_000_000, percentChange: null });
  });

  it("measures change against the size of a negative previous net cash flow", () => {
    // December net -₱100 → January net ₱30,000: an increase of ₱30,100 (30,100%).
    const net = getMonthOverMonthComparison(transactions, "2026-01").netCashFlow;
    expect(net.difference).toBe(3_010_000);
    expect(net.percentChange).toBe(30_100);
  });

  it("reports no change between two empty months", () => {
    const comparison = getMonthOverMonthComparison(transactions, "2026-03");
    expect(comparison.income).toEqual({ current: 0, previous: 0, difference: 0, percentChange: null });
    expect(comparison.expenses).toEqual({ current: 0, previous: 250_000, difference: -250_000, percentChange: -100 });
  });
});

describe("getReportMonths", () => {
  it("lists every month from the earliest record through the current month, newest first", () => {
    const months = getReportMonths(accounts, transactions, "2026-05-10");
    expect(months[0]).toBe("2026-05");
    expect(months.at(-1)).toBe("2025-12");
    expect(months).toContain("2026-03"); // gap month stays selectable
    expect(months).toHaveLength(6);
  });

  it("extends past the current month when transactions are dated in the future", () => {
    const future: Transaction = { ...transactions[1], id: "txn-099", date: "2026-07-01" };
    expect(getReportMonths(accounts, [...transactions, future], "2026-05-10")[0]).toBe("2026-07");
  });

  it("offers just the current month for an empty dataset", () => {
    expect(getReportMonths([], [], "2026-11-02")).toEqual(["2026-11"]);
  });
});

describe("countFutureDatedTransactions", () => {
  it("counts transactions in the month dated after today", () => {
    expect(countFutureDatedTransactions(transactions, "2026-01", "2026-01-15")).toBe(3);
    expect(countFutureDatedTransactions(transactions, "2026-01", "2026-01-31")).toBe(0);
  });
});

describe("formatting helpers", () => {
  it("formats percentages with one decimal and N/A for null", () => {
    expect(formatPercentOf(3_000_000, 5_000_000)).toBe("60.0%");
    expect(formatPercentOf(700_050, 2_000_000)).toBe("35.0%");
    expect(formatPercentOf(-3_250_000, 3_000_000)).toBe("-108.3%");
    expect(formatPercentOf(125, 1_000, { signed: true })).toBe("+12.5%");
    expect(formatPercentOf(-1, 1_000_000)).toBe("0.0%"); // never "-0.0%"
    expect(formatPercentOf(0, 100, { signed: true })).toBe("0.0%"); // no "+" on zero
    expect(formatPercentOf(5, 0)).toBe("N/A");
  });

  it("rounds percentages exactly from integer centavos (SW-009 regression)", () => {
    // 1_624_950 / 3_000_000 = 54.165% exactly. As a float it's 54.16499…,
    // so toFixed(2) gave "54.16"; exact rounding gives "54.17".
    expect((1_624_950 * 100 / 3_000_000).toFixed(2)).toBe("54.16");
    expect(percentOf(1_624_950, 3_000_000, 2)).toBe("54.17");
    expect(percentOf(-1_624_950, 3_000_000, 2)).toBe("-54.17"); // half away from zero
    expect(percentOf(1, 3, 2)).toBe("33.33");
    expect(percentOf(2, 3, 2)).toBe("66.67");
    expect(percentOf(1, 8, 1)).toBe("12.5");
    expect(percentOf(1, 16, 1)).toBe("6.3"); // 6.25 → 6.3
    expect(percentOf(5, 1_000, 0)).toBe("1"); // 0.5 → 1
    expect(percentOf(99_999_999_999, 1, 2)).toBe("9999999999900.00"); // beyond float-safe products
    expect(percentOf(0, 0)).toBeNull();
  });

  it("computes shares safely when the total is zero", () => {
    expect(getShare(0, 0)).toBe(0);
    expect(getShare(1, 3)).toBeCloseTo(33.333, 3);
  });

  it("rounds chart axes up to clean values", () => {
    expect(getNiceAxisMax(0)).toBe(0);
    expect(getNiceAxisMax(5_000_000)).toBe(6_000_000); // ₱50,000 → ₱60,000 (4 × ₱15,000)
    expect(getNiceAxisMax(3_712_000)).toBe(4_000_000);
    expect(getNiceAxisMax(10_000)).toBe(10_000);
  });

  it("formats compact axis labels", () => {
    expect(formatCompactCurrency(0)).toBe("₱0");
    expect(formatCompactCurrency(50_000)).toBe("₱500");
    expect(formatCompactCurrency(250_000)).toBe("₱2.5K");
    expect(formatCompactCurrency(4_000_000)).toBe("₱40K");
    expect(formatCompactCurrency(150_000_000)).toBe("₱1.5M");
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftMonth("2026-03", -14)).toBe("2025-01");
    expect(shiftMonth("2026-03", 0)).toBe("2026-03");
  });
});

describe("source data", () => {
  it("is never mutated by any report", () => {
    const before = structuredClone({ accounts, categories, transactions });
    const frozen = {
      accounts: Object.freeze(accounts.map((a) => Object.freeze({ ...a }))),
      categories: Object.freeze(categories.map((c) => Object.freeze({ ...c }))),
      transactions: Object.freeze(transactions.map((t) => Object.freeze({ ...t }))),
    };
    // Frozen inputs make any mutation throw in strict-mode modules.
    getMonthlyReport(frozen.transactions, "2026-01");
    getMonthlyTrend(frozen.transactions, "2026-04");
    getExpensesByCategory(frozen.transactions, frozen.categories, "2026-01");
    getExpensesByAccount(frozen.transactions, frozen.accounts, "2026-01");
    getMonthOverMonthComparison(frozen.transactions, "2026-02");
    getReportMonths(frozen.accounts, frozen.transactions, "2026-05-10");
    expect({ accounts, categories, transactions }).toEqual(before);
  });
});

describe("recalculation from the shared stores", () => {
  function setupStores() {
    const accountStore = createAccountStore(accounts);
    const categoryStore = createCategoryStore(categories);
    const transactionStore = createTransactionStore(transactions, {
      getAccounts: () => accountStore.getState().accounts,
      getCategories: () => categoryStore.getState().categories,
    });
    return { accountStore, categoryStore, transactionStore };
  }

  it("updates after adding, editing, and deleting an expense", () => {
    const { transactionStore, categoryStore } = setupStores();
    const report = () => getMonthlyReport(transactionStore.getState().transactions, "2026-01");
    const food = () =>
      getExpensesByCategory(transactionStore.getState().transactions, categoryStore.getState().categories, "2026-01")
        .rows.find((r) => r.id === "food")?.amount;

    const added = transactionStore.getState().addTransaction({
      type: "expense", amount: 50_000, date: "2026-01-15", description: "Snacks", accountId: "wallet", categoryId: "food",
    });
    if (!added.ok) throw new Error(added.error);
    expect(report().totalExpenses).toBe(2_050_000);
    expect(food()).toBe(750_050);

    const edited = transactionStore.getState().updateTransaction(added.transaction.id, {
      type: "expense", amount: 150_000, date: "2026-01-15", description: "Snacks", accountId: "wallet", categoryId: "bills",
    });
    expect(edited.ok).toBe(true);
    expect(report().totalExpenses).toBe(2_150_000);
    expect(food()).toBe(700_050);

    transactionStore.getState().deleteTransaction(added.transaction.id);
    expect(report().totalExpenses).toBe(2_000_000);
  });

  it("leaves expense reports unchanged when a transfer is added", () => {
    const { transactionStore, accountStore } = setupStores();
    const before = getExpensesByAccount(transactionStore.getState().transactions, accountStore.getState().accounts, "2026-01");
    transactionStore.getState().addTransaction({
      type: "transfer", amount: 200_000, date: "2026-01-16", description: "Top up", accountId: "bank", destinationAccountId: "wallet",
    });
    const after = getExpensesByAccount(transactionStore.getState().transactions, accountStore.getState().accounts, "2026-01");
    expect(after).toEqual(before);
    expect(getMonthlyReport(transactionStore.getState().transactions, "2026-01").netCashFlow).toBe(3_000_000);
  });

  it("keeps historical rows after a category and an account are archived", () => {
    const { transactionStore, categoryStore, accountStore } = setupStores();
    categoryStore.getState().archiveCategory("food");
    accountStore.getState().archiveAccount("wallet");
    const state = transactionStore.getState().transactions;

    const food = getExpensesByCategory(state, categoryStore.getState().categories, "2026-01").rows.find((r) => r.id === "food");
    const wallet = getExpensesByAccount(state, accountStore.getState().accounts, "2026-01").rows.find((r) => r.id === "wallet");
    expect(food).toMatchObject({ amount: 700_050, isArchived: true });
    expect(wallet).toMatchObject({ amount: 300_050, isArchived: true });
  });

  it("recalculates after a backup is restored", () => {
    const { accountStore, categoryStore, transactionStore } = setupStores();
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, value),
    };
    const seed: FinancialData = { accounts, categories, transactions };
    const controller = createPersistenceController({
      stores: { accounts: accountStore, categories: categoryStore, transactions: transactionStore },
      storage,
      seed,
    });
    controller.connect();
    controller.initialize();
    controller.createWorkspace(seed);
    expect(getMonthlyReport(transactionStore.getState().transactions, "2026-01").totalExpenses).toBe(2_000_000);

    const backup: FinancialData = {
      accounts: [accounts[0]],
      categories: [categories[1]],
      transactions: [
        { id: "txn-001", type: "expense", amount: 12_345, date: "2026-01-09", description: "Taxi", accountId: "bank", categoryId: "food" },
      ],
    };
    expect(controller.restore(createSnapshot(backup))).toEqual({ ok: true });

    const restored = transactionStore.getState().transactions;
    expect(getMonthlyReport(restored, "2026-01")).toMatchObject({ totalIncome: 0, totalExpenses: 12_345, cashFlowMargin: null });
    expect(getExpensesByCategory(restored, categoryStore.getState().categories, "2026-01").rows).toEqual([
      expect.objectContaining({ id: "food", amount: 12_345, percentage: 100 }),
    ]);
  });
});
