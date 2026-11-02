import { describe, expect, it } from "vitest";

import {
  countAccountTransactions,
  createAccountFormSchema,
  createAccountUpdateSchema,
  getAccountLabel,
  getSelectableAccounts,
  validateAccountName,
} from "@/lib/finance/accounts";
import type { Account, Transaction } from "@/types/finance";

const accounts: Account[] = [
  { id: "bank", name: "BPI Savings", type: "bank", openingBalance: 0, openingDate: "2026-01-01", isActive: true },
  { id: "gcash", name: "GCash", type: "e_wallet", openingBalance: 0, openingDate: "2026-01-01", isActive: true },
  { id: "old", name: "Old Card", type: "bank", openingBalance: 0, openingDate: "2026-01-01", isActive: false },
];

describe("validateAccountName", () => {
  it("accepts a new unique name", () => {
    expect(validateAccountName("Maya", accounts)).toBeNull();
  });

  it("rejects empty, whitespace-only, and too-long names", () => {
    expect(validateAccountName("", accounts)).toBe("Enter an account name.");
    expect(validateAccountName("   ", accounts)).toBe("Enter an account name.");
    expect(validateAccountName("x".repeat(60), accounts)).toBeNull();
    expect(validateAccountName("x".repeat(61), accounts)).toBe("Use 60 characters or fewer.");
  });

  it("rejects duplicates case-insensitively after trimming, including archived accounts", () => {
    expect(validateAccountName("  gcash ", accounts)).toBe("An account named “GCash” already exists.");
    expect(validateAccountName("OLD CARD", accounts)).toBe("An archived account named “Old Card” already exists. Restore it instead.");
  });

  it("ignores the account being edited", () => {
    expect(validateAccountName("gcash", accounts, "gcash")).toBeNull();
  });
});

describe("createAccountFormSchema", () => {
  const schema = createAccountFormSchema(accounts);
  const base = { name: " Maya ", type: "e_wallet", openingBalance: "1,500.25", openingDate: "2026-03-01" } as const;
  const errors = (values: Partial<typeof base> | Record<string, string>) => {
    const result = schema.safeParse({ ...base, ...values });
    return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
  };

  it("converts the opening balance to centavos and trims the name", () => {
    expect(schema.parse(base)).toEqual({ name: "Maya", type: "e_wallet", openingBalance: 150_025, openingDate: "2026-03-01" });
  });

  it("allows a zero opening balance", () => {
    expect(schema.parse({ ...base, openingBalance: "0" }).openingBalance).toBe(0);
  });

  it.each([
    ["-100", "Amount can't be negative."],
    ["10.555", "Use at most two decimal places."],
    ["abc", "Enter a valid amount, like 1250 or 1,250.50."],
    ["", "Enter an amount."],
  ])("rejects opening balance %j", (openingBalance, message) => {
    expect(errors({ openingBalance })).toEqual({ openingBalance: message });
  });

  it.each(["", "2026-02-30", "2026-13-01", "03/01/2026"])("rejects opening date %j", (openingDate) => {
    expect(errors({ openingDate })).toEqual({ openingDate: "Enter a valid date." });
  });

  it("rejects duplicate names", () => {
    expect(errors({ name: "bpi savings" })).toEqual({ name: "An account named “BPI Savings” already exists." });
  });
});

describe("createAccountUpdateSchema", () => {
  it("returns only the name and type", () => {
    const schema = createAccountUpdateSchema(accounts, "gcash");
    expect(schema.parse({ name: " GCash Wallet ", type: "e_wallet", openingBalance: "99", openingDate: "2020-01-01" })).toEqual({
      name: "GCash Wallet",
      type: "e_wallet",
    });
  });

  it("rejects another account's name", () => {
    const result = createAccountUpdateSchema(accounts, "gcash").safeParse({ name: "BPI SAVINGS", type: "bank", openingBalance: "0.00", openingDate: "2026-01-01" });
    expect(result.error?.issues.map((i) => i.message)).toEqual(["An account named “BPI Savings” already exists."]);
  });
});

describe("getSelectableAccounts", () => {
  const original: Transaction = { id: "t", type: "transfer", amount: 1, date: "2026-01-02", description: "", accountId: "bank", destinationAccountId: "old" };

  it("offers only active accounts for new transactions", () => {
    expect(getSelectableAccounts(accounts).map((a) => a.id)).toEqual(["bank", "gcash"]);
    expect(getSelectableAccounts(accounts, null).map((a) => a.id)).toEqual(["bank", "gcash"]);
  });

  it("keeps archived accounts the edited transaction already uses", () => {
    expect(getSelectableAccounts(accounts, original).map((a) => a.id)).toEqual(["bank", "gcash", "old"]);
  });

  it("labels archived accounts", () => {
    expect(getAccountLabel(accounts[2])).toBe("Old Card (archived)");
    expect(getAccountLabel(accounts[0])).toBe("BPI Savings");
  });
});

describe("countAccountTransactions", () => {
  it("counts transactions where the account is the source or destination", () => {
    const transactions: Transaction[] = [
      { id: "1", type: "expense", amount: 1, date: "2026-01-02", description: "", accountId: "bank", categoryId: "food" },
      { id: "2", type: "transfer", amount: 1, date: "2026-01-02", description: "", accountId: "gcash", destinationAccountId: "bank" },
      { id: "3", type: "expense", amount: 1, date: "2026-01-02", description: "", accountId: "gcash", categoryId: "food" },
    ];
    expect(countAccountTransactions("bank", transactions)).toBe(2);
    expect(countAccountTransactions("old", transactions)).toBe(0);
  });
});
