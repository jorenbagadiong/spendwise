import { expect, test, type Page } from "@playwright/test";

import { choose, open, seedStorage } from "./fixtures";

// No horizontal page overflow, and no visible control cut off by the
// viewport, at the four reference widths.

const widths = [375, 768, 1280, 1920];
const paths = ["/dashboard", "/transactions", "/accounts", "/categories", "/reports", "/settings"];

async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > width) {
      problems.push(`page scrolls horizontally: ${document.documentElement.scrollWidth}px > ${width}px`);
    }
    // Interactive elements must be fully inside the viewport horizontally
    // (unless they're inside their own horizontal scroll area, like a table).
    for (const el of document.querySelectorAll<HTMLElement>("main button, main a, main input, main [role=combobox]")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || el.closest("[hidden], [aria-hidden=true]")) continue;
      let scroller: HTMLElement | null = el.parentElement;
      while (scroller && getComputedStyle(scroller).overflowX === "visible") scroller = scroller.parentElement;
      const inScrollArea = scroller && scroller !== document.body && scroller.scrollWidth > scroller.clientWidth;
      if (!inScrollArea && (rect.left < -1 || rect.right > width + 1)) {
        problems.push(`cut off: ${el.tagName} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}"`);
      }
    }
    return problems;
  });
}

for (const width of widths) {
  test(`no overflow or cut-off controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await seedStorage(page);
    for (const path of paths) {
      await open(page, path);
      if (path === "/transactions") await choose(page, "Month", "All months");
      if (path === "/reports") await choose(page, "Reporting period", "January 2026");
      expect(await layoutProblems(page), `${path} at ${width}px`).toEqual([]);
    }
  });
}

test("dialogs and menus fit a 375px screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await seedStorage(page);
  await open(page, "/transactions");

  // Polled, because drawers and menus slide or zoom in before settling.
  const fits = async (locator: ReturnType<Page["getByRole"]>) => {
    await expect
      .poll(async () => {
        const box = await locator.boundingBox();
        return box !== null && box.x >= 0 && box.x + box.width <= 375;
      })
      .toBe(true);
  };

  await page.getByRole("button", { name: "Add transaction" }).first().click();
  await fits(page.getByRole("dialog"));
  // The submit button can be reached (the dialog scrolls if needed).
  await page.getByRole("dialog").getByRole("button", { name: "Add transaction" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Add transaction" })).toBeInViewport();
  await page.keyboard.press("Escape");

  await page.locator("main").getByRole("button", { name: "Export CSV" }).click();
  await fits(page.getByRole("menu"));
  await page.keyboard.press("Escape");

  await open(page, "/reports");
  await page.locator("main").getByRole("button", { name: "Export CSV" }).click();
  await fits(page.getByRole("menu"));
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await fits(page.getByRole("dialog"));
});
