import { afterEach, describe, expect, it } from "vitest";

import { buildMonthlySummaryCsv, buildCategoryBreakdownCsv } from "@/lib/export/reports-csv";
import { UTF8_BOM } from "@/lib/export/csv";
import {
  calculateAccountBalance,
  calculateMonthlySummary,
  calculateTotalAccountBalance,
  filterTransactionsByMonth,
} from "@/lib/finance/calculations";
import { getCategoryLabel } from "@/lib/finance/categories";
import { getMonthEndDate, getMonthKey, getTodayInManila, listMonths } from "@/lib/finance/months";
import { getExpensesByCategory, getMonthlyReport } from "@/lib/finance/reports";
import { createAccountStore } from "@/stores/account-store";
import { createCategoryStore } from "@/stores/category-store";
import { createTransactionStore } from "@/stores/transaction-store";
import type { Account, Category, Transaction, TransactionInput } from "@/types/finance";

// SW-009: the financial invariants from the README, one test each, on one
// hand-calculated ledger. Other test files cover each area in more depth.
//
// Ledger (centavos):
//   bank  opens 2026-01-01 with 100_000; wallet opens 2026-01-01 with 5_000
//   old   archived account, opens 2026-01-01 with 0
//   Jan 31  income   50_000 → bank        (last day of January)
//   Feb 01  expense  12_345 ← wallet      (first day of February)
//   Feb 10  transfer 20_000 bank → wallet
//   Feb 28  expense   7_000 ← old (archived account, archived category)
//   Mar 01  expense  30_000 ← wallet      (wallet goes negative)

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 100_000, openingDate: "2026-01-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 5_000, openingDate: "2026-01-01", isActive: true },
  { id: "old", name: "Old", type: "bank", openingBalance: 0, openingDate: "2026-01-01", isActive: false },
];
const categories: Category[] = [
  { id: "pay", name: "Pay", type: "income", icon: "briefcase", color: "emerald", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "orange", isActive: true },
  { id: "retired", name: "Retired", type: "expense", icon: "gift", color: "slate", isActive: false },
];
const ledger: Transaction[] = [
  { id: "t1", type: "income", amount: 50_000, date: "2026-01-31", description: "Pay", accountId: "bank", categoryId: "pay" },
  { id: "t2", type: "expense", amount: 12_345, date: "2026-02-01", description: "Food", accountId: "wallet", categoryId: "food" },
  { id: "t3", type: "transfer", amount: 20_000, date: "2026-02-10", description: "Move", accountId: "bank", destinationAccountId: "wallet" },
  { id: "t4", type: "expense", amount: 7_000, date: "2026-02-28", description: "Old", accountId: "old", categoryId: "retired" },
  { id: "t5", type: "expense", amount: 30_000, date: "2026-03-01", description: "Big", accountId: "wallet", categoryId: "food" },
];
const END = "2026-12-31";
const balance = (id: string, txns = ledger, asOf = END) =>
  calculateAccountBalance(accounts.find((a) => a.id === id)!, txns, asOf);

