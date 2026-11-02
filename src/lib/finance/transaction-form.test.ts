import { describe, expect, it } from "vitest";

import {
  createTransactionFormSchema,
  getEmptyFormValues,
  getFormValuesFromTransaction,
  type TransactionFormValues,
} from "@/lib/finance/transaction-form";
import type { Account, Category } from "@/types/finance";

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", openingBalance: 0, openingDate: "2026-01-01", isActive: true },
  { id: "wallet", name: "Wallet", type: "cash", openingBalance: 0, openingDate: "2026-01-01", isActive: true },
  { id: "old", name: "Old Card", type: "bank", openingBalance: 0, openingDate: "2026-01-01", isActive: false },
];
const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase" },
  { id: "food", name: "Food", type: "expense", icon: "utensils" },
];

const schema = createTransactionFormSchema(accounts, categories);
const base: TransactionFormValues = {
  type: "expense",
  date: "2026-03-10",
  amount: "250.75",
  description: "  Lunch  ",
  accountId: "wallet",
  destinationAccountId: "",
  categoryId: "food",
};

/** Field → messages for a failed parse. */
function errorsFor(values: Partial<TransactionFormValues>) {
  const result = schema.safeParse({ ...base, ...values });
  if (result.success) return {};
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

describe("transaction form schema: valid input", () => {
  it("creates an expense with centavos and a trimmed description", () => {
    expect(schema.parse(base)).toEqual({
      type: "expense",
      amount: 25_075,
      date: "2026-03-10",
      description: "Lunch",
      accountId: "wallet",
      categoryId: "food",
    });
  });

  it("creates income", () => {
    expect(schema.parse({ ...base, type: "income", amount: "18,500", accountId: "bank", categoryId: "salary" })).toEqual({
      type: "income",
      amount: 1_850_000,
      date: "2026-03-10",
      description: "Lunch",
      accountId: "bank",
      categoryId: "salary",
    });
  });

  it("creates a transfer without a category, ignoring a leftover category value", () => {
    const result = schema.parse({ ...base, type: "transfer", accountId: "bank", destinationAccountId: "wallet", categoryId: "food" });
    expect(result).toEqual({
      type: "transfer",
      amount: 25_075,
      date: "2026-03-10",
      description: "Lunch",
      accountId: "bank",
      destinationAccountId: "wallet",
    });
    expect("categoryId" in result).toBe(false);
  });

  it("drops a leftover destination account when switching away from transfer", () => {
    const result = schema.parse({ ...base, destinationAccountId: "bank" });
    expect("destinationAccountId" in result).toBe(false);
  });
});

describe("transaction form schema: rejected input", () => {
  it.each(["", "0", "-10", "1.234", "abc", "1e3", "Infinity", "NaN", "12,50"])("rejects amount %j", (amount) => {
    expect(errorsFor({ amount }).amount).toHaveLength(1);
  });

  it.each(["", "2026-02-30", "2026-13-01", "03/10/2026"])("rejects date %j", (date) => {
    expect(errorsFor({ date })).toEqual({ date: ["Enter a valid date."] });
  });

  it("rejects a date before the account opened", () => {
    expect(errorsFor({ date: "2025-12-31" })).toEqual({ date: ["Date is before Wallet was opened."] });
  });

  it("rejects whitespace-only and overly long descriptions", () => {
    expect(errorsFor({ description: "   " })).toEqual({ description: ["Enter a description."] });
    expect(errorsFor({ description: "x".repeat(121) }).description).toHaveLength(1);
  });

  it("requires an account and category", () => {
    expect(errorsFor({ accountId: "", categoryId: "" })).toEqual({
      accountId: ["Choose an account."],
      categoryId: ["Choose a category."],
    });
  });

  it("rejects nonexistent accounts and categories", () => {
    expect(errorsFor({ accountId: "ghost" })).toEqual({ accountId: ["Choose an existing account."] });
    expect(errorsFor({ categoryId: "ghost" })).toEqual({ categoryId: ["Choose an existing category."] });
  });

  it("rejects an archived account", () => {
    expect(errorsFor({ accountId: "old" })).toEqual({ accountId: ["Old Card is archived."] });
    expect(errorsFor({ type: "transfer", accountId: "bank", destinationAccountId: "old" })).toEqual({
      destinationAccountId: ["Old Card is archived."],
    });
  });

  it("rejects a category that doesn't match the type", () => {
    expect(errorsFor({ categoryId: "salary" })).toEqual({
      categoryId: ["Salary is an income category and can't be used for expense."],
    });
    expect(errorsFor({ type: "income", categoryId: "food" }).categoryId).toHaveLength(1);
  });

  it("rejects a transfer between the same account or without a destination", () => {
    expect(errorsFor({ type: "transfer", accountId: "bank", destinationAccountId: "bank" })).toEqual({
      destinationAccountId: ["Transfer source and destination must be different accounts."],
    });
    expect(errorsFor({ type: "transfer", accountId: "bank" })).toEqual({
      destinationAccountId: ["Choose the destination account."],
    });
  });

  it("reports several problems at once", () => {
    expect(Object.keys(errorsFor({ amount: "", description: "", accountId: "" })).sort()).toEqual([
      "accountId",
      "amount",
      "description",
    ]);
  });
});

describe("form values", () => {
  it("defaults to an empty expense dated today", () => {
    expect(getEmptyFormValues("2026-11-02")).toMatchObject({ type: "expense", date: "2026-11-02", amount: "" });
  });

  it("round-trips an existing transaction through the form", () => {
    const transfer = { id: "t1", type: "transfer", amount: 300_000, date: "2026-03-01", description: "ATM", accountId: "bank", destinationAccountId: "wallet" } as const;
    const values = getFormValuesFromTransaction(transfer);
    expect(values).toEqual({
      type: "transfer",
      date: "2026-03-01",
      amount: "3000.00",
      description: "ATM",
      accountId: "bank",
      destinationAccountId: "wallet",
      categoryId: "",
    });
    const { id, ...input } = transfer;
    expect(id).toBe("t1");
    expect(schema.parse(values)).toEqual(input);
  });
});
