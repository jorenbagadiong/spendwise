import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { defaultCategories } from "@/data/default-categories";
import { mockTransactions } from "@/data/mock-finance";

import { choose, fixture, navigate, readProfile, readStored, runAxe, seedStorage, snapshotText } from "./fixtures";

// SW-010: onboarding, local profile, demo mode, and existing-user migration.

const GREETING = /^Good (morning|afternoon|evening), /;

async function startOnboarding(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome to Spend Wise Tracker" })).toBeVisible();
}

async function finishOnboarding(page: Page, name: string, mode: "personal" | "demo") {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Full name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: mode === "demo" ? /Explore with demo data/ : /Start with my own data/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/I understand that my data is stored locally/).check();
  await page.getByRole("button", { name: "Start using Spend Wise" }).click();
  await expect(page.getByRole("heading", { name: GREETING })).toBeVisible();
}

test("a new visitor completes onboarding into an empty personal workspace", async ({ page }) => {
  await startOnboarding(page);
  expect(await readStored(page)).toBeNull(); // nothing saved before onboarding finishes
  await expect(page.getByText("Track income and expenses")).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();

  // Name: required, trimmed, whitespace-only rejected, Unicode accepted.
  const name = page.getByLabel("Full name");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/Enter your name\./);
  await name.fill("    ");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await name.fill("  José Rizal  ");
  await page.getByRole("button", { name: "Continue" }).click();

  // Workspace: personal is the default. Back keeps what was typed.
  await expect(page.getByRole("heading", { name: "How would you like to start?" })).toBeFocused();
  await expect(page.getByRole("radio", { name: /Start with my own data/ })).toBeChecked();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("  José Rizal  ");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Privacy: the acknowledgement starts unticked and is required.
  await expect(page.getByText("Your financial data stays private")).toBeVisible();
  await expect(page.getByText("Important: your data can be lost")).toBeVisible();
  const ack = page.getByLabel(/I understand that my data is stored locally/);
  const finish = page.getByRole("button", { name: "Start using Spend Wise" });
  await expect(ack).not.toBeChecked();
  await expect(finish).toBeDisabled();
  await ack.check();
  await expect(finish).toBeEnabled();
  await ack.uncheck();
  await expect(finish).toBeDisabled();
  await ack.check();
  await finish.click();

  // Personalized dashboard with a setup state, no demo records or totals.
  await expect(page.getByRole("heading", { name: GREETING })).toHaveText(/José Rizal!$/);
  await expect(page.getByRole("heading", { name: "Let's set up your finances." })).toBeVisible();
  await expect(page.getByText("Total Income")).toHaveCount(0);
  const stored = await readStored(page);
  expect(stored?.data).toEqual({ accounts: [], categories: defaultCategories, transactions: [] });
  expect(await readProfile(page)).toMatchObject({ fullName: "José Rizal", workspaceMode: "personal" });
  await expect(page.getByRole("link", { name: /Demo mode/ })).toHaveCount(0);

  // Returning: reload skips onboarding.
  await page.reload();
  await expect(page.getByRole("heading", { name: GREETING })).toHaveText(/José Rizal!$/);
  await expect(page.getByRole("heading", { name: "Welcome to Spend Wise Tracker" })).toHaveCount(0);

  // The setup action opens the add-account form.
  await page.getByRole("link", { name: "Add your first account" }).click();
  await expect(page.getByRole("dialog", { name: "Add account" })).toBeVisible();
});

