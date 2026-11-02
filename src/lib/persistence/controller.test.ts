import { beforeEach, describe, expect, it } from "vitest";

import { calculateTotalAccountBalance } from "@/lib/finance/calculations";
import { createPersistenceController, type PersistenceController } from "@/lib/persistence/controller";
import { createSnapshot, STORAGE_KEY, type FinancialData } from "@/lib/persistence/snapshot";
import type { StorageLike } from "@/lib/persistence/storage";
import { createAccountStore } from "@/stores/account-store";
import { createCategoryStore } from "@/stores/category-store";
import { createTransactionStore } from "@/stores/transaction-store";

/** In-memory localStorage stand-in that can be told to fail. */
class FakeStorage implements StorageLike {
  values = new Map<string, string>();
  writes = 0;
  failGet: Error | null = null;
  failSet: Error | null = null;
  getItem(key: string) {
    if (this.failGet) throw this.failGet;
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failSet) throw this.failSet;
    this.writes += 1;
    this.values.set(key, value);
  }
  stored() {
    const raw = this.values.get(STORAGE_KEY);
    return raw === undefined ? undefined : JSON.parse(raw);
  }
}

const seed: FinancialData = {
  accounts: [
    { id: "bank", name: "Bank", type: "bank", openingBalance: 1_000_000, openingDate: "2026-01-01", isActive: true },
    { id: "wallet", name: "Wallet", type: "cash", openingBalance: 50_000, openingDate: "2026-01-01", isActive: true },
  ],
  categories: [
    { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true },
    { id: "food", name: "Food", type: "expense", icon: "utensils", color: "orange", isActive: true },
  ],
  transactions: [
    { id: "txn-001", type: "income", amount: 2_000_000, date: "2026-01-15", description: "Salary", accountId: "bank", categoryId: "salary" },
    { id: "txn-002", type: "transfer", amount: 300_000, date: "2026-01-31", description: "ATM", accountId: "bank", destinationAccountId: "wallet" },
  ],
};

/** A different, valid dataset (e.g. a backup from elsewhere). */
const other: FinancialData = {
  accounts: [{ id: "gcash", name: "GCash", type: "e_wallet", openingBalance: 10_000, openingDate: "2026-03-01", isActive: false }],
  categories: [{ id: "fun", name: "Fun", type: "expense", icon: "clapperboard", color: "violet", isActive: false }],
  transactions: [
    { id: "txn-009", type: "expense", amount: 2_500, date: "2026-03-02", description: "Movie", accountId: "gcash", categoryId: "fun" },
  ],
};

let revisionCounter = 0;
function setup(storage: StorageLike | null, options: { unavailableMessage?: string } = {}) {
  const accounts = createAccountStore([]);
  const categories = createCategoryStore([]);
  const transactions = createTransactionStore([], {
    getAccounts: () => accounts.getState().accounts,
    getCategories: () => categories.getState().categories,
  });
  const controller = createPersistenceController({
    stores: { accounts, categories, transactions },
    storage,
    seed,
    now: () => new Date("2026-11-02T03:00:00.000Z"),
    createRevision: () => `rev-${++revisionCounter}`,
    ...options,
  });
  controller.connect();
  return { controller, accounts, categories, transactions };
}

function saveRaw(storage: FakeStorage, data: FinancialData, revision = "rev-saved") {
  storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot(data, { revision, now: new Date("2026-10-01T00:00:00Z") })));
}

const status = (c: PersistenceController) => c.state.getState();

let storage: FakeStorage;
beforeEach(() => {
  storage = new FakeStorage();
  revisionCounter = 0;
});

