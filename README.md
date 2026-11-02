# Spend Wise Tracker

A modern, responsive, spreadsheet-style personal finance tracker for monitoring salary, daily expenses, multiple accounts, and remaining money.

The project is built frontend-first: the UI and data handling run entirely in the browser before any backend is introduced.

## Technology stack

| Area          | Choice                                                    | Installed version |
| ------------- | --------------------------------------------------------- | ----------------- |
| Framework     | [Next.js](https://nextjs.org) (App Router, Turbopack)     | 16.4.3            |
| UI library    | React                                                     | 19.3.0            |
| Language      | TypeScript (strict mode)                                  | 5.9.3             |
| Styling       | Tailwind CSS v4 (CSS-first config via `@tailwindcss/postcss`, no `tailwind.config`) | 4.3.3 |
| Components    | [shadcn/ui](https://ui.shadcn.com) (`base-nova` style, Base UI primitives, CSS variables) | CLI 4.23.0 |
| Icons         | Lucide React                                              | 1.66.0            |
| Theming       | [next-themes](https://github.com/pacocoursey/next-themes) (light/dark/system) | 0.4.6 |
| Linting       | ESLint 9 (flat config) + `eslint-config-next`             | 9.39.5            |
| Unit tests    | [Vitest](https://vitest.dev) (Node environment)           | 4.1.12            |
| Shared state  | [Zustand](https://zustand.docs.pmnd.rs) (in-memory transaction store) | 5.0.16 |
| Forms         | [React Hook Form](https://react-hook-form.com) + `@hookform/resolvers` | 7.91.0 / 7.0.1 |
| Validation    | [Zod](https://zod.dev)                                    | 4.6.7             |

Planned for later milestones: `localStorage` persistence (SW-008).

Vitest 4 is used instead of Vitest 5 because Vitest 5 requires Node.js 22.12+, and this project supports Node.js 20.9+.

## Prerequisites

- Node.js 20.9 or newer (developed on Node.js 22)
- npm 10 or newer

## Installation

```bash
git clone https://github.com/jorenbagadiong/spendwise.git
cd spendwise
npm install
```

## Development commands

| Command             | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `npm run dev`       | Start the development server at http://localhost:3000                 |
| `npm run build`     | Create a production build                                             |
| `npm run start`     | Serve the production build (run `npm run build` first)                |
| `npm run lint`      | Run ESLint across the project                                         |
| `npm run typecheck` | Generate Next.js route types, then type-check with `tsc --noEmit`     |
| `npm test`          | Run the unit tests once (Vitest)                                      |
| `npm run test:watch`| Re-run unit tests on file changes                                     |

`npm run dev` redirects `/` to `/dashboard`.

Add shadcn/ui components when a feature needs them:

```bash
npx shadcn@latest add <component>
```

## Folder structure

```
spendwise/
├── src/
│   ├── app/                        # App Router: routes, layouts, global styles
│   │   ├── (app)/                  # Route group: pages that share the app shell
│   │   │   ├── layout.tsx          # Shell: sidebar + header + main content
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── globals.css             # Tailwind v4 import, theme tokens (CSS variables)
│   │   ├── layout.tsx              # Root layout: fonts, metadata, ThemeProvider
│   │   └── favicon.ico
│   ├── components/
│   │   ├── layout/                 # App shell components
│   │   │   ├── app-header.tsx      # Page title/description, date, theme menu, drawer trigger
│   │   │   ├── app-sidebar.tsx     # Desktop sidebar and the shared AppBrand
│   │   │   ├── mobile-navigation.tsx # Drawer navigation below the `lg` breakpoint
│   │   │   ├── page-placeholder.tsx  # Temporary "coming soon" state for unbuilt pages
│   │   │   ├── sidebar-nav.tsx     # Navigation links with active-route highlighting
│   │   │   ├── theme-provider.tsx  # next-themes provider
│   │   │   └── theme-toggle.tsx    # Light / Dark / System menu
│   │   ├── accounts/
│   │   │   ├── accounts-view.tsx   # Summary, account cards, notices (client)
│   │   │   ├── account-form-dialog.tsx # Add/edit account form (React Hook Form + Zod)
│   │   │   └── archive-account-dialog.tsx # Archive confirmation (alert dialog)
│   │   ├── categories/
│   │   │   ├── categories-view.tsx # Summary, type filter, category list, notices (client)
│   │   │   ├── category-form-dialog.tsx # Add/edit category: name, type, icon, color
│   │   │   ├── archive-category-dialog.tsx # Archive confirmation (alert dialog)
│   │   │   └── category-icon-badge.tsx # Category icon on its color
│   │   ├── dashboard/
│   │   │   ├── financial-dashboard.tsx # Month selector, summary cards, empty state (client)
│   │   │   └── summary-card.tsx    # Reusable summary card (title, value, icon, tone)
│   │   ├── transactions/
│   │   │   ├── transactions-view.tsx # Filters, table/list, row actions, notices, pagination (client)
│   │   │   ├── transaction-form-dialog.tsx # Add/edit form (React Hook Form + Zod) in a dialog
│   │   │   └── delete-transaction-dialog.tsx # Delete confirmation (alert dialog)
│   │   └── ui/                     # shadcn/ui components (alert-dialog, button, card, dialog, dropdown-menu,
│   │                               #   field, input, label, select, separator, sheet, table)
│   ├── config/
│   │   ├── category-appearance.ts  # Category icon keys → Lucide icons, color keys → classes
│   │   └── navigation.ts           # Routes, titles, descriptions, icons (single source)
│   ├── data/
│   │   ├── mock-finance.ts         # Deterministic sample accounts, categories, transactions
│   │   └── mock-finance.test.ts    # Checks mock data is valid and matches hand-calculated totals
│   ├── lib/
│   │   ├── finance/
│   │   │   ├── accounts.ts         # Account name rules, account form schemas, selectable accounts
│   │   │   ├── categories.ts       # Category rules, icon/color lists, form schema, selectable categories, usage
│   │   │   ├── calculations.ts     # Pure income/expense/balance/summary functions
│   │   │   ├── money.ts            # formatCurrency (centavos → "₱1,234.56")
│   │   │   ├── months.ts           # Month keys, labels, Asia/Manila "today", reporting cutoff
│   │   │   ├── transactions.ts     # Pure filter, sort, paginate, and amount display helpers
│   │   │   ├── transaction-form.ts # Form values, Zod schema, pesos → centavos for the form
│   │   │   ├── validation.ts       # Business rules TypeScript can't express
│   │   │   └── *.test.ts           # Unit tests next to the code they test
│   │   ├── ids.ts                  # Sequential id helper ("acct-001", "txn-031")
│   │   └── utils.ts                # Shared helpers (`cn` class-name merging)
│   ├── stores/
│   │   ├── account-store.ts        # Zustand store factory: accounts + add/update/archive/restore
│   │   ├── account-store-provider.tsx # React context provider and useAccountStore hook
│   │   ├── account-store.test.ts
│   │   ├── category-store.ts       # Zustand store factory: categories + add/update/archive/restore
│   │   ├── category-store-provider.tsx # React context provider and useCategoryStore hook
│   │   ├── category-store.test.ts
│   │   ├── transaction-store.ts    # Zustand store factory: transactions + add/update/delete
│   │   ├── transaction-store-provider.tsx # React context provider and useTransactionStore hook
│   │   └── transaction-store.test.ts
│   └── types/
│       └── finance.ts              # Account, Category, Transaction, MonthlySummary
├── components.json                 # shadcn/ui configuration
├── eslint.config.mjs               # ESLint flat config
├── next.config.ts                  # Next.js config (Cache Components, `/` redirect)
├── postcss.config.mjs              # Tailwind CSS v4 PostCSS plugin
├── tsconfig.json                   # TypeScript config (strict mode, `@/*` → `src/*`)
├── vitest.config.mts               # Vitest config (mirrors the `@/*` alias)
└── AGENTS.md                       # Next.js-generated notes for AI coding agents
```

A `src/hooks` folder will be added only when a milestone needs it.

## Routes

| Path            | Page                                   | Milestone                                                   |
| --------------- | -------------------------------------- | ----------------------------------------------------------- |
| `/`             | Redirects to `/dashboard` (temporary 307, set in `next.config.ts`) | SW-002                          |
| `/dashboard`    | Financial summary dashboard            | SW-003 (done)                                               |
| `/transactions` | Transaction table with add/edit/delete | SW-004 (done), SW-005 (done)                                |
| `/accounts`     | Account management                     | SW-006 (done)                                               |
| `/categories`   | Category management                    | SW-007 (done)                                               |
| `/reports`      | Reports (placeholder)                  | SW-008                                                      |
| `/settings`     | Settings (placeholder)                 | SW-002 (theme, in the header menu), SW-008 (local data)     |

All pages live in the `(app)` route group, so they share one layout and the sidebar and header are never duplicated. To add a section, add an entry to `src/config/navigation.ts` and a `page.tsx` under `src/app/(app)/`.

## Theme behavior

- Three options in the header theme menu: **Light**, **Dark**, and **System** (default, follows the OS setting and reacts live when it changes).
- The choice is saved in `localStorage` under the `theme` key and restored on the next visit.
- No flash on load: `next-themes` injects a small blocking script that sets the `.dark` class on `<html>` before the first paint. `<html>` has `suppressHydrationWarning` because that class is added before React hydrates.
- Colors are CSS variables in `src/app/globals.css` (`:root` for light, `.dark` for dark). Components use semantic classes such as `bg-background`, `text-primary`, and `bg-sidebar`, so the palette changes in one place.
  - **Dark:** deep navy background, lighter navy surfaces, emerald accent.
  - **Light:** soft off-white background, white surfaces, darker emerald accent for readable contrast.

## Responsive navigation

- **1024px and wider (`lg`):** a fixed-width (16rem) sidebar stays in place while the page scrolls. The header is sticky.
- **Below 1024px:** the sidebar is hidden and a menu button in the header opens it as a left-side drawer (shadcn/ui Sheet, built on the Base UI Dialog).
  - Closes after choosing a link, on Escape, on the close button, or on clicking the backdrop.
  - Focus moves into the drawer, stays trapped there while it's open, and returns to the menu button on close.
- The current page link has `aria-current="page"` and a subtle emerald highlight.
- The date in the header is hidden below 640px (`sm`) to save space. Layouts were checked for horizontal overflow at 320px, 375px, 768px, 1024px, and 1440px.

## Financial data model (SW-003)

Defined in `src/types/finance.ts`.

- **Money is stored as integer centavos** (`₱18,500.00` → `1_850_000`). Integers add and subtract exactly; floating-point pesos don't (`0.1 + 0.2 !== 0.3`). Pesos only appear when formatting for display.
- **Dates** are calendar dates in Asia/Manila, stored as `"YYYY-MM-DD"` strings. Months are `"YYYY-MM"`. Because these are plain calendar dates, filtering by month is a string comparison with no time zone conversion.
- **Account:** `id`, `name`, `type` (`cash` | `bank` | `e_wallet`), `openingBalance` (centavos), `openingDate`, `isActive`.
- **Category:** `id`, `name`, `type` (`income` | `expense`), `icon` (a Lucide icon identifier), `color` (a palette key), and `isActive` (added in SW-007).
- **Transaction:** a discriminated union on `type`:
  - `income` / `expense`: require `categoryId` and can't have `destinationAccountId`.
  - `transfer`: requires `destinationAccountId` and can't have `categoryId`.
  - `amount` is always a positive integer. The type decides the direction.
- **`TransactionInput`** is a transaction without an `id` (what forms produce). It keeps the same discriminated union.
- **`AccountInput`** (name, type, opening balance, opening date) creates an account. **`AccountUpdate`** (name and type only) is the only shape `updateAccount` accepts, so TypeScript itself prevents editing the opening balance or date.
- **Rules TypeScript can't check** live in `validateTransaction` (`src/lib/finance/validation.ts`). Each problem is returned as `{ field, message }` so forms can show it next to the right input:
  - Transfer source and destination accounts are different.
  - Amounts are positive integers.
  - Dates are real calendar dates (`2026-02-30` is rejected) and not before the account's opening date.
  - Accounts and categories exist, and the category type matches the transaction type.

## Mock data

`src/data/mock-finance.ts` holds fixed sample data in Philippine pesos. It is plain data, separate from the UI, and never randomly generated. The mock transactions (SW-005), accounts (SW-006), and categories (SW-007) seed the in-memory stores.

- **Accounts (opened Jul 1, 2026):**
  - BPI Savings (bank, ₱45,000.00)
  - GCash (e-wallet, ₱2,500.00)
  - Maya (e-wallet, ₱1,200.00)
  - Cash Wallet (cash, ₱3,000.00)
- **Categories:**
  - Income: Salary, Other Income
  - Expenses: Food, Groceries, Bills, Transportation, Shopping, Entertainment, Other Expenses
- **30 transactions:**

| Month          | Transactions | Income      | Expenses    | Notes                                         |
| -------------- | ------------ | ----------- | ----------- | --------------------------------------------- |
| July 2026      | 9            | ₱37,000.00  | ₱7,825.65   | Two salary payments, one transfer             |
| August 2026    | 11           | ₱39,500.00  | ₱12,458.25  | Two salaries, freelance income, two transfers |
| September 2026 | 0            | ₱0.00       | ₱0.00       | Intentionally empty month                     |
| October 2026   | 8            | ₱38,500.00  | ₱18,689.60  | Salary increase, large purchase, one transfer |
| November 2026  | 2            | ₱0.00       | ₱485.00     | Month in progress (Nov 1–2)                   |

A unit test checks that every mock transaction passes validation, that no account balance ever goes negative, and that the monthly totals match these hand-calculated values.

## Calculation rules

All calculations are pure functions in `src/lib/finance/calculations.ts`. Components display results; they never do their own arithmetic.

| Function                       | What it returns                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `filterTransactionsByMonth`    | Transactions dated within a `"YYYY-MM"` month                                   |
| `calculateTotalIncome`         | Sum of `income` transactions                                                    |
| `calculateTotalExpenses`       | Sum of `expense` transactions                                                   |
| `calculateNetCashFlow`         | Income minus expenses (can be negative)                                         |
| `calculateAccountBalance`      | Opening balance plus all of the account's transactions up to a cutoff date      |
| `calculateTotalAccountBalance` | Sum of every account's balance at a cutoff date                                 |
| `calculateMonthlySummary`      | Month totals plus the total balance at that month's reporting cutoff            |
| `formatCurrency` (`money.ts`)  | `123456` → `"₱1,234.56"`; negative → `"-₱1,234.56"`; optional `+` sign          |

Rules:

1. **Amounts are integer centavos.** No floating-point pesos in calculations.
2. **Transfers are not income or expenses.** They move money out of one account and into another, so the total balance is unchanged.
3. **Opening balances are not income.** They're the starting point for each account's balance.
4. **Monthly income, expenses, and net cash flow** use only the selected month's transactions.
5. **Account balances use the full history** up to the reporting cutoff. Transactions are never filtered down to one month before calculating a balance.
6. **Reporting cutoff:** month end for past months, today for the current month. The card label always says which one ("at month end, Oct 31, 2026" or "as of today, Nov 2, 2026"), so current and month-end balances are never mixed silently.
7. **Asia/Manila time zone:** "today" is computed on the server with `Intl.DateTimeFormat` and `timeZone: "Asia/Manila"`, so it's the same whatever the server's or visitor's time zone.
8. **Empty data is safe:** no accounts or no transactions produce `0`, never `NaN` or an error.
9. **Inactive accounts still count** toward the total balance, so money held in them is never silently dropped.

`formatCurrency` uses integer and string operations rather than `Intl.NumberFormat`. That keeps the output identical on the server and in every browser, so it can't cause hydration mismatches.

## Dashboard

`/dashboard` shows a monthly summary with four cards:

| Card                  | Value                                             | Color                                  |
| --------------------- | ------------------------------------------------- | -------------------------------------- |
| Total Income          | Income in the selected month                      | Emerald (`--income`)                   |
| Total Expenses        | Expenses in the selected month                    | Rose (`--expense`)                     |
| Net Cash Flow         | Income minus expenses, signed (`+₱…` / `-₱…`)     | Emerald if positive, rose if negative  |
| Total Account Balance | All accounts at the reporting cutoff, with label  | Neutral                                |

- Cards are 1 column on mobile, 2 from 640px, and 4 from 1280px.
- `--income` and `--expense` are new semantic color tokens in `globals.css`, with light and dark values. The existing theme colors are unchanged.

### Month selection

- **Default:** the current month in Asia/Manila.
- **Options:** every month from the earliest account opening or transaction through the current month, newest first. Months with no transactions (September 2026) are included; future months are not. The list is computed by `getSelectableMonths`, and only listed values are accepted, so an invalid month can't be selected.
- **On change:** income, expenses, net cash flow, the transaction count, and the balance all recalculate. The transaction count is announced to screen readers through a polite live region.
- **State:** the selected month is local React state (`useState`). No global store is needed yet.
- **Empty month:** income, expenses, and net cash flow show `₱0.00`, a "No transactions in …" message appears, and the balance still carries forward opening balances and earlier transactions.
- **Rendering:** the page shell is prerendered. The dashboard content renders per request (`connection()` inside `<Suspense>`), because "today" must not be frozen at build time. The server passes `today` to the client component as a prop, so the server and browser render identical HTML.

## Transactions table (SW-004)

`/transactions` shows the transactions in a spreadsheet-style table. Adding, editing, and deleting were added in SW-005 (see below).

### Columns

| Column      | Content                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------- |
| Date        | `Nov 2, 2026` (in a `<time>` element)                                                     |
| Description | Wraps on narrow screens                                                                   |
| Category    | Category name. Transfers have none and show "—" (read as "No category")                  |
| Account     | Account name. Transfers show source → destination, e.g. `BPI Savings → GCash`             |
| Type        | Income, Expense, or Transfer badge                                                        |
| Amount      | Right-aligned: income `+₱18,500.00` (emerald), expense `-₱560.00` (rose), transfer `₱3,000.00` (neutral) |

### Filtering

All filters combine (AND), and every change returns to page 1.

| Filter   | Behavior                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------ |
| Search   | Case-insensitive match on description **or** category name; surrounding spaces are ignored      |
| Month    | Defaults to the current month (Asia/Manila). Lists every month from the earliest data to today, plus "All months" |
| Type     | All, Income, Expense, or Transfer                                                                |
| Account  | Matches the transaction's account **or** a transfer's destination, so transfers in and out both appear |
| Category | Grouped into Income and Expense. Transfers have no category, so they never match a specific category |

**Clear filters** restores the defaults (current month, everything else unfiltered). It is disabled when the filters are already at their defaults, and it doesn't change the sort order.

### Sorting

Newest first (default), oldest first, highest amount, or lowest amount. Sorting applies to the filtered results.

- Amounts are compared as integer centavos.
- Ties are broken by date (newest first) and then by transaction id, so the order is always the same.
- `sortTransactions` returns a sorted copy; the mock data array is never changed.

### Pagination

10 rows per page, shown as "Showing 11–20 of 30" with "Page 2 of 3". Previous and Next are disabled on the first and last pages. The page controls are hidden when everything fits on one page.

### Empty states

| Situation                                | Message                                  | Action            |
| ---------------------------------------- | ---------------------------------------- | ----------------- |
| No transactions at all                   | "No transactions yet"                    | None              |
| Only the month is filtered and it's empty | "No transactions in September 2026"     | Show all months   |
| A search with no matches                 | "No results for “…”"                     | Clear filters     |
| Other filter combinations with no matches | "No transactions match these filters"   | Clear filters     |

### Responsive behavior

- **768px and wider:** the full table. Description, category, and account wrap so the table fits without horizontal scrolling, down to 768px and alongside the sidebar at 1024px.
- **Below 768px:** a stacked list. Each item shows description and amount on the first line, then type, date, category, and account. No information is hidden.
- **Filters:** one column on mobile, two from 640px, and three from 1280px.

### Accessibility

- A real `<table>` with column headers and a visually hidden caption describing the sort order and the visible range.
- Labelled search box and filter selects, all usable with the keyboard.
- The result count is announced through a polite live region.
- Visually hidden "Filters" and "Results" headings for screen reader navigation.
- Pagination is a labelled `<nav>`, with "Previous page" and "Next page" button labels.

The filter, sort, and page state is local React state. Like the dashboard, the page computes "today" on the server per request so the default month matches between the server and the browser.

## Transaction CRUD (SW-005)

Transactions can be added, edited, and deleted on `/transactions`.

> **Transactions are currently stored in memory and reset after a full browser refresh. Persistent localStorage support is planned for SW-008.**

### Add and edit

- **Add transaction** opens a dialog. Each row has **Edit** and **Delete** buttons (icon buttons in the table, labelled buttons in the mobile list).
- The form defaults to **Expense**, dated today (Asia/Manila). The type selector (Expense, Income, Transfer) is a radio group, so arrow keys switch between types.
- The fields adapt to the type:

| Type     | Account field                    | Second field                     |
| -------- | -------------------------------- | -------------------------------- |
| Expense  | Paid from                        | Category (expense categories)    |
| Income   | Received in                      | Category (income categories)     |
| Transfer | From account                     | To account (no category)         |

- Changing the type clears a category or destination that no longer applies.
- Account lists show active accounts only. When editing, an archived account the transaction already uses stays available, labelled "(archived)" (see SW-006).
- **Edit** opens the same form filled with the transaction's values. Any field can change, including the type. Saving replaces the record and keeps its id.
- Validation errors appear inline under each field. Invalid fields are marked `aria-invalid` and the messages are announced. The dialog stays open until the form is valid.
- After saving, the dialog closes and a message confirms it ("Added “Lunch”."). **Filters are never reset.** If the saved record doesn't match the current filters, the message says "It's hidden by the current filters."
- If the record being edited no longer exists, the form shows "This transaction no longer exists" instead of creating a duplicate.

### Delete

- **Delete** opens a confirmation dialog showing the description, signed amount, and date.
- **Cancel** (or Escape) leaves the data unchanged. **Delete** removes the record. Focus then moves to the Add transaction button, because the deleted row's button no longer exists.
- Deletion is permanent for this in-memory prototype. Audit history will be revisited with the backend.

### Validation rules

The form uses React Hook Form with a Zod schema (`createTransactionFormSchema` in `src/lib/finance/transaction-form.ts`). The schema's account and category checks reuse the SW-003 `validateTransaction` rules.

| Field        | Rules                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Amount       | Required, greater than zero, at most two decimals, at most ₱999,999,999.99. Digits with optional correctly grouped commas (`1,250.50`). Rejects `1e3`, `Infinity`, `NaN`, `-5`, `.5`, `12.`, `₱100`, and `1.234`. **Never rounded.** |
| Date         | A real calendar date, not before the account's opening date                                              |
| Description  | Required, not whitespace-only, at most 120 characters, trimmed when saved                                |
| Account(s)   | Must exist and be active (or, when editing, be the archived account the transaction already used). A transfer's source and destination must differ. |
| Category     | Required for income and expenses, must exist, match the type, and be active (or, when editing, be the archived category the transaction already used). Transfers have no category. |

**Pesos to centavos:** `parsePesosToCentavos` (`src/lib/finance/money.ts`) converts the typed text using string operations only. `"0.29"` becomes exactly `29`, whereas `0.29 * 100` in floating point is `28.999999999999996`.

### State architecture

```
(app)/layout.tsx
└── AccountStoreProvider              ← accounts store (SW-006)
    └── CategoryStoreProvider         ← categories store (SW-007)
        └── TransactionStoreProvider  ← transactions store; validates against accounts + categories
            ├── /dashboard    → FinancialDashboard   reads accounts + transactions
            ├── /transactions → TransactionsView     reads accounts + categories + transactions
            │                    ├── TransactionFormDialog   calls addTransaction / updateTransaction
            │                    └── DeleteTransactionDialog calls deleteTransaction
            ├── /accounts     → AccountsView         reads accounts + transactions
            │                    ├── AccountFormDialog       calls addAccount / updateAccount
            │                    └── ArchiveAccountDialog    calls archiveAccount (restore is a button)
            └── /categories   → CategoriesView       reads categories + transactions
                                 ├── CategoryFormDialog      calls addCategory / updateCategory
                                 └── ArchiveCategoryDialog   calls archiveCategory (restore is a button)
```

- **One source of truth:** the store holds the transactions array and three actions. Pages never copy transactions into their own state.
- **Per-session store:** the store is created in a React context provider (Zustand's recommended pattern for Next.js), not as a module-level global. Each browser session, and each server request, gets its own store. It lives in the `(app)` layout, which stays mounted during client-side navigation, so the dashboard and the table always show the same data.
- **Actions:**

| Action                           | Behavior                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `addTransaction(input)`          | Validates (see SW-007), assigns the next id (`txn-031`, `txn-032`, …; never reuses a taken id), and returns `{ ok: true, transaction }` |
| `updateTransaction(id, input)`   | Validates, then replaces the whole record (so fields from an old type don't linger) and keeps the id. Unknown ids return `{ ok: false, error }` |
| `deleteTransaction(id)`          | Removes the record and returns it. Returns `null` for an unknown id                            |

- **Immutable updates:** every action creates a new array, so React and Zustand detect changes by reference.
- **No stored totals:** income, expenses, net cash flow, and balances are always derived from the transactions with the SW-003 functions. Editing or deleting a transaction automatically updates every total, including the transfer effect on both accounts and historical month-end balances.
- **No persistence:** no Zustand `persist` middleware, `localStorage`, or `sessionStorage` (planned for SW-008).

## Account management (SW-006)

`/accounts` manages the bank accounts, e-wallets, and cash wallets that transactions belong to.

> Accounts are stored in memory like transactions and reset after a full browser refresh. Persistent localStorage support is planned for SW-008.

### Accounts page

- **Summary:** consolidated balance (every account, **including archived ones**, as of today in Asia/Manila), plus active and archived counts.
- **Account cards**, one per account:
  - Name, type (Bank, E-wallet, Cash), and Active/Archived status.
  - Current balance as of today. Negative balances show with a minus sign in the expense color.
  - Opening balance and date, and how many transactions use the account.
  - **Edit**, **Archive** or **Restore**, and **Transactions**. The last is a link to `/transactions?account=<id>`, which opens the table filtered to that account across all months.
- Cards keep their order when archived or restored, so keyboard focus stays on the toggled button.
- An empty state with an Add account button appears if there are no accounts.

### Account data model

| Field            | Rules                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `id`             | Generated (`acct-001`, `acct-002`, …), never reused, never changes. Mock accounts keep their ids (`bpi-savings`, …). |
| `name`           | Required, trimmed, at most 60 characters. Unique, compared case-insensitively against **all** accounts, archived included. |
| `type`           | `bank`, `e_wallet`, or `cash`. Can be edited.                                                   |
| `openingBalance` | Integer centavos, zero or positive. **Not income.** Can't be edited after creation.             |
| `openingDate`    | A real calendar date. Can't be edited after creation.                                           |
| `isActive`       | `false` when archived.                                                                          |

There is **no stored balance field.** Balances are always calculated from the opening balance and transaction history with the SW-003 functions.

### Adding and editing

- **Add account** opens a dialog: name, type (Bank, E-wallet, Cash), opening balance (₱, defaults to 0.00), and opening date (defaults to today).
  - The opening balance uses the same exact pesos-to-centavos parser as transactions, with zero allowed. Negative amounts and more than two decimals are rejected. Nothing is rounded.
  - Errors appear inline, and the dialog stays open until the form is valid. On success it closes and a message confirms the new account.
- **Edit** changes only the name and type. The opening balance and date are shown read-only. Changing them would silently rewrite every historical balance, so a future milestone should add an explicit adjustment or reconciliation workflow instead.
- A duplicate name for an archived account suggests restoring it instead.

### Archiving and restoring

- Accounts are **never deleted**, only archived, so every transaction can always resolve its account.
- **Archive** asks for confirmation and shows how many transactions use the account and its current balance.
- Archived accounts:
  - **Stay in every calculation:** consolidated balance, dashboard totals, and historical month-end balances. Archiving doesn't change any balance.
  - **Are hidden from new transactions.** The form and the schema both reject them.
  - **Remain readable on existing transactions.** Editing a transaction that uses an archived account shows it as "GCash (archived)" and lets you keep it, but you can't move a transaction onto a *different* archived account.
  - **Stay in the transactions account filter** (labelled "(archived)"), so their history can still be filtered.
- **Restore** is immediate and makes the account selectable again.

### Transaction integration

- The dashboard, transactions table, transaction form, and accounts page all read the same account store, so new accounts appear in forms right away and renames show up everywhere.
- Income credits an active account ("Received in"), expenses debit one ("Paid from"), and transfers need two different active accounts.
- A transaction can't be dated before its account's opening date (already enforced by `validateTransaction`). This also applies to new accounts.
- Account changes never touch the transaction store.

### State

`createAccountStore` follows the transaction store pattern. Its actions return `{ ok: true, account }` or `{ ok: false, error }`, because account changes can fail validation (e.g. duplicate names):

| Action                     | Behavior                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `addAccount(input)`        | Validates (same rules as the form), assigns the next `acct-` id, creates it active            |
| `updateAccount(id, update)`| Changes name and type only. Extra fields passed at runtime are ignored                        |
| `archiveAccount(id)`       | Sets `isActive: false`. Safe to repeat                                                        |
| `restoreAccount(id)`       | Sets `isActive: true`. Safe to repeat                                                         |

Unknown ids return `{ ok: false, error: "This account no longer exists." }`. Every update creates new arrays and objects.

### Activity: pages keep their state

With Cache Components, Next.js 16 doesn't unmount pages when you navigate away. It hides up to three recent pages with React's `<Activity>` and restores their state when you return. So transaction filters survive a visit to the dashboard. The transactions page uses `key={accountId}` so each "View transactions" link starts with fresh filters for that account.

## Category management (SW-007)

`/categories` manages the income and expense categories that transactions use.

> Categories are stored in memory like transactions and accounts, and reset after a full browser refresh. Persistent localStorage support is planned for SW-008.

### Categories page

- **Summary:** total, income, and expense category counts, each with how many are archived.
- **Filter:** All, Income, or Expense, a radio group showing a count for each. Add category preselects the filtered type.
- **List**, one row per category:
  - Icon on its color, name, and type.
  - Usage count (number of transactions), Active/Archived status.
  - **Edit** and **Archive** or **Restore**.
- Rows keep their order when archived or restored, so focus stays on the toggled button.
- Empty states for no categories at all and for a filter with no matches.

### Category data model and rules

| Field      | Rules                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `id`       | Generated (`cat-001`, …), never reused, never changes. Mock categories keep their ids (`food`, …). |
| `name`     | Required, trimmed, at most 50 characters. Unique **within its type**, compared case-insensitively, archived categories included. "Other" can exist once as income and once as expense. |
| `type`     | `income` or `expense`. **Can't change after creation**, so existing transactions stay valid.      |
| `icon`     | One of 25 Lucide icons (`CATEGORY_ICONS`). Anything else is rejected.                              |
| `color`    | One of 11 palette colors (`CATEGORY_COLORS`). Anything else is rejected.                           |
| `isActive` | `false` when archived.                                                                            |

- Categories are **never deleted**, only archived, so every transaction can always resolve its category.
- Transfers never have a category. The transaction model makes `categoryId` impossible on a transfer, and changing a transaction to a transfer drops its category.
- Icon keys map to Lucide components, and color keys to Tailwind classes, in one file (`src/config/category-appearance.ts`). Records keyed by the union types make TypeScript flag any icon or color without a mapping. The existing theme colors are unchanged.

### Adding and editing

- **Add category** opens a dialog: name, type (Expense or Income), an icon picker, and a color picker, with a live preview. The pickers are radio groups, so arrow keys move through them.
- Errors appear inline under the field. The dialog stays open until the form is valid.
- **Edit** changes the name, icon, and color. The type is shown but can't be changed. Archived categories can be edited too.
- `createCategoryFormSchema` (Zod) handles both modes. When editing, it ignores any submitted type and checks duplicates against the category's real type.

### Archiving and restoring

- **Archive** asks for confirmation and says how many transactions use the category.
- Archived categories:
  - **Stay on historical transactions,** which still show the category name, and in totals. Archiving changes no amounts.
  - **Are hidden from new transactions** in the form, and rejected by the store.
  - **Stay on the transaction being edited.** Editing a transaction that uses one shows it as "Shopping (archived)", and it can be kept, but no transaction can be moved onto a *different* archived category.
  - **Stay in the transactions category filter** (labelled "(archived)"), so their history can still be filtered.
- **Restore** is immediate and makes the category selectable again.

### Transaction integration

- The transactions table, filters, search, and form all read the shared category store. New categories appear in the form immediately, and renames show up in the table, the filter, and search.
- The form lists only categories of the selected type: income categories for income, expense categories for expenses, and none for transfers. Switching type clears a category that no longer fits.
- **Validation at the state-action boundary:** `addTransaction` and `updateTransaction` now check every transaction with `validateTransactionChange` (`src/lib/finance/validation.ts`) before saving. This covers:
  - Accounts and categories exist.
  - The category type matches the transaction type.
  - Accounts and categories are active, except the archived ones the edited transaction already used.
  - Opening dates and distinct transfer accounts.
  - The form schema runs the same function, so the UI and the store can't disagree. A rejected save returns `{ ok: false, error, issues }`, and the form shows each issue under its field.
- The transaction store reads accounts and categories through getters passed in by its provider. That's why `TransactionStoreProvider` sits inside the account and category providers.

### Usage counts

`countCategoryUsage` counts the income and expense transactions that use a category. Transfers are never counted. It's calculated from the current transaction store on every render and never stored, so it updates after any add, edit, or delete.

### State

| Action                        | Behavior                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `addCategory(input)`          | Validates name, type, icon, and color, assigns the next `cat-` id, creates it active |
| `updateCategory(id, update)`  | Changes name, icon, and color only (`CategoryUpdate` has no `type`)               |
| `archiveCategory(id)`         | Sets `isActive: false`. Safe to repeat                                            |
| `restoreCategory(id)`         | Sets `isActive: true`. Safe to repeat                                             |

Results are `{ ok: true, category }` or `{ ok: false, error }`. Unknown ids return "This category no longer exists."

## Testing

```bash
npm test             # run once
npm run test:watch   # watch mode
```

Unit tests (`*.test.ts`) sit next to the code they test and use small, fixed fixtures. They cover:

- Income, expense, and net totals
- Transfer exclusion, and transfers preserving the consolidated balance
- Opening balances
- Month boundaries (first and last day of a month, the previous month's last day)
- Historical and carried-forward balances, and the today cutoff for the current month
- Empty months, empty datasets, and zero values
- Currency formatting
- Leap years and Asia/Manila date boundaries
- Transaction validation, including `@ts-expect-error` checks that invalid transaction shapes don't compile
- Transaction search (case-insensitive, description and category name)
- Type, account (including transfer source and destination), category, and month filters, alone and combined
- Sorting by date and amount, deterministic tie-breaking, and sorting filtered results
- Empty results, pagination ranges and clamping, filter defaults
- Immutability: filtering, sorting, and paging never change the source data
- Store actions: creating income, expenses, and transfers; editing amounts, accounts, dates, and types; deleting; unknown ids; unique ids; per-test store isolation
- Financial integrity after each action (balances, transfers on both accounts, month totals, historical balances, opening balances)
- Filtering and sorting store data after adds and edits
- Peso parsing (valid formats, malformed input, floating-point edge cases) and calendar-date validation
- Form schema: valid income, expense, and transfer; every rejection rule; switching types
- Account names (empty, too long, duplicates across case and archived accounts), opening balances (zero, negative, decimals), and opening dates
- Account store: creating, editing (name and type only, compile-time and runtime), archiving, restoring, unknown ids, unique ids
- Archived accounts in transaction forms: kept when already used, rejected for new transactions or reassignment
- Accounts with transactions: archived accounts in totals, opening balances not counted as income, transfers to new accounts, negative balances, dates before opening, filtering archived history
- Category names (empty, too long, duplicates within a type across case and archived categories), unsupported icons and colors, and the immutable type (compile time and runtime)
- Category store: creating, editing (including archived categories), archiving, restoring, missing ids, unique ids
- Transaction store validation at the action boundary: nonexistent, wrong-type, and archived categories; archived accounts; keeping an edited transaction's own archived category but not reassigning to another; transfers without categories
- Selectable categories per type, usage counts after transaction changes (transfers excluded), renamed-category search, archived-category filtering

## Current features

- **SW-001:** project scaffold with Next.js App Router, TypeScript strict mode, Tailwind CSS v4, shadcn/ui, and Lucide icons
- **SW-002:** responsive app shell
  - Sidebar with active-route highlighting and a mobile drawer
  - Header with page title, description, and today's date
  - Light/dark/system theme with a navy and emerald palette
  - Placeholder pages for all six sections
- **SW-003:** financial summary dashboard
  - Typed financial models and deterministic PHP mock data
  - Pure, unit-tested calculation and formatting utilities
  - Summary cards for income, expenses, net cash flow, and total balance
  - Month selector with an empty-month state
- **SW-004:** transactions table
  - Spreadsheet-style table on desktop, stacked list on mobile
  - Search, filters by month, type, account, and category, and four sort orders
  - Pagination and contextual empty states
- **SW-005:** transaction CRUD
  - Add, edit, and delete income, expenses, and transfers in dialogs
  - React Hook Form + Zod validation with inline errors
  - Shared Zustand store, so the dashboard and table update immediately
- **SW-006:** account management
  - Accounts page with consolidated balance and per-account calculated balances
  - Add, edit (name and type), archive, and restore accounts
  - Shared account store used by the dashboard, table, and transaction form
- **SW-007:** category management
  - Categories page with type filter, usage counts, add/edit (name, icon, color), archive, and restore
  - Shared category store used by the transaction table, filters, search, and form
  - Transaction store validates accounts and categories itself

## Development progress

A story is checked only when its acceptance criteria and verification checks (typecheck, lint, unit tests, build, and browser checks where applicable) pass.

- [x] **SW-001** — Project setup (Next.js, TypeScript, Tailwind v4, shadcn/ui, Lucide, ESLint, starter page)
- [x] **SW-002** — Application layout (sidebar, header, mobile drawer, routes, light/dark/system theme)
- [x] **SW-003** — Financial dashboard and mock data (summary cards, month selector, calculation utilities, unit tests)
- [x] **SW-004** — Transactions table (spreadsheet-style, read-only view with search, filters, sorting, and pagination)
- [x] **SW-005** — Transaction CRUD (add, edit, and delete transactions; React Hook Form + Zod; shared Zustand store)
- [x] **SW-006** — Account management (add, edit, archive, and restore accounts; calculated balances; shared account store)
- [x] **SW-007** — Category management (add, edit, archive, and restore categories; icons and colors; usage counts; shared category store)
- [ ] **SW-008** — Persistence and reports (`localStorage`, Reports page, Settings data management)

### Milestone dependencies

- **SW-004 → SW-005:** CRUD builds on the transactions table, which becomes the place to add, edit, and delete entries.
- **SW-005 depends on accounts and categories.** Every transaction references an account (and a destination account for transfers). Income and expense transactions also reference a category. Until SW-006 and SW-007, SW-005 picks from the fixed mock accounts and categories.
- **SW-006 and SW-007 must protect existing transactions.** An account or category that transactions still reference can't simply be deleted, or those transactions would point at nothing. It is archived instead (accounts already have `isActive`), or deletion is blocked. Account balances are always derived from transactions, never stored.
- **SW-008 depends on SW-005 to SW-007:** persistence saves accounts, categories, and transactions together, and reports read all three.

### Reports scope (SW-008)

- Monthly summaries: income, expenses, and net cash flow per month, reusing the SW-003 calculation utilities.
- Category breakdowns: totals per income and expense category for a selected period.
- CSV export of transactions.

### Settings scope

- **SW-002 (done):** theme preference (Light, Dark, System). It's currently set from the header theme menu and saved in `localStorage`.
- **SW-008:** local data management, such as exporting, importing, or clearing data stored in the browser.

**Next milestone:** SW-008 — Persistence and reports.

## Current limitations

- **Transactions are currently stored in memory and reset after a full browser refresh. Persistent localStorage support is planned for SW-008.** The same applies to accounts. Client-side navigation between pages keeps both.
- Categories are stored in memory like accounts and transactions, and reset on a full refresh. The Reports and Settings pages are still placeholders.
- Category icons and colors appear on the Categories page only. The transaction table shows category names without icons.
- A category can't be merged into another, and its type can't change. To move transactions to another category, edit them one at a time.
- An account's opening balance and date can't be corrected after creation. A future adjustment or reconciliation workflow is needed for that.
- Account balances on the Accounts page are as of today. There is no per-account balance history or statement view.
- Deletion is permanent and has no undo or audit history.
- Success messages appear inline above the filters. There's no toast system.
- Filters, sort order, and page aren't kept in the URL, so a filtered view can't be bookmarked or shared. With Cache Components, Next.js keeps up to three recently visited pages mounted (hidden with React `<Activity>`), so filters survive moving between pages; a full refresh resets them.
- On mobile the six filter controls stack vertically and take up a lot of space before the results.
- Search matches descriptions and category names, not account names or amounts.
- Mock data is fixed to July–November 2026. In later months, the dashboard will default to a month with no data. Every month from July 2026 onward stays selectable.
- Months are listed in a single dropdown. Once data spans many years, a year selector may be needed.
- The header date is formatted in the browser after load, so it appears a moment after the rest of the header. It shows the Asia/Manila date (matching the dashboard) in the browser's locale format, and doesn't update if the page stays open past midnight.
- Chart color tokens (`--chart-1` to `--chart-5`) are still the shadcn/ui grayscale defaults and will be themed when charts are added.
- Unit tests cover the finance logic, form schemas, and stores. There are no component or end-to-end tests in the repo; the SW-002 to SW-007 browser checks were run manually with Playwright.

## Planned backend integration

After the frontend milestones, data storage is planned to move from `localStorage` to a backend (API, database, and authentication). That work is out of scope for SW-001 to SW-008, so the frontend will be structured so that its storage layer can be swapped out later.
