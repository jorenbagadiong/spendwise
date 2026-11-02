import { expect, test, type Page } from "@playwright/test";

import { runAxe } from "./fixtures";

// SW-011: the scroll-driven landing page at "/".

const layerVisibility = (page: Page, n: number) =>
  page.locator(`[data-layer="${n}"]`).evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--v") || 0));

/** LandingMotion attaches after hydration; its first update sets --page-progress. */
async function waitForMotion(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--page-progress"))).not.toBe("");
}

async function scrollToScene(page: Page, n: number) {
  await page.locator(`[data-scene="${n}"]`).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2);
  });
  // Effects update on the next animation frame.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test("the hero and its call to action are usable immediately and lead into the app", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Know Where Your Money Goes." })).toBeVisible();
  const cta = page.getByRole("link", { name: "Start Tracking for Free" });
  await expect(cta).toBeInViewport();
  await expect(cta).toHaveAttribute("href", "/dashboard");
  await cta.click();
  // A new visitor lands in onboarding.
  await expect(page.getByRole("heading", { name: "Welcome to Spend Wise Tracker" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("tells the whole story as text, with sample numbers that add up", async ({ page }) => {
  await page.goto("/");
  for (const heading of [
    "Know Where Your Money Goes.",
    "Where Does Your Money Go?",
    "Every Peso Has a Story.",
    "See What Remains.",
    "Your Money. Your Data. Your Control.",
    "Make Every Peso Count.",
  ]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toHaveCount(1);
  }
  const remains = page.getByRole("article", { name: "See What Remains." });
  await expect(remains).toContainText("₱45,000.00 in income minus ₱20,000.00 in expenses leaves ₱25,000.00 of net cash flow");
  await expect(remains).toContainText("That isn't money saved yet");
  const privacy = page.getByRole("article", { name: "Your Money. Your Data. Your Control." });
  for (const fact of ["local storage", "No account registration is required", "no automatic cloud sync", "Clearing your browser's site data can erase your records", "JSON backup"]) {
    await expect(privacy).toContainText(fact);
  }
  await expect(page.getByRole("link", { name: "Start Tracking Now" })).toHaveAttribute("href", "/dashboard");
});

test("navigation links reach Features, How It Works, Privacy, and the app", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Landing page" });
  for (const [label, id] of [["Features", "features"], ["How It Works", "how-it-works"], ["Privacy", "privacy"]] as const) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
  await page.getByRole("link", { name: "Open App" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("the sticky stage follows native scrolling, forwards and backwards", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("[data-stage]")).toBeVisible();
  await waitForMotion(page);

  await scrollToScene(page, 3);
  expect(await layerVisibility(page, 3)).toBeGreaterThan(0.9);
  expect(await layerVisibility(page, 2)).toBeLessThan(0.1);
  expect(await layerVisibility(page, 4)).toBeLessThan(0.1);

  await scrollToScene(page, 4);
  expect(await layerVisibility(page, 4)).toBeGreaterThan(0.9);

  // Scrolling back up simply reverses it.
  await scrollToScene(page, 2);
  expect(await layerVisibility(page, 2)).toBeGreaterThan(0.9);
  expect(await layerVisibility(page, 3)).toBeLessThan(0.1);

  // Nothing blocks scrolling: the page reaches the bottom.
  await page.keyboard.press("End");
  await expect(page.getByRole("heading", { name: "Make Every Peso Count." })).toBeInViewport();
});

test("pointer tilt runs on desktop only", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForMotion(page);
  const tilt = page.locator("[data-tilt]");
  await page.mouse.move(1300, 200);
  await expect.poll(() => tilt.evaluate((el) => el.style.getPropertyValue("--rx"))).not.toBe("");

  await page.setViewportSize({ width: 375, height: 800 });
  await page.reload();
  await waitForMotion(page);
  await page.mouse.move(300, 300);
  await page.mouse.move(100, 500);
  expect(await page.locator("[data-tilt]").evaluate((el) => el.style.getPropertyValue("--rx"))).toBe("");
});

test("reduced motion shows everything statically, with the CTA unchanged", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("[data-stage]")).toBeHidden();
  expect(await page.locator("[data-tilt]").evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  // Each scene's card is shown inline and fully visible.
  const card = page.getByRole("article", { name: "Every Peso Has a Story." }).locator("[aria-hidden=true]");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Haircut");
  await expect(page.getByRole("link", { name: "Start Tracking for Free" })).toHaveAttribute("href", "/dashboard");
});

for (const width of [375, 768, 1280, 1920]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.keyboard.press("End");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    if (width < 1024) {
      await expect(page.locator("[data-stage]")).toBeHidden();
      await expect(page.getByRole("article", { name: "Where Does Your Money Go?" }).locator("[aria-hidden=true]")).toBeVisible();
    }
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`has no structural accessibility violations (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    expect((await runAxe(page)).filter((v) => v.id !== "color-contrast").map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test("never reads or writes saved data", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("End");
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("spendwise:")))).toEqual([]);
});