describe("initialization", () => {
  it("seeds demo data on the first visit and saves it", () => {
    const { controller, transactions } = setup(storage);
    expect(status(controller).status).toBe("loading");
    controller.initialize();
    expect(status(controller)).toMatchObject({ status: "ready", source: "seeded", saveState: { kind: "saved" } });
    expect(transactions.getState().transactions).toEqual(seed.transactions);
    expect(storage.stored()).toMatchObject({ schemaVersion: 1, revision: "rev-1", data: seed });
    expect(storage.writes).toBe(1);
  });

  it("restores saved data on later visits without seeding again", () => {
    saveRaw(storage, other);
    const { controller, accounts, transactions } = setup(storage);
    controller.initialize();
    expect(status(controller)).toMatchObject({ status: "ready", source: "saved" });
    expect(accounts.getState().accounts).toEqual(other.accounts);
    expect(transactions.getState().transactions).toEqual(other.transactions);
    expect(storage.writes).toBe(0);
  });

  it("never seeds twice, across repeated initialize calls or a second visit", () => {
    const first = setup(storage);
    first.controller.initialize();
    first.controller.initialize();
    expect(storage.writes).toBe(1);
    const second = setup(storage);
    second.controller.initialize();
    expect(second.controller.state.getState().source).toBe("saved");
    expect(storage.writes).toBe(1);
  });

  it("keeps an intentionally empty dataset empty", () => {
    saveRaw(storage, { accounts: [], categories: [], transactions: [] });
    const { controller, accounts } = setup(storage);
    controller.initialize();
    expect(status(controller).status).toBe("ready");
    expect(accounts.getState().accounts).toEqual([]);
    expect(storage.writes).toBe(0);
  });

  it("restores the same balances after a reload", () => {
    const first = setup(storage);
    first.controller.initialize();
    const before = calculateTotalAccountBalance(first.accounts.getState().accounts, first.transactions.getState().transactions, "2026-11-02");
    const second = setup(storage);
    second.controller.initialize();
    expect(calculateTotalAccountBalance(second.accounts.getState().accounts, second.transactions.getState().transactions, "2026-11-02")).toBe(before);
  });
});

describe("load failures keep the stored value untouched", () => {
  const expectLoadError = (kind: string) => {
    const raw = storage.values.get(STORAGE_KEY);
    const { controller, transactions } = setup(storage);
    controller.initialize();
    expect(status(controller)).toMatchObject({ status: "load-error", loadError: { kind, raw } });
    expect(transactions.getState().transactions).toEqual([]);
    expect(storage.values.get(STORAGE_KEY)).toBe(raw);
    expect(storage.writes).toBe(0);
    return controller;
  };

  it("invalid JSON", () => {
    storage.values.set(STORAGE_KEY, "{not json");
    expectLoadError("invalid-json");
  });

  it("unsupported schema version", () => {
    storage.values.set(STORAGE_KEY, JSON.stringify({ ...createSnapshot(seed), schemaVersion: 2 }));
    const controller = expectLoadError("unsupported-version");
    expect(status(controller).loadError?.message).toContain("version 2");
  });

  it("invalid amounts are rejected, not coerced", () => {
    const bad = { ...seed, transactions: [{ ...seed.transactions[0], amount: 12.5 }] };
    storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot(bad as FinancialData)));
    const controller = expectLoadError("invalid-data");
    expect(status(controller).loadError?.problems.join(" ")).toContain("data.transactions.0.amount");
  });

  it("broken account and category references", () => {
    const bad = {
      ...seed,
      transactions: [
        { ...seed.transactions[0], categoryId: "ghost" },
        { ...seed.transactions[1], destinationAccountId: "nowhere" },
      ],
    };
    storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot(bad as FinancialData)));
    const controller = expectLoadError("invalid-data");
    expect(status(controller).loadError?.problems).toEqual([
      "Transaction “txn-001”: Choose an existing category.",
      "Transaction “txn-002”: Choose an existing account.",
    ]);
  });

  it("does not save changes while in the error state", () => {
    storage.values.set(STORAGE_KEY, "{not json");
    const { controller, accounts } = setup(storage);
    controller.initialize();
    accounts.getState().addAccount({ name: "New", type: "cash", openingBalance: 0, openingDate: "2026-01-01" });
    expect(storage.values.get(STORAGE_KEY)).toBe("{not json");
  });

  it("can overwrite unreadable data only when explicitly asked", () => {
    storage.values.set(STORAGE_KEY, "{not json");
    const { controller, accounts } = setup(storage);
    controller.initialize();
    expect(controller.replaceUnreadableData("empty")).toEqual({ ok: true });
    expect(status(controller)).toMatchObject({ status: "ready", loadError: null });
    expect(storage.stored().data).toEqual({ accounts: [], categories: [], transactions: [] });
    expect(accounts.getState().accounts).toEqual([]);
  });
});

