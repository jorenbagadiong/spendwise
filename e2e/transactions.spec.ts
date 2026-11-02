import { expect, test, type Page } from "@playwright/test";

import { accountBalance, cardValue, choose, navigate, open, readStored, seedStorage } from "./fixtures";

// Scenario B: create, edit, and delete each transaction type, checking the
// dashboard, account balances, and reports after every step.

type Expected = {
  january: { income: string; expenses: string; net: string };
  balances: { bank: string; cash: string; oldCard: string };
  consolidated: string;
};

async function expectFinancials(page: Page, expected: Expected) {
  await navigate(page, "Dashboard");
  await choose(page, "Month", "January 2026");
  await expect(cardValue(page, "Total Income")).toHaveText(expected.january.income);
  await expect(cardValue(page, "Total Expenses")).toHaveText(expected.january.expenses);
  await expect(cardValue(page, "Net Cash Flow")).toHaveText(expected.january.net);

  await navigate(page, "Reports");
  await choose(page, "Reporting period", "January 2026");
  await expect(cardValue(page, "Total Income")).toHaveText(expected.january.income);
  await expect(cardValue(page, "Total Expenses")).toHaveText(expected.january.expenses);
  await expect(cardValue(page, "Net Cash Flow")).toHaveText(expected.january.net);

  await navigate(page, "Accounts");
  await expect(accountBalance(page, "Metro Bank")).toHaveText(expected.balances.bank);
  await expect(accountBalance(page, "Pocket Cash")).toHaveText(expected.balances.cash);
  await expect(accountBalance(page, "Old Card")).toHaveText(expected.balances.oldCard);
  await expect(cardValue(page, "Consolidated Balance")).toHaveText(expected.consolidated);
}

async function openTransactions(page: Page) {
  await navigate(page, "Transactions");
  await choose(page, "Month", "All months");
}

async function fillForm(
  page: Page,
  values: { type?: "Income" | "Expense" | "Transfer"; date?: string; amount?: string; description?: string; account?: string; to?: string; category?: string },
) {
  const dialog = page.getByRole("dialog");
  if (values.type) await dialog.getByText(values.type, { exact: true }).click();
  if (values.date) await dialog.getByLabel("Date").fill(values.date);
  if (values.amount) await dialog.getByLabel("Amount (₱)").fill(values.amount);
  if (values.description) await dialog.getByLabel("Description").fill(values.description);
  if (values.account) await choose(page, /^(Received in|Paid from|From account)$/, values.account);
  if (values.to) await choose(page, "To account", values.to);
  if (values.category) await choose(page, "Category", values.category);
}

async function submit(page: Page, button: "Add transaction" | "Save changes") {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: button }).click();
  await expect(dialog).toBeHidden();
}

const start: Expected = {
  january: { income: "₱30,000.00", expenses: "₱13,750.50", net: "+₱16,249.50" },
  balances: { bank: "₱26,000.00", cash: "₱699.50", oldCard: "₱250.00" },
  consolidated: "₱26,949.50",
};

