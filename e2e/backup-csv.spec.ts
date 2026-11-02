import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { cardValue, choose, fixture, navigate, open, readStored, readStoredRaw, seedStorage } from "./fixtures";

// Scenarios E (backup and restore) and F (CSV export).

async function download(page: Page, action: () => Promise<void>) {
  const [file] = await Promise.all([page.waitForEvent("download"), action()]);
  const path = await file.path();
  return { name: file.suggestedFilename(), bytes: await readFile(path) };
}

async function exportCsv(page: Page, item: RegExp) {
  return download(page, async () => {
    await page.locator("main").getByRole("button", { name: "Export CSV" }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: item }).click();
  });
}

const csvLines = (bytes: Buffer) => bytes.toString("utf8").replace(/^﻿/, "").split("\r\n").filter(Boolean);

test("backup, change, and restore brings back the exact records; invalid files change nothing", async ({ page }) => {
  await seedStorage(page);
  await open(page, "/settings");
  const original = await readStored(page);

  const backup = await download(page, () =>
    page.getByRole("region", { name: "Data management" }).getByRole("button", { name: "Export JSON backup" }).click(),
  );
  expect(backup.name).toMatch(/^spendwise-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(JSON.parse(backup.bytes.toString("utf8")).data).toEqual(original?.data);

  // Modify: delete a transaction.
  await navigate(page, "Transactions");
  await choose(page, "Month", "All months");
  await page.getByRole("button", { name: "Delete January rent" }).filter({ visible: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  expect((await readStored(page))?.data.transactions).toHaveLength(5);

  // An invalid file is rejected and leaves storage untouched.
  await navigate(page, "Settings");
  const beforeInvalid = await readStoredRaw(page);
  await page.locator("input[type=file]").setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{ not json") });
  await expect(page.getByText(/isn't valid JSON/)).toBeVisible();
  const wrongVersion = JSON.stringify({ ...JSON.parse(backup.bytes.toString("utf8")), schemaVersion: 99 });
  await page.locator("input[type=file]").setInputFiles({ name: "future.json", mimeType: "application/json", buffer: Buffer.from(wrongVersion) });
  await expect(page.getByText(/schema version 99/)).toBeVisible();
  expect(await readStoredRaw(page)).toBe(beforeInvalid);

  // Restore the real backup.
  await page.locator("input[type=file]").setInputFiles({ name: backup.name, mimeType: "application/json", buffer: backup.bytes });
  await page.getByRole("alertdialog").getByRole("button", { name: "Replace data" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  expect((await readStored(page))?.data).toEqual(original?.data);

  await navigate(page, "Dashboard");
  await choose(page, "Month", "January 2026");
  await expect(cardValue(page, "Total Expenses")).toHaveText("₱13,750.50");
});

test("transaction CSV: all and filtered scopes, sort order, pagination independence, injection protection", async ({ page }) => {
  // 15 extra February expenses so the table paginates (10 per page).
  const extra = Array.from({ length: 15 }, (_, i) => ({
    id: `txn-${100 + i}`,
    type: "expense" as const,
    amount: 1_000 + i,
    date: "2026-02-15",
    description: `Bulk item ${i}`,
    accountId: "cash",
    categoryId: "food",
  }));
  await seedStorage(page, { ...fixture, transactions: [...fixture.transactions, ...extra] });
  await open(page, "/transactions");

  await choose(page, "Month", "February 2026");
  await choose(page, "Sort by", "Lowest amount");
  await expect(page.getByText("Showing 1–10 of 16")).toBeVisible();

  const filtered = await exportCsv(page, /Current results/);
  expect(filtered.name).toBe("spendwise-transactions-filtered-2026-02.csv");
  expect([...filtered.bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const rows = csvLines(filtered.bytes);
  expect(rows).toHaveLength(17); // header + all 16, not one page of 10
  expect(rows[1]).toBe("2026-02-15,Expense,Bulk item 0,Food,Pocket Cash,,-10.00"); // lowest first
  expect(rows.at(-1)).toBe("2026-02-01,Expense,Pansit at Ñoño’s,Food,Pocket Cash,,-800.00");
  // Filters and sort are untouched by exporting.
  await expect(page.getByRole("combobox", { name: "Month" })).toContainText("February 2026");

  const all = await exportCsv(page, /All transactions/);
  const allRows = csvLines(all.bytes);
  expect(allRows).toHaveLength(22);
  expect(allRows).toContain("2026-01-31,Transfer,ATM withdrawal,,Metro Bank,Pocket Cash,2000.00");
  expect(allRows).toContain("2026-01-01,Income,January salary,Salary,,Metro Bank,30000.00");
  // Formula injection neutralized; archived names resolved.
  expect(allRows).toContain(`2026-01-20,Expense,"'=HYPERLINK(""http://evil.example"",""Paints"")",Hobby,Old Card,,-250.00`);
  expect(allRows).toContain("2026-01-10,Expense,\"Groceries, “palengke”\",Food,Pocket Cash,,-1500.50");

  // No matches: the scope is disabled.
  await page.getByLabel("Search").fill("no such thing");
  await page.locator("main").getByRole("button", { name: "Export CSV" }).click();
  await expect(page.getByRole("menuitem", { name: /Current results/ })).toHaveAttribute("aria-disabled", "true");
});

test("report CSVs reconcile with the Reports page", async ({ page }) => {
  await seedStorage(page);
  await open(page, "/reports");
  await choose(page, "Reporting period", "January 2026");
  await expect(cardValue(page, "Total Income")).toHaveText("₱30,000.00");
  await expect(cardValue(page, "Total Expenses")).toHaveText("₱13,750.50");

  const summary = csvLines((await exportCsv(page, /Monthly summary/)).bytes);
  expect(summary.at(-1)).toBe("2026-01,30000.00,13750.50,16249.50,54.17");

  const byCategory = csvLines((await exportCsv(page, /Expenses by category/)).bytes);
  expect(byCategory).toEqual([
    "Month,Category,Status,Expenses (PHP),Share of Expenses (%),Transactions",
    "2026-01,Rent,Active,12000.00,87.27,1",
    "2026-01,Food,Active,1500.50,10.91,1",
    "2026-01,Hobby,Archived,250.00,1.82,1",
    "2026-01,Total,,13750.50,100.00,3",
  ]);

  const byAccount = csvLines((await exportCsv(page, /Spending by account/)).bytes);
  expect(byAccount.at(-1)).toBe("2026-01,Total,,,13750.50,100.00,3");
  expect(byAccount).toContain("2026-01,Old Card,Bank,Archived,250.00,1.82,1");
  // The ₱2,000 transfer appears in neither breakdown.
});

test("a failed CSV download shows an error, never a success message, and the error clears afterwards", async ({ page }) => {
  await page.addInitScript(() => {
    URL.createObjectURL = () => {
      throw new Error("Simulated download failure");
    };
  });
  await seedStorage(page);
  await open(page, "/transactions");
  await choose(page, "Month", "All months");
  const before = await readStoredRaw(page);

  await page.locator("main").getByRole("button", { name: "Export CSV" }).click();
  await page.getByRole("menuitem", { name: /All transactions/ }).click();
  const alert = page.getByRole("alert").filter({ hasText: "The CSV file couldn't be created" });
  await expect(alert).toBeVisible();
  await expect(page.getByText(/^Downloaded /)).toHaveCount(0);
  expect(await readStoredRaw(page)).toBe(before);

  // The next successful action replaces the stale error (SW-009 D-6).
  await page.getByRole("button", { name: "Delete ATM withdrawal" }).filter({ visible: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Deleted “ATM withdrawal”.")).toBeVisible();
  await expect(alert).toBeHidden();
});
