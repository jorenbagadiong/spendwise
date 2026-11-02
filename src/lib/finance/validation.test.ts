import { describe, expect, it } from "vitest";

import { validateTransaction } from "@/lib/finance/validation";
import type { Account, Category, Transaction } from "@/types/finance";

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 0, openingDate: "2026-01-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 0, openingDate: "2026-01-01", isActive: true },
];
const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase" },
  { id: "food", name: "Food", type: "expense", icon: "utensils" },
];

const validate = (t: Transaction) => validateTransaction(t, accounts, categories);

describe("validateTransaction", () => {
  it("accepts valid income, expense, and transfer transactions", () => {
    expect(validate({ id: "1", type: "income", amount: 100, date: "2026-01-02", description: "", accountId: "bank", categoryId: "salary" })).toEqual([]);
    expect(validate({ id: "2", type: "expense", amount: 100, date: "2026-01-02", description: "", accountId: "bank", categoryId: "food" })).toEqual([]);
    expect(validate({ id: "3", type: "transfer", amount: 100, date: "2026-01-02", description: "", accountId: "bank", destinationAccountId: "wallet" })).toEqual([]);
  });

  it("rejects a transfer to the same account", () => {
    expect(validate({ id: "1", type: "transfer", amount: 100, date: "2026-01-02", description: "", accountId: "bank", destinationAccountId: "bank" })).toEqual([
      { field: "destinationAccountId", message: "Transfer source and destination must be different accounts." },
    ]);
  });

  it("rejects zero, negative, and fractional amounts", () => {
    for (const amount of [0, -100, 10.5]) {
      expect(validate({ id: "1", type: "expense", amount, date: "2026-01-02", description: "", accountId: "bank", categoryId: "food" })).toHaveLength(1);
    }
  });

  it("rejects a category of the wrong type", () => {
    expect(validate({ id: "1", type: "expense", amount: 100, date: "2026-01-02", description: "", accountId: "bank", categoryId: "salary" }).map((i) => i.field)).toEqual(["categoryId"]);
  });

  it("rejects dates before the account opened and malformed dates", () => {
    expect(validate({ id: "1", type: "expense", amount: 100, date: "2025-12-31", description: "", accountId: "bank", categoryId: "food" })).toHaveLength(1);
    expect(validate({ id: "2", type: "expense", amount: 100, date: "2026-1-5", description: "", accountId: "bank", categoryId: "food" })).toHaveLength(1);
    expect(validate({ id: "3", type: "expense", amount: 100, date: "2026-02-30", description: "", accountId: "bank", categoryId: "food" })).toEqual([
      { field: "date", message: "Date must be a real calendar date (YYYY-MM-DD)." },
    ]);
  });

  it("rejects unknown accounts", () => {
    expect(validate({ id: "1", type: "transfer", amount: 100, date: "2026-01-02", description: "", accountId: "nope", destinationAccountId: "wallet" })).toHaveLength(1);
  });

  it("lets TypeScript reject invalid shapes", () => {
    // @ts-expect-error A transfer can't have a category.
    const transferWithCategory: Transaction = { id: "1", type: "transfer", amount: 100, date: "2026-01-02", description: "", accountId: "bank", destinationAccountId: "wallet", categoryId: "food" };
    // @ts-expect-error An expense can't have a destination account.
    const expenseWithDestination: Transaction = { id: "2", type: "expense", amount: 100, date: "2026-01-02", description: "", accountId: "bank", categoryId: "food", destinationAccountId: "wallet" };
    // @ts-expect-error A transfer needs a destination account.
    const transferWithoutDestination: Transaction = { id: "3", type: "transfer", amount: 100, date: "2026-01-02", description: "", accountId: "bank" };
    expect([transferWithCategory, expenseWithDestination, transferWithoutDestination]).toHaveLength(3);
  });
});
