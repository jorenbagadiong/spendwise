import path from "node:path";

import { expect, type Page } from "@playwright/test";

import { createSnapshot, STORAGE_KEY, type FinancialData } from "@/lib/persistence/snapshot";
import { PROFILE_STORAGE_KEY, type LocalProfile } from "@/lib/profile/profile";

export { PROFILE_STORAGE_KEY, STORAGE_KEY };

/** A finished onboarding (SW-010), so tests of other pages skip it. */
export const testProfile: LocalProfile = {
  profileSchemaVersion: 1,
  fullName: "Test User",
  workspaceMode: "personal",
  privacyAcknowledgedAt: "2026-03-01T00:00:00.000Z",
  onboardingCompletedAt: "2026-03-01T00:00:00.000Z",
};

/**
 * Deterministic dataset for browser tests (January–February 2026), so
 * results don't depend on the demo data or today's date. Amounts in centavos.
 *
 * Balances (after all transactions):
 *   Metro Bank  ₱10,000 + 30,000 − 12,000 − 2,000 (transfer out) = ₱26,000.00
 *   Pocket Cash ₱1,000 − 1,500.50 + 2,000 (transfer in) − 800   = ₱699.50
 *   Old Card    ₱500 − 250 (archived account)                    = ₱250.00
 *   Consolidated                                                  = ₱26,949.50
 * January 2026: income ₱30,000.00, expenses ₱13,750.50, net +₱16,249.50
 * February 2026: income ₱0.00, expenses ₱800.00
 */
export const fixture: FinancialData = {
  accounts: [
    { id: "bank", name: "Metro Bank", type: "bank", openingBalance: 1_000_000, openingDate: "2026-01-01", isActive: true },
    { id: "cash", name: "Pocket Cash", type: "cash", openingBalance: 100_000, openingDate: "2026-01-01", isActive: true },
    { id: "old-card", name: "Old Card", type: "bank", openingBalance: 50_000, openingDate: "2026-01-01", isActive: false },
  ],
  categories: [
    { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true },
    { id: "food", name: "Food", type: "expense", icon: "utensils", color: "orange", isActive: true },
    { id: "rent", name: "Rent", type: "expense", icon: "home", color: "blue", isActive: true },
    { id: "hobby", name: "Hobby", type: "expense", icon: "gift", color: "violet", isActive: false },
  ],
  transactions: [
    { id: "txn-001", type: "income", amount: 3_000_000, date: "2026-01-01", description: "January salary", accountId: "bank", categoryId: "salary" },
    { id: "txn-002", type: "expense", amount: 1_200_000, date: "2026-01-05", description: "January rent", accountId: "bank", categoryId: "rent" },
    { id: "txn-003", type: "expense", amount: 150_050, date: "2026-01-10", description: "Groceries, “palengke”", accountId: "cash", categoryId: "food" },
    { id: "txn-004", type: "expense", amount: 25_000, date: "2026-01-20", description: "=HYPERLINK(\"http://evil.example\",\"Paints\")", accountId: "old-card", categoryId: "hobby" },
    { id: "txn-005", type: "transfer", amount: 200_000, date: "2026-01-31", description: "ATM withdrawal", accountId: "bank", destinationAccountId: "cash" },
    { id: "txn-006", type: "expense", amount: 80_000, date: "2026-02-01", description: "Pansit at Ñoño’s", accountId: "cash", categoryId: "food" },
  ],
};

export function snapshotText(data: FinancialData = fixture): string {
  return JSON.stringify(createSnapshot(data, { revision: "e2e-fixture", now: new Date("2026-03-01T00:00:00Z") }));
}

/**
 * Puts `value` (and, unless `profile: null`, a finished profile) in
 * localStorage before the app first loads. Runs once per tab (tracked in
 * sessionStorage), so reloads keep whatever the app saved.
 */
export async function seedStorage(
  page: Page,
  value: string | FinancialData = fixture,
  { profile = testProfile }: { profile?: LocalProfile | null } = {},
) {
  const text = typeof value === "string" ? value : snapshotText(value);
  await page.addInitScript(
    ([key, stored, profileKey, profileText]) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      localStorage.setItem(key, stored);
      if (profileText) localStorage.setItem(profileKey, profileText);
      sessionStorage.setItem("e2e-seeded", "1");
    },
    [STORAGE_KEY, text, PROFILE_STORAGE_KEY, profile ? JSON.stringify(profile) : ""] as const,
  );
}

export async function readProfile(page: Page): Promise<LocalProfile | null> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), PROFILE_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

/** Opens a page and waits until saved data has been read (DataGate ready). */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await waitForData(page);
}

export async function waitForData(page: Page) {
  await expect(page.getByText("Loading your saved data…")).toBeHidden();
}

/** Client-side navigation through the sidebar (keeps in-memory state). */
export async function navigate(page: Page, name: string) {
  await page.getByRole("navigation").getByRole("link", { name, exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await waitForData(page);
}

export async function readStored(page: Page): Promise<{ revision: string; data: FinancialData } | null> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

export async function readStoredRaw(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

/** The value shown on a visible summary card, e.g. "₱1,234.56". */
export function cardValue(page: Page, title: string) {
  return page
    .locator("main [data-slot=card]")
    .filter({ visible: true })
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .locator("[data-slot=card-content] p")
    .first();
}

/** Chooses an option in a labelled Base UI select. */
export async function choose(page: Page, label: string | RegExp, option: string) {
  await page.getByRole("combobox", { name: label }).filter({ visible: true }).first().click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Current balance shown on an account card. */
export function accountBalance(page: Page, name: string) {
  return page
    .getByRole("listitem", { name, exact: true })
    .filter({ visible: true })
    .getByText("Current balance")
    .locator("xpath=following-sibling::p[1]");
}

const AXE_SCRIPT = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

export type AxeViolation = { id: string; impact: string | null; help: string; nodes: { target: string[] }[] };

/** Runs axe-core (WCAG 2.x A/AA rules) on the current page state. */
export async function runAxe(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_SCRIPT });
  return page.evaluate(async () => {
    // @ts-expect-error axe is injected above
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return result.violations.map((v: AxeViolation) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target })),
    }));
  });
}