describe("storage that can't be used", () => {
  it("runs in memory with demo data when storage is unavailable", () => {
    const { controller, transactions } = setup(null, { unavailableMessage: "No storage." });
    controller.initialize();
    expect(status(controller)).toMatchObject({ status: "ready", source: "memory", saveState: { kind: "unavailable", message: "No storage." } });
    expect(transactions.getState().transactions).toEqual(seed.transactions);
  });

  it("treats access denied on read as unavailable and never writes", () => {
    storage.failGet = new DOMException("blocked", "SecurityError");
    const { controller, accounts } = setup(storage);
    controller.initialize();
    expect(status(controller).saveState).toMatchObject({ kind: "unavailable" });
    storage.failGet = null;
    accounts.getState().addAccount({ name: "New", type: "cash", openingBalance: 0, openingDate: "2026-01-01" });
    expect(storage.writes).toBe(0);
  });

  it("reports quota errors and retries on the next change", () => {
    const { controller, accounts } = setup(storage);
    controller.initialize();
    storage.failSet = new DOMException("full", "QuotaExceededError");
    accounts.getState().addAccount({ name: "New", type: "cash", openingBalance: 0, openingDate: "2026-01-01" });
    expect(status(controller).saveState).toEqual({ kind: "failed", reason: "quota", message: "Browser storage is full, so changes can't be saved." });
    expect(storage.stored().data.accounts).toHaveLength(2);
    // In memory the account exists, but it's not reported as saved.
    expect(accounts.getState().accounts).toHaveLength(3);
    storage.failSet = null;
    accounts.getState().addAccount({ name: "Another", type: "cash", openingBalance: 0, openingDate: "2026-01-01" });
    expect(status(controller).saveState.kind).toBe("saved");
    expect(storage.stored().data.accounts).toHaveLength(4);
  });

  it("reports access denied on write", () => {
    const { controller, accounts } = setup(storage);
    controller.initialize();
    storage.failSet = new DOMException("blocked", "SecurityError");
    accounts.getState().archiveAccount("bank");
    expect(status(controller).saveState).toMatchObject({ kind: "failed", reason: "denied" });
  });
});

