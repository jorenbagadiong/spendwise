import { expect, test, type Page } from "@playwright/test";

import { accountBalance, cardValue, choose, navigate, open, readStored, seedStorage } from "./fixtures";

// Scenarios C and D: account and category lifecycles and their effect on
// transactions and totals.

async function optionsOf(page: Page, label: string | RegExp): Promise<string[]> {
  await page.getByRole("combobox", { name: label }).click();
  // Wait for the popup to render before reading it (it opens asynchronously).
  await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
  const options = await page.getByRole("listbox").getByRole("option").allInnerTexts();
  await page.keyboard.press("Escape");
  return options.map((o) => o.trim());
}

async function addTransaction(page: Page, values: { type: "Income" | "Expense"; date: string; amount: string; description: string; account: string; category: string }) {
  await navigate(page, "Transactions");
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText(values.type, { exact: true }).click();
  await dialog.getByLabel("Date").fill(values.date);
  await dialog.getByLabel("Amount (₱)").fill(values.amount);
  await dialog.getByLabel("Description").fill(values.description);
  await choose(page, values.type === "Income" ? "Received in" : "Paid from", values.account);
  await choose(page, "Category", values.category);
  await dialog.getByRole("button", { name: "Add transaction" }).click();
}

test.beforeEach(async ({ page }) => {
  await seedStorage(page);
});

test("account lifecycle: create, rename, opening-date rule, archive, restore", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, "/accounts");

  // Create.
  await page.getByRole("button", { name: "Add account" }).first().click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Account name").fill("E2E Savings");
  await dialog.getByText("Bank", { exact: true }).click();
  await dialog.getByLabel("Opening balance (₱)").fill("500");
  await dialog.getByLabel("Opening date").fill("2026-03-01");
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(dialog).toBeHidden();
  await expect(accountBalance(page, "E2E Savings")).toHaveText("₱500.00");
  // Opening balance isn't income: consolidated rises by exactly ₱500.
  await expect(cardValue(page, "Consolidated Balance")).toHaveText("₱27,449.50");

  // Duplicate names are rejected (case-insensitive, archived accounts included).
  await page.getByRole("button", { name: "Add account" }).first().click();
  await dialog.getByLabel("Account name").fill("old card");
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(dialog.getByText(/An archived account named “Old Card” already exists/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Rename.
  await page.getByRole("button", { name: "Edit E2E Savings" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Account name").fill("E2E Vault");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("listitem", { name: "E2E Vault" })).toBeVisible();

  // Transactions can't predate the opening date.
  await addTransaction(page, { type: "Expense", date: "2026-02-15", amount: "100", description: "Too early", account: "E2E Vault", category: "Food" });
  await expect(page.getByRole("dialog").getByText("Date is before E2E Vault was opened.")).toBeVisible();
  await page.getByRole("dialog").getByLabel("Date").fill("2026-03-05");
  await page.getByRole("dialog").getByLabel("Description").fill("Vault expense");
  await page.getByRole("dialog").getByRole("button", { name: "Add transaction" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Archive: balance and history stay in the totals.
  await navigate(page, "Accounts");
  await expect(accountBalance(page, "E2E Vault")).toHaveText("₱400.00");
  await page.getByRole("button", { name: "Archive E2E Vault" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("button", { name: "Restore E2E Vault" })).toBeVisible();
  await expect(accountBalance(page, "E2E Vault")).toHaveText("₱400.00");
  await expect(cardValue(page, "Consolidated Balance")).toHaveText("₱27,349.50");

  // The transaction still shows the account name; new transactions can't pick it.
  await navigate(page, "Transactions");
  await choose(page, "Month", "All months");
  await expect(page.getByRole("row", { name: /Vault expense/ })).toContainText("E2E Vault");
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  expect(await optionsOf(page, "Paid from")).not.toContain("E2E Vault");
  await page.keyboard.press("Escape");

  // Restore: selectable again.
  await navigate(page, "Accounts");
  await page.getByRole("button", { name: "Restore E2E Vault" }).click();
  await navigate(page, "Transactions");
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  expect(await optionsOf(page, "Paid from")).toContain("E2E Vault");
  await page.keyboard.press("Escape");

  const stored = await readStored(page);
  expect(stored?.data.accounts.find((a) => a.name === "E2E Vault")).toMatchObject({ isActive: true, openingBalance: 50_000 });
});

test("category lifecycle: create, rename, duplicates, archive, restore, history", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, "/categories");

  for (const [name, type] of [["E2E Bonus", "Income"], ["E2E Snacks", "Expense"]] as const) {
    await page.getByRole("button", { name: "Add category" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByText(type, { exact: true }).click();
    await dialog.getByRole("button", { name: "Add category" }).click();
    await expect(dialog).toBeHidden();
  }

  // Rename.
  await page.getByRole("button", { name: "Edit E2E Snacks" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("E2E Treats");
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Edit E2E Treats" })).toBeVisible();

  // Duplicate within a type is rejected; the same name as another type is allowed.
  await page.getByRole("button", { name: "Add category" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("e2e treats");
  await dialog.getByText("Expense", { exact: true }).click();
  await dialog.getByRole("button", { name: "Add category" }).click();
  await expect(dialog.getByText(/An expense category named “E2E Treats” already exists/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Use it, then archive it: history keeps the name, new transactions can't use it.
  await addTransaction(page, { type: "Expense", date: "2026-02-10", amount: "45", description: "Halo-halo", account: "Pocket Cash", category: "E2E Treats" });
  await expect(page.getByRole("dialog")).toBeHidden();
  await navigate(page, "Categories");
  await page.getByRole("button", { name: "Archive E2E Treats" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("button", { name: "Restore E2E Treats" })).toBeVisible();

  await navigate(page, "Transactions");
  await choose(page, "Month", "All months");
  await expect(page.getByRole("row", { name: /Halo-halo/ })).toContainText("E2E Treats");
  // The fixture's archived "Hobby" category also still resolves.
  await expect(page.getByRole("row", { name: /HYPERLINK/ })).toContainText("Hobby");

  await page.getByRole("button", { name: "Add transaction" }).first().click();
  await page.getByRole("dialog").getByText("Expense", { exact: true }).click();
  const newOptions = await optionsOf(page, "Category");
  expect(newOptions).not.toContain("E2E Treats");
  expect(newOptions).not.toContain("Hobby");
  await page.keyboard.press("Escape");

  // Editing a transaction that already uses the archived category keeps it selectable.
  await page.getByRole("button", { name: "Edit Halo-halo" }).filter({ visible: true }).click();
  expect((await optionsOf(page, "Category")).some((o) => o.startsWith("E2E Treats"))).toBe(true);
  await page.keyboard.press("Escape");

  // Restore.
  await navigate(page, "Categories");
  await page.getByRole("button", { name: "Restore E2E Treats" }).click();
  await navigate(page, "Transactions");
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  await page.getByRole("dialog").getByText("Expense", { exact: true }).click();
  expect(await optionsOf(page, "Category")).toContain("E2E Treats");
});