test("demo mode is labeled, and clearing it starts a personal workspace that stays cleared", async ({ page }) => {
  await startOnboarding(page);
  await finishOnboarding(page, "Demo Explorer", "demo");

  const badge = page.getByRole("link", { name: /Demo mode/ });
  await expect(badge).toBeVisible();
  await expect(page.getByText(/You're exploring demo data/)).toBeVisible();
  expect((await readStored(page))?.data.transactions).toHaveLength(mockTransactions.length);

  // Pick a theme to check that clearing keeps it.
  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();

  await badge.click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Clear Demo Data & Start Fresh" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("including anything you added or changed while exploring");
  await expect(dialog).toContainText("Your name, privacy acknowledgement, and theme stay");
  // A backup can be taken first.
  const [backup] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "Export backup first" }).click()]);
  expect(JSON.parse(await readFile(await backup.path(), "utf8")).data.transactions).toHaveLength(mockTransactions.length);
  await dialog.getByRole("button", { name: "Clear demo data" }).click();

  await expect(page.getByText(/Demo data cleared/)).toBeVisible();
  await expect(badge).toHaveCount(0);
  expect((await readStored(page))?.data).toEqual({ accounts: [], categories: defaultCategories, transactions: [] });
  expect(await readProfile(page)).toMatchObject({ fullName: "Demo Explorer", workspaceMode: "personal" });
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

  // Refresh: demo data doesn't come back, onboarding stays complete.
  await page.reload();
  await navigate(page, "Dashboard");
  await expect(page.getByRole("heading", { name: "Let's set up your finances." })).toBeVisible();
  await expect(badge).toHaveCount(0);
});

test("an existing user with saved records keeps every record by default", async ({ page }) => {
  await seedStorage(page, fixture, { profile: null });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome back to Spend Wise Tracker" })).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Full name").fill("Long-time User");
  await page.getByRole("button", { name: "Continue" }).click();
  // The saved data is summarized; keeping it is the default.
  await expect(page.getByRole("heading", { name: "What should we do with your saved data?" })).toBeVisible();
  await expect(page.getByText(/3 accounts, 4 categories,\s+and 6 transactions saved/)).toBeVisible();
  await expect(page.getByRole("radio", { name: /Keep my current data/ })).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Your data, your privacy" })).toBeVisible();
  await page.getByLabel(/I understand that my data is stored locally/).check();
  await page.getByRole("button", { name: "Continue to my data" }).click();

  await expect(page.getByRole("heading", { name: GREETING })).toHaveText(/Long-time User!$/);
  const stored = await readStored(page);
  expect(stored?.revision).toBe("e2e-fixture"); // not even rewritten
  expect(stored?.data).toEqual(fixture);
  expect(await readProfile(page)).toMatchObject({ workspaceMode: "personal" });
  await choose(page, "Month", "January 2026");
  await expect(page.getByText("₱30,000.00").first()).toBeVisible();
});

test("an existing user can explicitly start fresh, with a backup offered and a required confirmation", async ({ page }) => {
  await seedStorage(page, fixture, { profile: null });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Full name").fill("Fresh Starter");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("radio", { name: /Start fresh with my own data/ }).check();
  await expect(page.getByText(/permanently removes the saved records/)).toBeVisible();
  expect((await runAxe(page)).filter((v) => v.id !== "color-contrast").map((v) => v.id)).toEqual([]);
  const next = page.getByRole("button", { name: "Continue" });
  await expect(next).toBeDisabled();
  const [backup] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download backup first" }).click()]);
  expect(JSON.parse(await readFile(await backup.path(), "utf8")).data).toEqual(fixture);
  await page.getByLabel(/my saved accounts, categories, and transactions will be removed/).check();
  await expect(next).toBeEnabled();
  await next.click();

  await page.getByLabel(/I understand that my data is stored locally/).check();
  // Nothing has changed until the final, clearly labeled action.
  expect((await readStored(page))?.data).toEqual(fixture);
  await page.getByRole("button", { name: "Start fresh" }).click();

  await expect(page.getByRole("heading", { name: GREETING })).toHaveText(/Fresh Starter!$/);
  await expect(page.getByRole("heading", { name: "Let's set up your finances." })).toBeVisible();
  expect((await readStored(page))?.data).toEqual({ accounts: [], categories: defaultCategories, transactions: [] });
  expect(await readProfile(page)).toMatchObject({ workspaceMode: "personal" });
});

test("returning users go straight to the app with no flash of onboarding", async ({ page }) => {
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.body?.textContent?.includes("Welcome to Spend Wise Tracker")) {
        sessionStorage.setItem("saw-onboarding", "1");
      }
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
  await seedStorage(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Good morning, Test User!" }).or(page.getByRole("heading", { name: GREETING }))).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: GREETING })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("saw-onboarding"))).toBeNull();
});

