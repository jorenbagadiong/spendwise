import { expect, test, type Page } from "@playwright/test";

import { choose, open, runAxe, seedStorage, type AxeViolation } from "./fixtures";

// Automated WCAG 2.2 A/AA checks (axe-core) plus keyboard behavior that
// axe can't see: focus trapping, Escape, and focus return.

const paths = ["/dashboard", "/transactions", "/accounts", "/categories", "/reports", "/settings"];

const describe = (violations: AxeViolation[]) =>
  violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);

/** Every axe violation except color contrast, which is tracked separately (D-2). */
async function structuralViolations(page: Page) {
  return describe((await runAxe(page)).filter((v) => v.id !== "color-contrast"));
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("pages, dialogs, and menus have no structural accessibility violations", async ({ page }) => {
      test.setTimeout(60_000);
      await seedStorage(page);
      for (const path of paths) {
        await open(page, path);
        expect(await structuralViolations(page), path).toEqual([]);
      }

      await open(page, "/transactions");
      await choose(page, "Month", "All months");
      expect(await structuralViolations(page), "table with rows").toEqual([]);

      await page.getByRole("button", { name: "Add transaction" }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await structuralViolations(page), "add dialog").toEqual([]);
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: "Delete January rent" }).filter({ visible: true }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      expect(await structuralViolations(page), "delete dialog").toEqual([]);
      await page.keyboard.press("Escape");

      await page.locator("main").getByRole("button", { name: "Export CSV" }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      expect(await structuralViolations(page), "export menu").toEqual([]);
      await page.keyboard.press("Escape");

      await page.setViewportSize({ width: 375, height: 800 });
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await structuralViolations(page), "mobile navigation").toEqual([]);
    });

    test("text meets WCAG AA color contrast", async ({ page }) => {
      // Known open defect D-2: colored text on a 10% tint of the same color
      // (active nav link, status and type badges) is 4.1–4.3:1 in light mode,
      // and the tinted destructive button is 4.0:1. Fixing it needs a design
      // decision (see README). Remove test.fail() once it's fixed.
      test.fail(true, "D-2: tinted text chips and destructive buttons are below 4.5:1");
      await seedStorage(page);
      const failures: string[] = [];
      for (const path of paths) {
        await open(page, path);
        failures.push(...describe((await runAxe(page)).filter((v) => v.id === "color-contrast")));
      }
      await open(page, "/transactions");
      await choose(page, "Month", "All months");
      await page.getByRole("button", { name: "Delete January rent" }).filter({ visible: true }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      failures.push(...describe((await runAxe(page)).filter((v) => v.id === "color-contrast")));
      expect(failures).toEqual([]);
    });
  });
}

test("dialogs trap focus, close with Escape, and return focus to their trigger", async ({ page }) => {
  await seedStorage(page);
  await open(page, "/transactions");

  const trigger = page.getByRole("button", { name: "Add transaction" }).first();
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Tab through more stops than the dialog has: focus never leaves it.
  // Base UI moves focus off its invisible focus guards asynchronously, so
  // the presses are spaced like real key repeats (~30 ms) rather than
  // fired back to back faster than any keyboard can.
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  // Same for the delete confirmation.
  await choose(page, "Month", "All months");
  const deleteButton = page.getByRole("button", { name: "Delete January rent" }).filter({ visible: true });
  await deleteButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(deleteButton).toBeFocused();
});

test("the mobile navigation drawer works from the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await seedStorage(page);
  await open(page, "/dashboard");
  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await menuButton.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("link", { name: "Reports" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("form errors are linked to their fields", async ({ page }) => {
  await seedStorage(page);
  await open(page, "/transactions");
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  const amount = dialog.getByLabel("Amount (₱)");
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(amount).toHaveAccessibleDescription(/Enter an amount/);
  // Focus moves to the first invalid field.
  await expect(dialog.locator(":focus")).toHaveAttribute("aria-invalid", "true");
});

test("reduced-motion preference turns off dialog animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedStorage(page);
  await open(page, "/transactions");
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const duration = await page
    .locator("[data-slot=dialog-content]")
    .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(duration).toBeLessThanOrEqual(0.001);
});

test("the trend chart has a keyboard-reachable text alternative", async ({ page }) => {
  await seedStorage(page);
  await open(page, "/reports");
  await choose(page, "Reporting period", "January 2026");
  const column = page.getByRole("button", { name: /^January 2026: income ₱30,000\.00, expenses ₱13,750\.50/ });
  await column.focus();
  await expect(column).toBeFocused();
  await page.getByText("Show as table").click();
  await expect(page.getByRole("row", { name: /January 2026 ₱30,000\.00 ₱13,750\.50 \+₱16,249\.50/ })).toBeVisible();
});