describe("every successful mutation is saved", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup(storage);
    ctx.controller.initialize();
  });
  const saved = () => storage.stored().data as FinancialData;

  it("transactions: add, edit, delete", () => {
    const added = ctx.transactions.getState().addTransaction({ type: "expense", amount: 2_550, date: "2026-02-01", description: "Lunch", accountId: "wallet", categoryId: "food" });
    expect(added.ok).toBe(true);
    expect(saved().transactions.at(-1)).toMatchObject({ id: "txn-003", amount: 2_550 });
    ctx.transactions.getState().updateTransaction("txn-003", { type: "expense", amount: 3_000, date: "2026-02-01", description: "Lunch", accountId: "wallet", categoryId: "food" });
    expect(saved().transactions.at(-1)).toMatchObject({ amount: 3_000 });
    ctx.transactions.getState().deleteTransaction("txn-003");
    expect(saved().transactions.map((t) => t.id)).toEqual(["txn-001", "txn-002"]);
  });

  it("accounts: add, edit, archive, restore", () => {
    ctx.accounts.getState().addAccount({ name: "Maya", type: "e_wallet", openingBalance: 500, openingDate: "2026-02-01" });
    expect(saved().accounts.at(-1)).toMatchObject({ id: "acct-001", name: "Maya" });
    ctx.accounts.getState().updateAccount("acct-001", { name: "Maya Wallet", type: "e_wallet" });
    expect(saved().accounts.at(-1)?.name).toBe("Maya Wallet");
    ctx.accounts.getState().archiveAccount("acct-001");
    expect(saved().accounts.at(-1)?.isActive).toBe(false);
    ctx.accounts.getState().restoreAccount("acct-001");
    expect(saved().accounts.at(-1)?.isActive).toBe(true);
  });

  it("categories: add, edit, archive, restore", () => {
    ctx.categories.getState().addCategory({ name: "Pets", type: "expense", icon: "paw-print", color: "amber" });
    expect(saved().categories.at(-1)).toMatchObject({ id: "cat-001", name: "Pets" });
    ctx.categories.getState().updateCategory("cat-001", { name: "Pet care", icon: "paw-print", color: "rose" });
    expect(saved().categories.at(-1)).toMatchObject({ name: "Pet care", color: "rose" });
    ctx.categories.getState().archiveCategory("cat-001");
    expect(saved().categories.at(-1)?.isActive).toBe(false);
    ctx.categories.getState().restoreCategory("cat-001");
    expect(saved().categories.at(-1)?.isActive).toBe(true);
  });

  it("rejected mutations don't write", () => {
    const writes = storage.writes;
    ctx.accounts.getState().addAccount({ name: "bank", type: "bank", openingBalance: 0, openingDate: "2026-01-01" });
    ctx.transactions.getState().addTransaction({ type: "expense", amount: 1, date: "2026-02-01", description: "x", accountId: "ghost", categoryId: "food" });
    ctx.transactions.getState().deleteTransaction("missing");
    expect(storage.writes).toBe(writes);
  });

  it("writes once per change, each a complete valid snapshot with a new revision", () => {
    const writes = storage.writes;
    ctx.accounts.getState().archiveAccount("wallet");
    expect(storage.writes).toBe(writes + 1);
    const snapshot = storage.stored();
    expect(snapshot.revision).not.toBe("rev-1");
    expect(Object.keys(snapshot.data)).toEqual(["accounts", "categories", "transactions"]);
    expect(snapshot.data).not.toHaveProperty("balances");
  });

  it("reloading after changes restores exactly what was saved", () => {
    ctx.categories.getState().archiveCategory("food");
    ctx.accounts.getState().updateAccount("bank", { name: "BPI", type: "bank" });
    const next = setup(storage);
    next.controller.initialize();
    expect(next.accounts.getState().accounts[0].name).toBe("BPI");
    expect(next.categories.getState().categories[1].isActive).toBe(false);
  });
});

describe("backup and restore", () => {
  it("exports a complete versioned snapshot of current data", () => {
    const { controller, accounts } = setup(storage);
    controller.initialize();
    accounts.getState().archiveAccount("wallet");
    const backup = controller.exportSnapshot();
    expect(backup).toMatchObject({ schemaVersion: 1, updatedAt: "2026-11-02T03:00:00.000Z" });
    expect(backup.data.accounts[1].isActive).toBe(false);
    expect(backup.data).toEqual(controller.getCurrentData());
  });

  it("restores a valid backup, replacing everything", () => {
    const { controller, accounts, categories, transactions } = setup(storage);
    controller.initialize();
    expect(controller.restore(createSnapshot(other))).toEqual({ ok: true });
    expect(accounts.getState().accounts).toEqual(other.accounts);
    expect(categories.getState().categories).toEqual(other.categories);
    expect(transactions.getState().transactions).toEqual(other.transactions);
    expect(storage.stored().data).toEqual(other);
  });

  it("is atomic: if saving fails, neither storage nor the stores change", () => {
    const { controller, transactions } = setup(storage);
    controller.initialize();
    const before = storage.values.get(STORAGE_KEY);
    storage.failSet = new DOMException("full", "QuotaExceededError");
    expect(controller.restore(createSnapshot(other))).toEqual({ ok: false, message: "Browser storage is full, so changes can't be saved." });
    expect(transactions.getState().transactions).toEqual(seed.transactions);
    expect(storage.values.get(STORAGE_KEY)).toBe(before);
  });

  it("clears all data to an empty snapshot that stays empty", () => {
    const first = setup(storage);
    first.controller.initialize();
    expect(first.controller.clearAll()).toEqual({ ok: true });
    expect(first.transactions.getState().transactions).toEqual([]);
    const next = setup(storage);
    next.controller.initialize();
    expect(next.accounts.getState().accounts).toEqual([]);
    expect(next.controller.state.getState().source).toBe("saved");
  });
});