test("each create, edit, and delete applies its financial effect exactly once", async ({ page }) => {
  test.setTimeout(120_000);
  await seedStorage(page);
  await open(page, "/dashboard");
  await expectFinancials(page, start);

  // 1. Income ₱1,000 into Pocket Cash.
  await openTransactions(page);
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  await fillForm(page, { type: "Income", date: "2026-01-20", amount: "1000", description: "E2E income", account: "Pocket Cash", category: "Salary" });
  await submit(page, "Add transaction");
  await expectFinancials(page, {
    january: { income: "₱31,000.00", expenses: "₱13,750.50", net: "+₱17,249.50" },
    balances: { bank: "₱26,000.00", cash: "₱1,699.50", oldCard: "₱250.00" },
    consolidated: "₱27,949.50",
  });

  // 2. Expense ₱99.99 from Metro Bank.
  await openTransactions(page);
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  await fillForm(page, { type: "Expense", date: "2026-01-21", amount: "99.99", description: "E2E expense", account: "Metro Bank", category: "Food" });
  await submit(page, "Add transaction");
  await expectFinancials(page, {
    january: { income: "₱31,000.00", expenses: "₱13,850.49", net: "+₱17,149.51" },
    balances: { bank: "₱25,900.01", cash: "₱1,699.50", oldCard: "₱250.00" },
    consolidated: "₱27,849.51",
  });

  // 3. Transfer ₱500 Metro Bank → Pocket Cash: balances move, totals and consolidated don't.
  await openTransactions(page);
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  await fillForm(page, { type: "Transfer", date: "2026-01-22", amount: "500", description: "E2E transfer", account: "Metro Bank", to: "Pocket Cash" });
  await submit(page, "Add transaction");
  await expectFinancials(page, {
    january: { income: "₱31,000.00", expenses: "₱13,850.49", net: "+₱17,149.51" },
    balances: { bank: "₱25,400.01", cash: "₱2,199.50", oldCard: "₱250.00" },
    consolidated: "₱27,849.51",
  });

  // 4. Edit income ₱1,000 → ₱1,200: the difference is applied once.
  await openTransactions(page);
  await page.getByRole("button", { name: "Edit E2E income" }).filter({ visible: true }).click();
  await fillForm(page, { amount: "1200" });
  await submit(page, "Save changes");
  await expectFinancials(page, {
    january: { income: "₱31,200.00", expenses: "₱13,850.49", net: "+₱17,349.51" },
    balances: { bank: "₱25,400.01", cash: "₱2,399.50", oldCard: "₱250.00" },
    consolidated: "₱28,049.51",
  });

  // 5. Edit expense date into February: leaves January, balances unchanged.
  await openTransactions(page);
  await page.getByRole("button", { name: "Edit E2E expense" }).filter({ visible: true }).click();
  await fillForm(page, { date: "2026-02-03" });
  await submit(page, "Save changes");
  await expectFinancials(page, {
    january: { income: "₱31,200.00", expenses: "₱13,750.50", net: "+₱17,449.50" },
    balances: { bank: "₱25,400.01", cash: "₱2,399.50", oldCard: "₱250.00" },
    consolidated: "₱28,049.51",
  });
  await navigate(page, "Dashboard");
  await choose(page, "Month", "February 2026");
  await expect(cardValue(page, "Total Expenses")).toHaveText("₱899.99");

  // 6. Edit transfer ₱500 → ₱300.
  await openTransactions(page);
  await page.getByRole("button", { name: "Edit E2E transfer" }).filter({ visible: true }).click();
  await fillForm(page, { amount: "300" });
  await submit(page, "Save changes");
  await expectFinancials(page, {
    january: { income: "₱31,200.00", expenses: "₱13,750.50", net: "+₱17,449.50" },
    balances: { bank: "₱25,600.01", cash: "₱2,199.50", oldCard: "₱250.00" },
    consolidated: "₱28,049.51",
  });

  // 7. Delete all three: everything returns exactly to the starting values.
  for (const description of ["E2E income", "E2E expense", "E2E transfer"]) {
    await openTransactions(page);
    await page.getByRole("button", { name: `Delete ${description}` }).filter({ visible: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
  }
  await expectFinancials(page, start);

  // 8. Persisted: a full reload shows the same values and records.
  await page.reload();
  await expectFinancials(page, start);
  expect((await readStored(page))?.data.transactions).toHaveLength(6);
});

test("rejects invalid input inline without saving", async ({ page }) => {
  await seedStorage(page);
  await open(page, "/transactions");
  const before = await readStored(page);

  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const dialog = page.getByRole("dialog");
  await fillForm(page, { type: "Expense", date: "2025-12-31", amount: "0", description: "Too early" });
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(dialog.getByText("Amount must be greater than zero.")).toBeVisible();

  await fillForm(page, { amount: "12.345" });
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(dialog.getByText("Use at most two decimal places.")).toBeVisible();

  await fillForm(page, { amount: "10", account: "Metro Bank", category: "Food" });
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(dialog.getByText("Date is before Metro Bank was opened.")).toBeVisible();

  // Transfers can't use the same account twice.
  await fillForm(page, { type: "Transfer", date: "2026-01-15", account: "Metro Bank", to: "Metro Bank" });
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(dialog.getByText("Transfer source and destination must be different accounts.")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect((await readStored(page))?.revision).toBe(before?.revision);
});
