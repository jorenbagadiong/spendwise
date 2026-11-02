import { expect, test, type Page } from "@playwright/test";

import { fixture, navigate, open, readStored, readStoredRaw, seedStorage, snapshotText, STORAGE_KEY, waitForData } from "./fixtures";

// Scenario G: storage that can't be read, is corrupt, is full, or is
// changed by another tab. In every case nothing may be silently overwritten.

async function deleteFirstVisibleTransaction(page: Page, description: string) {
  await navigate(page, "Transactions");
  await page.getByRole("combobox", { name: "Month" }).click();
  await page.getByRole("option", { name: "All months" }).click();
  await page.getByRole("button", { name: `Delete ${description}` }).filter({ visible: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
}

test("malformed JSON shows the recovery screen and leaves the stored value untouched", async ({ page }) => {
  await seedStorage(page, "{ this is not json");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Your saved data couldn't be loaded" })).toBeVisible();
  // No page content (and no demo totals) is shown.
  await expect(page.getByText("Monthly summary")).toBeHidden();

  await page.getByRole("button", { name: "Try again" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your saved data couldn't be loaded" })).toBeVisible();
  expect(await readStoredRaw(page)).toBe("{ this is not json");
});

test("an unsupported schema version fails safely", async ({ page }) => {
  const future = JSON.stringify({ ...JSON.parse(snapshotText()), schemaVersion: 2 });
  await seedStorage(page, future);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Your saved data is from a different version" })).toBeVisible();
  expect(await readStoredRaw(page)).toBe(future);
});

test("records that break integrity rules are rejected, not repaired", async ({ page }) => {
  const broken = snapshotText({
    ...fixture,
    transactions: [...fixture.transactions, { ...fixture.transactions[1], id: "txn-099", accountId: "missing" }],
  });
  await seedStorage(page, broken);
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { name: "Your saved data couldn't be loaded" })).toBeVisible();
  await expect(page.getByText(/txn-099/)).toBeVisible();
  expect(await readStoredRaw(page)).toBe(broken);
});

test("unavailable localStorage keeps working in memory and warns", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Storage is disabled", "SecurityError");
      },
    });
  });
  await page.goto("/dashboard");
  await waitForData(page);
  await expect(page.getByRole("alert").filter({ hasText: "Changes are only kept in this tab" })).toBeVisible();
  // Demo data is shown in memory; the app is usable.
  await expect(page.getByText("Monthly summary")).toBeVisible();
});

test("a full storage quota keeps the old saved data and warns on every failed save", async ({ page }) => {
  await seedStorage(page);
  // After the app has loaded, make every write fail with a quota error.
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (sessionStorage.getItem("e2e-quota") === "1") {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
  });
  await open(page, "/transactions");
  await page.evaluate(() => sessionStorage.setItem("e2e-quota", "1"));
  const before = await readStoredRaw(page);

  await deleteFirstVisibleTransaction(page, "January rent");
  const banner = page.getByRole("alert").filter({ hasText: "Your latest changes aren't saved" });
  await expect(banner).toContainText("Browser storage is full");
  expect(await readStoredRaw(page)).toBe(before);

  // Once space is available again, the next change saves everything.
  await page.evaluate(() => sessionStorage.removeItem("e2e-quota"));
  await deleteFirstVisibleTransaction(page, "ATM withdrawal");
  await expect(banner).toBeHidden();
  expect((await readStored(page))?.data.transactions.map((t) => t.id)).toEqual(["txn-001", "txn-003", "txn-004", "txn-006"]);
});

test("a stale tab can't overwrite newer data saved by another tab", async ({ context }) => {
  await context.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    [STORAGE_KEY, snapshotText()] as const,
  );
  const tabA = await context.newPage();
  const tabB = await context.newPage();
  await open(tabA, "/transactions");
  await open(tabB, "/transactions");

  // Tab B saves first.
  await deleteFirstVisibleTransaction(tabB, "January rent");
  const afterB = await readStoredRaw(tabB);

  // Tab A learned about it (storage event) and refuses to write.
  await expect(tabA.getByRole("alert").filter({ hasText: "Data changed in another tab" })).toBeVisible();
  await deleteFirstVisibleTransaction(tabA, "January salary");
  expect(await readStoredRaw(tabA)).toBe(afterB);

  // Loading the latest data resolves the conflict and shows tab B's change.
  await tabA.getByRole("button", { name: "Load latest data" }).click();
  await expect(tabA.getByRole("alert").filter({ hasText: "Data changed in another tab" })).toBeHidden();
  await expect(tabA.getByRole("row", { name: /January salary/ })).toBeVisible();
  await expect(tabA.getByRole("row", { name: /January rent/ })).toBeHidden();
});
