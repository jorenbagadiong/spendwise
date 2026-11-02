import { describe, expect, it } from "vitest";

import { mockAccounts, mockCategories, mockTransactions } from "@/data/mock-finance";
import {
  createSnapshot,
  parseSnapshot,
  readRevision,
  type FinancialData,
} from "@/lib/persistence/snapshot";

const demo: FinancialData = { accounts: mockAccounts, categories: mockCategories, transactions: mockTransactions };
const encode = (data: unknown) => JSON.stringify({ ...createSnapshot(demo, { revision: "r1" }), data });

describe("parseSnapshot", () => {
  it("accepts the demo data and round-trips it unchanged", () => {
    const result = parseSnapshot(JSON.stringify(createSnapshot(demo, { revision: "r1" })));
    expect(result.kind).toBe("valid");
    if (result.kind === "valid") expect(result.snapshot.data).toEqual(demo);
  });

  it("accepts an empty dataset", () => {
    expect(parseSnapshot(encode({ accounts: [], categories: [], transactions: [] })).kind).toBe("valid");
  });

  it("accepts archived accounts and categories that transactions still use", () => {
    const data = {
      ...demo,
      accounts: demo.accounts.map((a) => ({ ...a, isActive: false })),
      categories: demo.categories.map((c) => ({ ...c, isActive: false })),
    };
    expect(parseSnapshot(encode(data)).kind).toBe("valid");
  });

  it.each([
    ["not JSON", "{oops", "invalid-json"],
    ["a JSON array", "[]", "unsupported-version"],
    ["no version", JSON.stringify({ data: demo }), "unsupported-version"],
    ["version 2", JSON.stringify({ ...createSnapshot(demo), schemaVersion: 2 }), "unsupported-version"],
    ["version as a string", JSON.stringify({ ...createSnapshot(demo), schemaVersion: "1" }), "unsupported-version"],
  ])("rejects %s", (_, text, kind) => {
    expect(parseSnapshot(text).kind).toBe(kind);
  });

  const invalid: [string, unknown, string][] = [
    ["fractional amount", { ...demo, transactions: [{ ...demo.transactions[0], amount: 245.75 }] }, "transactions.0.amount"],
    ["amount as a string", { ...demo, transactions: [{ ...demo.transactions[0], amount: "245075" }] }, "transactions.0.amount"],
    ["zero amount", { ...demo, transactions: [{ ...demo.transactions[0], amount: 0 }] }, "transactions.0.amount"],
    ["negative opening balance", { ...demo, accounts: [{ ...demo.accounts[0], openingBalance: -1 }] }, "accounts.0.openingBalance"],
    ["impossible date", { ...demo, transactions: [{ ...demo.transactions[0], date: "2026-02-30" }] }, "transactions.0.date"],
    ["unknown transaction type", { ...demo, transactions: [{ ...demo.transactions[0], type: "refund" }] }, "transactions.0.type"],
    ["transfer with a category", { ...demo, transactions: [{ ...demo.transactions[4], categoryId: "food" }] }, "transactions.0"],
    ["unknown icon", { ...demo, categories: [{ ...demo.categories[0], icon: "rocket" }] }, "categories.0.icon"],
    ["extra field", { ...demo, accounts: [{ ...demo.accounts[0], balance: 999 }] }, "accounts.0"],
    ["blank id", { ...demo, accounts: [{ ...demo.accounts[0], id: "  " }] }, "accounts.0.id"],
  ];
  it.each(invalid)("rejects %s without repairing it", (_, data, path) => {
    const result = parseSnapshot(encode(data));
    expect(result.kind).toBe("invalid-data");
    if (result.kind === "invalid-data") expect(result.problems.join(" ")).toContain(path);
  });

  it("rejects duplicate ids and names", () => {
    const result = parseSnapshot(encode({
      ...demo,
      accounts: [...demo.accounts, { ...demo.accounts[0], name: "Copy" }, { ...demo.accounts[1], id: "other", name: "gcash" }],
      transactions: [...demo.transactions, demo.transactions[0]],
    }));
    expect(result.kind).toBe("invalid-data");
    if (result.kind === "invalid-data") {
      expect(result.problems).toEqual(expect.arrayContaining([
        "Duplicate account id “bpi-savings”.",
        "Duplicate transaction id “txn-001”.",
        "Duplicate account name “gcash”.",
      ]));
    }
  });

  it("rejects broken references, wrong category types, and dates before opening", () => {
    const result = parseSnapshot(encode({
      ...demo,
      transactions: [
        { ...demo.transactions[0], accountId: "ghost" },
        { ...demo.transactions[1], categoryId: "salary" },
        { ...demo.transactions[2], date: "2026-06-30" },
      ],
    }));
    expect(result.kind).toBe("invalid-data");
    if (result.kind === "invalid-data") {
      expect(result.problems).toEqual([
        "Transaction “txn-001”: Choose an existing account.",
        "Transaction “txn-002”: Salary is an income category and can't be used for expense.",
        "Transaction “txn-003”: Date is before BPI Savings was opened.",
      ]);
    }
  });
});

describe("readRevision", () => {
  it("reads the revision or returns null", () => {
    expect(readRevision(JSON.stringify({ revision: "abc" }))).toBe("abc");
    expect(readRevision(null)).toBeNull();
    expect(readRevision("{bad")).toBeNull();
    expect(readRevision("{}")).toBeNull();
  });
});
