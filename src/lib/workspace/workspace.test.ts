import { beforeEach, describe, expect, it } from "vitest";

import { defaultCategories } from "@/data/default-categories";
import { mockAccounts, mockTransactions } from "@/data/mock-finance";
import { calculateTotalAccountBalance } from "@/lib/finance/calculations";
import { getMonthlyReport } from "@/lib/finance/reports";
import { createPersistenceController } from "@/lib/persistence/controller";
import { createSnapshot, STORAGE_KEY, type FinancialData } from "@/lib/persistence/snapshot";
import type { StorageLike } from "@/lib/persistence/storage";
import { createProfileController } from "@/lib/profile/controller";
import { PROFILE_STORAGE_KEY, type LocalProfile } from "@/lib/profile/profile";
import {
  clearDemoData,
  completeOnboarding,
  demoData,
  getOnboardingPlan,
  markPersonal,
  personalStarterData,
} from "@/lib/workspace/workspace";
import { createAccountStore } from "@/stores/account-store";
import { createCategoryStore } from "@/stores/category-store";
import { createTransactionStore } from "@/stores/transaction-store";

class FakeStorage implements StorageLike {
  values = new Map<string, string>();
  failSet: ((key: string) => boolean) | null = null;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failSet?.(key)) throw new DOMException("full", "QuotaExceededError");
    this.values.set(key, value);
  }
  finance(): FinancialData | null {
    const raw = this.values.get(STORAGE_KEY);
    return raw ? JSON.parse(raw).data : null;
  }
  profile(): LocalProfile | null {
    const raw = this.values.get(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}

const NOW = new Date("2026-11-02T01:00:00.000Z");

/** A browser session: three stores, both controllers, loaded from `storage`. */
function session(storage: StorageLike | null) {
  const accounts = createAccountStore([]);
  const categories = createCategoryStore([]);
  const transactions = createTransactionStore([], {
    getAccounts: () => accounts.getState().accounts,
    getCategories: () => categories.getState().categories,
  });
  let revision = 0;
  const finance = createPersistenceController({
    stores: { accounts, categories, transactions },
    storage,
    seed: demoData(),
    createRevision: () => `rev-${++revision}-${Math.random()}`,
  });
  const profile = createProfileController({ storage });
  finance.connect();
  finance.initialize();
  profile.initialize();
  const plan = () => getOnboardingPlan(finance.state.getState(), profile.state.getState());
  return { accounts, categories, transactions, finance, profile, plan, controllers: { finance, profile, now: () => NOW } };
}

const userData: FinancialData = {
  accounts: [{ id: "acct-001", name: "My Bank", type: "bank", openingBalance: 500_000, openingDate: "2026-01-01", isActive: true }],
  categories: [{ id: "cat-001", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true }],
  transactions: [
    { id: "txn-001", type: "income", amount: 2_000_000, date: "2026-01-15", description: "Pay", accountId: "acct-001", categoryId: "cat-001" },
  ],
};

const choices = { fullName: "  Ana Reyes ", workspaceMode: "personal" as const, privacyAcknowledged: true };

let storage: FakeStorage;
beforeEach(() => {
  storage = new FakeStorage();
});

describe("getOnboardingPlan", () => {
  const ready = { status: "ready" as const, profile: null };
  const someone = { status: "ready" as const, profile: {} as LocalProfile };

  it("waits while either side is loading (no flash for returning visitors)", () => {
    expect(getOnboardingPlan({ status: "loading", workspace: "missing" }, ready)).toBe("loading");
    expect(getOnboardingPlan({ status: "ready", workspace: "present" }, { status: "loading", profile: null })).toBe("loading");
  });

  it("never onboards over unreadable financial data", () => {
    expect(getOnboardingPlan({ status: "load-error", workspace: "present" }, ready)).toBe("blocked");
  });

  it("distinguishes new users, existing data, returning users, and a missing workspace", () => {
    expect(getOnboardingPlan({ status: "ready", workspace: "missing" }, ready)).toBe("new-user");
    expect(getOnboardingPlan({ status: "ready", workspace: "present" }, ready)).toBe("existing-data");
    expect(getOnboardingPlan({ status: "ready", workspace: "present" }, someone)).toBe("none");
    expect(getOnboardingPlan({ status: "ready", workspace: "missing" }, someone)).toBe("missing-workspace");
  });
});

describe("first-time onboarding", () => {
  it("detects a first-time visitor and writes nothing before onboarding finishes", () => {
    const s = session(storage);
    expect(s.plan()).toBe("new-user");
    expect(storage.values.size).toBe(0);
  });

  it("requires the privacy acknowledgement", () => {
    const s = session(storage);
    expect(completeOnboarding(s.controllers, { ...choices, privacyAcknowledged: false }).ok).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("starts a personal workspace with starter categories only: no accounts, no transactions", () => {
    const s = session(storage);
    expect(completeOnboarding(s.controllers, choices)).toEqual({ ok: true });
    expect(storage.finance()).toEqual({ accounts: [], categories: defaultCategories, transactions: [] });
    expect(storage.profile()).toEqual({
      profileSchemaVersion: 1,
      fullName: "Ana Reyes",
      workspaceMode: "personal",
      privacyAcknowledgedAt: NOW.toISOString(),
      onboardingCompletedAt: NOW.toISOString(),
    });
    expect(s.plan()).toBe("none");
    expect(s.transactions.getState().transactions).toEqual([]);
  });

  it("starts a demo workspace with the sample dataset, marked as demo", () => {
    const s = session(storage);
    expect(completeOnboarding(s.controllers, { ...choices, workspaceMode: "demo" })).toEqual({ ok: true });
    expect(storage.finance()?.transactions).toHaveLength(mockTransactions.length);
    expect(storage.profile()?.workspaceMode).toBe("demo");
  });

  it("is remembered: the next visit is a returning user and nothing is seeded again", () => {
    const first = session(storage);
    completeOnboarding(first.controllers, { ...choices, workspaceMode: "demo" });
    const revision = storage.values.get(STORAGE_KEY);
    const next = session(storage);
    expect(next.plan()).toBe("none");
    expect(next.profile.state.getState().profile?.fullName).toBe("Ana Reyes");
    expect(storage.values.get(STORAGE_KEY)).toBe(revision);
  });

  it("can be retried after the profile save fails, without creating the workspace twice", () => {
    const s = session(storage);
    storage.failSet = (key) => key === PROFILE_STORAGE_KEY;
    const failed = completeOnboarding(s.controllers, choices);
    expect(failed.ok).toBe(false);
    expect(storage.finance()?.categories).toEqual(defaultCategories); // workspace was created
    expect(s.plan()).toBe("existing-data"); // the gate keeps onboarding open
    storage.failSet = null;
    expect(completeOnboarding(s.controllers, choices)).toEqual({ ok: true });
    expect(storage.profile()?.fullName).toBe("Ana Reyes");
  });

  it("works in memory when storage is unavailable", () => {
    const s = session(null);
    expect(s.plan()).toBe("new-user");
    expect(completeOnboarding(s.controllers, choices)).toEqual({ ok: true });
    expect(s.plan()).toBe("none");
    expect(s.categories.getState().categories).toEqual(defaultCategories);
  });
});

describe("existing users (data saved before SW-010)", () => {
  it("keeps every saved record and only adds a profile, treating the data as personal", () => {
    storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot(userData, { revision: "old" })));
    const s = session(storage);
    expect(s.plan()).toBe("existing-data");
    // Even if a workspace choice were passed, saved records are never replaced.
    expect(completeOnboarding(s.controllers, { ...choices, workspaceMode: "demo" })).toEqual({ ok: true });
    expect(storage.finance()).toEqual(userData);
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!).revision).toBe("old"); // not even rewritten
    expect(storage.profile()?.workspaceMode).toBe("personal");
  });

  it("starts fresh only when explicitly chosen: saved records are replaced by a personal starter workspace", () => {
    storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot(demoData(), { revision: "seeded-by-sw-008a" })));
    const s = session(storage);
    expect(completeOnboarding(s.controllers, { ...choices, existingData: "start-fresh" })).toEqual({ ok: true });
    expect(storage.finance()).toEqual(personalStarterData());
    expect(s.accounts.getState().accounts).toEqual([]);
    expect(storage.profile()).toMatchObject({ fullName: "Ana Reyes", workspaceMode: "personal" });
    // Refresh: still the fresh workspace, onboarding done.
    const next = session(storage);
    expect(next.plan()).toBe("none");
    expect(next.transactions.getState().transactions).toEqual([]);
  });

  it("changes nothing if starting fresh can't be saved", () => {
    storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot(userData, { revision: "old" })));
    const s = session(storage);
    storage.failSet = (key) => key === STORAGE_KEY;
    const result = completeOnboarding(s.controllers, { ...choices, existingData: "start-fresh" });
    expect(result.ok).toBe(false);
    expect(storage.finance()).toEqual(userData);
    expect(storage.profile()).toBeNull();
    expect(s.plan()).toBe("existing-data");
  });

  it("doesn't assume records are demo data just because they match the sample dataset", () => {
    storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot(demoData(), { revision: "seeded-by-sw-008a" })));
    const s = session(storage);
    completeOnboarding(s.controllers, choices);
    expect(storage.finance()?.accounts).toHaveLength(mockAccounts.length);
    expect(storage.profile()?.workspaceMode).toBe("personal");
  });

  it("preserves an intentionally empty snapshot", () => {
    storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot({ accounts: [], categories: [], transactions: [] })));
    const s = session(storage);
    expect(s.plan()).toBe("existing-data");
    completeOnboarding(s.controllers, choices);
    expect(storage.finance()).toEqual({ accounts: [], categories: [], transactions: [] });
  });

  it("never onboards over a corrupted or unsupported snapshot", () => {
    storage.values.set(STORAGE_KEY, "{corrupt");
    expect(session(storage).plan()).toBe("blocked");
    storage.values.set(STORAGE_KEY, JSON.stringify({ ...createSnapshot(userData), schemaVersion: 9 }));
    const s = session(storage);
    expect(s.plan()).toBe("blocked");
    expect(completeOnboarding(s.controllers, choices).ok).toBe(false);
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!).schemaVersion).toBe(9);
  });
});

