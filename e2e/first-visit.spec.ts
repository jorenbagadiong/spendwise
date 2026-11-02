import { expect, test } from "@playwright/test";

import { mockAccounts, mockCategories, mockTransactions } from "@/data/mock-finance";

import { navigate, open, readStored } from "./fixtures";

// Scenario A: first visit with no saved data.

const pages = ["Dashboard", "Transactions", "Accounts", "Categories", "Reports", "Settings"];

test("seeds demo data exactly once and keeps it across pages and reloads", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));

  await open(page, "/dashboard");

  const first = await readStored(page);
  expect(first?.data.accounts).toHaveLength(mockAccounts.length);
  expect(first?.data.categories).toHaveLength(mockCategories.length);
  expect(first?.data.transactions).toHaveLength(mockTransactions.length);

  for (const name of pages) {
    await navigate(page, name);
  }

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  const afterReload = await readStored(page);
  // Same records, same revision: reloading read the saved data instead of seeding again.
  expect(afterReload?.revision).toBe(first?.revision);
  expect(afterReload?.data.transactions).toHaveLength(mockTransactions.length);
  expect(new Set(afterReload?.data.transactions.map((t) => t.id)).size).toBe(mockTransactions.length);

  await navigate(page, "Transactions");
  await page.getByRole("combobox", { name: "Month" }).click();
  await page.getByRole("option", { name: "All months" }).click();
  await expect(page.getByText(`Showing 1–10 of ${mockTransactions.length}`)).toBeVisible();

  expect(errors).toEqual([]);
});

test("redirects / to the dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
});
