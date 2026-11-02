import { describe, expect, it } from "vitest";

import { mockAccounts, mockCategories, mockTransactions } from "@/data/mock-finance";
import { calculateAccountBalance, calculateMonthlySummary } from "@/lib/finance/calculations";
import { validateTransaction } from "@/lib/finance/validation";

describe("mock data", () => {
  it("contains only valid transactions", () => {
    for (const transaction of mockTransactions) {
      expect(validateTransaction(transaction, mockAccounts, mockCategories), transaction.id).toEqual([]);
    }
  });

  it("uses unique ids", () => {
    expect(new Set(mockTransactions.map((t) => t.id)).size).toBe(mockTransactions.length);
  });

  it("never lets an account balance go negative", () => {
    for (const { date } of mockTransactions) {
      for (const account of mockAccounts) {
        expect(calculateAccountBalance(account, mockTransactions, date), `${account.id} on ${date}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // Hand-calculated totals; see the comments in mock-finance.ts.
  it.each([
    ["2026-07", 9, 3_700_000, 782_565, 5_170_000 + 2_917_435],
    ["2026-08", 11, 3_950_000, 1_245_825, 5_170_000 + 2_917_435 + 2_704_175],
    ["2026-09", 0, 0, 0, 5_170_000 + 2_917_435 + 2_704_175],
    ["2026-10", 8, 3_850_000, 1_868_960, 5_170_000 + 2_917_435 + 2_704_175 + 1_981_040],
  ])("summarizes %s", (month, count, income, expenses, balance) => {
    expect(calculateMonthlySummary(mockAccounts, mockTransactions, month, "2026-11-02")).toMatchObject({
      transactionCount: count,
      totalIncome: income,
      totalExpenses: expenses,
      netCashFlow: income - expenses,
      totalAccountBalance: balance,
    });
  });
});