describe("financial invariants", () => {
  it("1. all authoritative amounts are integer centavos", () => {
    for (const value of [...ledger.map((t) => t.amount), ...accounts.map((a) => a.openingBalance)]) {
      expect(Number.isSafeInteger(value)).toBe(true);
    }
    expect(Number.isSafeInteger(calculateTotalAccountBalance(accounts, ledger, END))).toBe(true);
  });

  it("2. opening balances are not income", () => {
    const january = getMonthlyReport(ledger, "2026-01");
    expect(january.totalIncome).toBe(50_000); // not 155_000
  });

  it("3–5. income credits its account, expenses debit theirs, transfers move money between two", () => {
    expect(balance("bank")).toBe(100_000 + 50_000 - 20_000);
    expect(balance("wallet")).toBe(5_000 - 12_345 + 20_000 - 30_000);
    expect(balance("old")).toBe(-7_000);
  });

  it("6–7. transfers change neither income, expenses, net, nor the consolidated balance", () => {
    const withoutTransfer = ledger.filter((t) => t.type !== "transfer");
    expect(getMonthlyReport(ledger, "2026-02")).toMatchObject(
      (({ totalIncome, totalExpenses, netCashFlow }) => ({ totalIncome, totalExpenses, netCashFlow }))(
        getMonthlyReport(withoutTransfer, "2026-02"),
      ),
    );
    expect(calculateTotalAccountBalance(accounts, ledger, END)).toBe(
      calculateTotalAccountBalance(accounts, withoutTransfer, END),
    );
  });

  it("8–9. editing applies a change exactly once; deleting removes it exactly once", () => {
    const accountStore = createAccountStore(accounts);
    const categoryStore = createCategoryStore(categories);
    const store = createTransactionStore(ledger, {
      getAccounts: () => accountStore.getState().accounts,
      getCategories: () => categoryStore.getState().categories,
    });
    const total = () => calculateTotalAccountBalance(accounts, store.getState().transactions, END);
    const before = total();

    const smaller: TransactionInput = {
      type: "expense",
      amount: 12_000,
      date: "2026-02-01",
      description: "Food",
      accountId: "wallet",
      categoryId: "food",
    };
    expect(store.getState().updateTransaction("t2", smaller).ok).toBe(true);
    expect(total()).toBe(before + 345); // the 345 difference, once
    store.getState().updateTransaction("t2", smaller); // same edit again
    expect(total()).toBe(before + 345); // still once

    store.getState().deleteTransaction("t2");
    expect(total()).toBe(before + 12_345);
    expect(store.getState().deleteTransaction("t2")).toBeNull(); // second delete is a no-op
    expect(total()).toBe(before + 12_345);
  });

  it("10. archived accounts stay in historical and consolidated balances", () => {
    expect(calculateTotalAccountBalance(accounts, ledger, END)).toBe(balance("bank") + balance("wallet") + balance("old"));
    expect(calculateMonthlySummary(accounts, ledger, "2026-02", END).totalAccountBalance).toBe(
      100_000 + 50_000 - 20_000 + (5_000 - 12_345 + 20_000) - 7_000,
    );
  });

  it("11. archived categories stay resolvable in historical reports", () => {
    const row = getExpensesByCategory(ledger, categories, "2026-02").rows.find((r) => r.id === "retired");
    expect(row).toMatchObject({ name: "Retired", isArchived: true, amount: 7_000 });
    expect(getCategoryLabel(categories[2])).toBe("Retired (archived)");
  });

  it("12. months use calendar boundaries (last and first days)", () => {
    expect(filterTransactionsByMonth(ledger, "2026-01").map((t) => t.id)).toEqual(["t1"]);
    expect(filterTransactionsByMonth(ledger, "2026-02").map((t) => t.id)).toEqual(["t2", "t3", "t4"]);
    expect(filterTransactionsByMonth(ledger, "2026-03").map((t) => t.id)).toEqual(["t5"]);
  });

  it("13. a historical month-end balance includes every earlier transaction", () => {
    // End of February: opening balances + January + February, not March.
    expect(calculateMonthlySummary(accounts, ledger, "2026-02", END).balanceAsOf).toBe("2026-02-28");
    expect(balance("wallet", ledger, "2026-02-28")).toBe(5_000 - 12_345 + 20_000);
  });

  it("14. reports reconcile with the dashboard summary", () => {
    for (const month of listMonths("2026-01", "2026-03")) {
      const report = getMonthlyReport(ledger, month);
      const summary = calculateMonthlySummary(accounts, ledger, month, END);
      expect([report.totalIncome, report.totalExpenses, report.netCashFlow]).toEqual([
        summary.totalIncome,
        summary.totalExpenses,
        summary.netCashFlow,
      ]);
    }
  });

  it("15. CSV exports reconcile with the report data", () => {
    const summary = buildMonthlySummaryCsv(ledger, "2026-02").replace(UTF8_BOM, "").split("\r\n");
    expect(summary).toContain("2026-02,0.00,193.45,-193.45,");
    const categoryTotal = buildCategoryBreakdownCsv(ledger, categories, "2026-02").split("\r\n").at(-2);
    expect(categoryTotal).toBe("2026-02,Total,,193.45,100.00,2");
    expect(getMonthlyReport(ledger, "2026-02").totalExpenses).toBe(19_345);
  });

  it("16. negative calculated balances are supported", () => {
    expect(balance("wallet")).toBe(-17_345);
    expect(balance("old")).toBeLessThan(0);
  });
});

describe("17. dates never shift with the machine's time zone", () => {
  const original = process.env.TZ;
  afterEach(() => {
    process.env.TZ = original;
  });

  // Node applies TZ changes immediately. These span UTC-12 to UTC+14.
  for (const zone of ["UTC", "America/Los_Angeles", "Asia/Manila", "Pacific/Kiritimati", "Etc/GMT+12"]) {
    it(`gives the same months, balances, and Manila "today" in ${zone}`, () => {
      process.env.TZ = zone;
      expect(getMonthKey("2026-03-01")).toBe("2026-03");
      expect(getMonthEndDate("2026-02")).toBe("2026-02-28");
      expect(filterTransactionsByMonth(ledger, "2026-02").map((t) => t.id)).toEqual(["t2", "t3", "t4"]);
      expect(balance("wallet", ledger, "2026-02-28")).toBe(12_655);
      // 15:59:59Z is 23:59:59 in Manila; 16:00:00Z is the next day there.
      expect(getTodayInManila(new Date("2026-02-28T15:59:59Z"))).toBe("2026-02-28");
      expect(getTodayInManila(new Date("2026-02-28T16:00:00Z"))).toBe("2026-03-01");
    });
  }
});