describe("missing workspace with an existing profile", () => {
  it("asks for a workspace again and keeps the name and acknowledgement", () => {
    const first = session(storage);
    completeOnboarding(first.controllers, choices);
    const acknowledged = storage.profile()?.privacyAcknowledgedAt;
    storage.values.delete(STORAGE_KEY);
    const s = session(storage);
    expect(s.plan()).toBe("missing-workspace");
    expect(completeOnboarding(s.controllers, { ...choices, fullName: "", workspaceMode: "demo" })).toEqual({ ok: true });
    expect(storage.profile()).toMatchObject({ fullName: "Ana Reyes", workspaceMode: "demo", privacyAcknowledgedAt: acknowledged });
  });
});

describe("clearing demo data", () => {
  function demoSession() {
    const s = session(storage);
    completeOnboarding(s.controllers, { ...choices, workspaceMode: "demo" });
    return s;
  }

  it("replaces the whole workspace, including records added while exploring, and switches to personal", () => {
    const s = demoSession();
    s.accounts.getState().addAccount({ name: "Added while exploring", type: "cash", openingBalance: 0, openingDate: "2026-07-01" });
    expect(clearDemoData(s.controllers)).toEqual({ ok: true });
    expect(storage.finance()).toEqual(personalStarterData());
    expect(s.accounts.getState().accounts).toEqual([]);
    expect(storage.profile()).toMatchObject({ fullName: "Ana Reyes", workspaceMode: "personal", privacyAcknowledgedAt: NOW.toISOString() });
    expect(s.plan()).toBe("none"); // onboarding stays complete
  });

  it("stays cleared after a refresh (demo data is never re-seeded)", () => {
    const s = demoSession();
    clearDemoData(s.controllers);
    const next = session(storage);
    expect(next.plan()).toBe("none");
    expect(next.transactions.getState().transactions).toEqual([]);
    expect(next.profile.state.getState().profile?.workspaceMode).toBe("personal");
  });

  it("changes nothing if the replacement can't be saved", () => {
    const s = demoSession();
    const before = storage.values.get(STORAGE_KEY);
    storage.failSet = (key) => key === STORAGE_KEY;
    const result = clearDemoData(s.controllers);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/^Nothing was changed\./);
    expect(storage.values.get(STORAGE_KEY)).toBe(before);
    expect(s.transactions.getState().transactions).toHaveLength(mockTransactions.length);
    expect(storage.profile()?.workspaceMode).toBe("demo");
  });

  it("refuses to overwrite data another tab saved (atomic, conflict-checked)", () => {
    const s = demoSession();
    storage.values.set(STORAGE_KEY, JSON.stringify(createSnapshot(userData, { revision: "other-tab" })));
    expect(clearDemoData(s.controllers).ok).toBe(false);
    expect(storage.finance()).toEqual(userData);
  });
});

describe("financial integrity across workspace changes", () => {
  it("keeps demo balances, transfers, and reports correct", () => {
    const s = session(storage);
    completeOnboarding(s.controllers, { ...choices, workspaceMode: "demo" });
    const txns = s.transactions.getState().transactions;
    const accts = s.accounts.getState().accounts;
    const withoutTransfers = txns.filter((t) => t.type !== "transfer");
    expect(calculateTotalAccountBalance(accts, txns, "2026-11-02")).toBe(calculateTotalAccountBalance(accts, withoutTransfers, "2026-11-02"));
    expect(getMonthlyReport(txns, "2026-10")).toMatchObject({ totalIncome: 3_850_000, totalExpenses: 1_868_960 });
  });

  it("markPersonal is a no-op without a profile", () => {
    const s = session(storage);
    expect(markPersonal(s.profile)).toEqual({ ok: true });
    expect(storage.profile()).toBeNull();
  });
});