describe("multiple tabs", () => {
  it("detects another tab's write before saving and blocks further writes", () => {
    const tabA = setup(storage);
    tabA.controller.initialize();
    const tabB = setup(storage);
    tabB.controller.initialize();

    tabB.accounts.getState().addAccount({ name: "From B", type: "cash", openingBalance: 0, openingDate: "2026-01-01" });
    const afterB = storage.values.get(STORAGE_KEY);

    // Tab A is now stale: its change must not overwrite B's.
    tabA.accounts.getState().addAccount({ name: "From A", type: "cash", openingBalance: 0, openingDate: "2026-01-01" });
    expect(storage.values.get(STORAGE_KEY)).toBe(afterB);
    expect(status(tabA.controller).saveState.kind).toBe("conflict");
    // A's edit is still in memory, so it can be exported before reloading.
    expect(tabA.controller.exportSnapshot().data.accounts.map((a) => a.name)).toContain("From A");

    tabA.accounts.getState().archiveAccount("bank");
    expect(storage.values.get(STORAGE_KEY)).toBe(afterB);
  });

  it("detects changes announced by the storage event", () => {
    const tab = setup(storage);
    tab.controller.initialize();
    const own = storage.values.get(STORAGE_KEY) ?? null;
    tab.controller.handleExternalChange(own);
    expect(status(tab.controller).saveState.kind).toBe("saved");
    tab.controller.handleExternalChange(JSON.stringify({ ...createSnapshot(other), revision: "elsewhere" }));
    expect(status(tab.controller).saveState.kind).toBe("conflict");
  });

  it("treats data cleared in another tab as a conflict", () => {
    const tab = setup(storage);
    tab.controller.initialize();
    storage.values.delete(STORAGE_KEY);
    tab.accounts.getState().archiveAccount("bank");
    expect(status(tab.controller).saveState.kind).toBe("conflict");
    expect(storage.values.has(STORAGE_KEY)).toBe(false);
  });

  it("reloading resolves the conflict with the newer data", () => {
    const tabA = setup(storage);
    tabA.controller.initialize();
    const tabB = setup(storage);
    tabB.controller.initialize();
    tabB.accounts.getState().addAccount({ name: "From B", type: "cash", openingBalance: 0, openingDate: "2026-01-01" });
    tabA.controller.handleExternalChange(storage.values.get(STORAGE_KEY) ?? null);
    tabA.controller.reload();
    expect(status(tabA.controller).saveState.kind).toBe("saved");
    expect(tabA.accounts.getState().accounts.map((a) => a.name)).toContain("From B");
    tabA.accounts.getState().archiveAccount("bank");
    expect(storage.stored().data.accounts.find((a: { id: string }) => a.id === "bank").isActive).toBe(false);
  });

  it("refuses restore and clear while in conflict", () => {
    const tabA = setup(storage);
    tabA.controller.initialize();
    tabA.controller.handleExternalChange(JSON.stringify({ revision: "elsewhere" }));
    storage.values.set(STORAGE_KEY, JSON.stringify({ ...createSnapshot(other), revision: "elsewhere" }));
    expect(tabA.controller.clearAll().ok).toBe(false);
    expect(tabA.controller.restore(createSnapshot(seed)).ok).toBe(false);
    expect(storage.stored().revision).toBe("elsewhere");
  });
});