test("profile edits validate, persist, and update the greeting; Settings explains privacy", async ({ page }) => {
  await seedStorage(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByText("Test User")).toBeVisible();

  await page.getByRole("button", { name: "Edit profile" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit profile" });
  await dialog.getByLabel("Full name").fill("  ");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByText("Enter your name.")).toBeVisible();
  await dialog.getByLabel("Full name").fill("Maria Clara Ñ. Santos");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Saved. You'll be greeted as Maria Clara Ñ. Santos.")).toBeVisible();

  // Privacy & data section with a direct backup action.
  const privacy = page.getByRole("region", { name: "Privacy & data" });
  await expect(privacy.getByRole("heading", { name: "Stored on your device" })).toBeVisible();
  await expect(privacy).toContainText("private or incognito");
  await expect(privacy).toContainText("CSV exports are for spreadsheets and can't be restored");
  await expect(privacy.getByRole("button", { name: "Export JSON backup" })).toBeVisible();

  await navigate(page, "Dashboard");
  await expect(page.getByRole("heading", { name: GREETING })).toHaveText(/Maria Clara Ñ\. Santos!$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: GREETING })).toHaveText(/Maria Clara Ñ\. Santos!$/);
  expect((await readProfile(page))?.fullName).toBe("Maria Clara Ñ. Santos");
});

test("restoring a backup in demo mode switches to personal and keeps the profile", async ({ page }) => {
  await startOnboarding(page);
  await finishOnboarding(page, "Restorer", "demo");
  await navigate(page, "Settings");
  await page.locator("input[type=file]").setInputFiles({ name: "mine.json", mimeType: "application/json", buffer: Buffer.from(snapshotText()) });
  await page.getByRole("alertdialog").getByRole("button", { name: "Replace data" }).click();
  await expect(page.getByText(/Restored 3 accounts/)).toBeVisible();
  expect((await readStored(page))?.data).toEqual(fixture);
  expect(await readProfile(page)).toMatchObject({ fullName: "Restorer", workspaceMode: "personal" });
  await expect(page.getByRole("link", { name: /Demo mode/ })).toHaveCount(0);
});

test("onboarding works with the keyboard alone and has no accessibility violations", async ({ page }) => {
  await startOnboarding(page);
  const structural = async () => (await runAxe(page)).filter((v) => v.id !== "color-contrast").map((v) => v.id);

  expect(await structural()).toEqual([]);
  await expect(page.getByRole("heading", { name: "Welcome to Spend Wise Tracker" })).toBeFocused();
  await page.keyboard.press("Tab"); // Get started
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "What should we call you?" })).toBeFocused();
  expect(await structural()).toEqual([]);
  await page.keyboard.press("Tab"); // name field
  await page.keyboard.type("Keyboard User");
  await page.keyboard.press("Enter"); // submits the step

  await expect(page.getByRole("heading", { name: "How would you like to start?" })).toBeFocused();
  expect(await structural()).toEqual([]);
  await page.keyboard.press("Tab"); // selected radio
  await page.keyboard.press("ArrowDown"); // → demo
  await expect(page.getByRole("radio", { name: /Explore with demo data/ })).toBeChecked();
  await page.keyboard.press("ArrowUp"); // back to personal
  await page.keyboard.press("Tab"); // Back
  await page.keyboard.press("Tab"); // Continue
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Your data, your privacy" })).toBeFocused();
  expect(await structural()).toEqual([]);
  await page.keyboard.press("Tab"); // checkbox
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab"); // Back
  await page.keyboard.press("Tab"); // finish
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: GREETING })).toHaveText(/Keyboard User!$/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeFocused();
});

test("on a phone, finishing onboarding opens the app at the top of the page", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await startOnboarding(page);
  await finishOnboarding(page, "Phone User", "demo");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("heading", { name: GREETING })).toBeInViewport();
});
