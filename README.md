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

Planned for later milestones (not installed yet): Zustand (shared state, only if needed), React Hook Form + Zod (forms), and `localStorage` persistence.

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
│   │   ├── dashboard/
│   │   │   ├── financial-dashboard.tsx # Month selector, summary cards, empty state (client)
│   │   │   └── summary-card.tsx    # Reusable summary card (title, value, icon, tone)
│   │   ├── transactions/
│   │   │   └── transactions-view.tsx # Filters, table/list, empty states, pagination (client)
│   │   └── ui/                     # shadcn/ui components (button, card, dropdown-menu, input, select, sheet, table)
│   ├── config/
│   │   └── navigation.ts           # Routes, titles, descriptions, icons (single source)
│   ├── data/
│   │   ├── mock-finance.ts         # Deterministic sample accounts, categories, transactions
│   │   └── mock-finance.test.ts    # Checks mock data is valid and matches hand-calculated totals
│   ├── lib/
│   │   ├── finance/
│   │   │   ├── calculations.ts     # Pure income/expense/balance/summary functions
│   │   │   ├── money.ts            # formatCurrency (centavos → "₱1,234.56")
│   │   │   ├── months.ts           # Month keys, labels, Asia/Manila "today", reporting cutoff
│   │   │   ├── transactions.ts     # Pure filter, sort, paginate, and amount display helpers
│   │   │   ├── validation.ts       # Business rules TypeScript can't express
│   │   │   └── *.test.ts           # Unit tests next to the code they test
│   │   └── utils.ts                # Shared helpers (`cn` class-name merging)
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

Future folders (`src/stores`, `src/hooks`) will be added only when a milestone needs them.

## Routes

| Path            | Page                                   | Milestone                                                   |
| --------------- | -------------------------------------- | ----------------------------------------------------------- |
| `/`             | Redirects to `/dashboard` (temporary 307, set in `next.config.ts`) | SW-002                          |
| `/dashboard`    | Financial summary dashboard            | SW-003 (done)                                               |
| `/transactions` | Transaction table with filters         | SW-004 (done), SW-005 (add/edit/delete)                     |
| `/accounts`     | Accounts (placeholder)                 | SW-006                                                      |
| `/categories`   | Categories (placeholder)               | SW-007                                                      |
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
- **Category:** `id`, `name`, `type` (`income` | `expense`), `icon` (a Lucide icon identifier).
- **Transaction:** a discriminated union on `type`:
  - `income` / `expense`: require `categoryId` and can't have `destinationAccountId`.
  - `transfer`: requires `destinationAccountId` and can't have `categoryId`.
  - `amount` is always a positive integer. The type decides the direction.
- **Rules TypeScript can't check** live in `validateTransaction` (`src/lib/finance/validation.ts`):
  - Transfer source and destination accounts are different.
  - Amounts are positive integers.
  - Dates are well-formed and not before the account's opening date.
  - Accounts and categories exist, and the category type matches the transaction type.

## Mock data

`src/data/mock-finance.ts` holds fixed sample data in Philippine pesos. It is plain data, separate from the UI, and never randomly generated.

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

`/transactions` shows the mock transactions in a spreadsheet-style table. It is read-only; adding, editing, and deleting arrive in SW-005.

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

## Development progress

A story is checked only when its acceptance criteria and verification checks (typecheck, lint, unit tests, build, and browser checks where applicable) pass.

- [x] **SW-001** — Project setup (Next.js, TypeScript, Tailwind v4, shadcn/ui, Lucide, ESLint, starter page)
- [x] **SW-002** — Application layout (sidebar, header, mobile drawer, routes, light/dark/system theme)
- [x] **SW-003** — Financial dashboard and mock data (summary cards, month selector, calculation utilities, unit tests)
- [x] **SW-004** — Transactions table (spreadsheet-style, read-only view with search, filters, sorting, and pagination)
- [ ] **SW-005** — Transaction CRUD (add, edit, and delete transactions; React Hook Form + Zod)
- [ ] **SW-006** — Account management (add, edit, and archive accounts; per-account balances)
- [ ] **SW-007** — Category management (add, edit, and archive income and expense categories)
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

**Next milestone:** SW-005 — Transaction CRUD.

## Current limitations

- The dashboard and transactions table use fixed mock data. Transactions can't be added, edited, or deleted yet, and the Accounts, Categories, Reports, and Settings pages are still placeholders.
- Filters, sort order, and page aren't kept in the URL. They reset when you leave the page or refresh, and a filtered view can't be bookmarked or shared.
- On mobile the six filter controls stack vertically and take up a lot of space before the results.
- Search matches descriptions and category names, not account names or amounts.
- No data persistence apart from the theme choice. Nothing else is saved between sessions.
- Mock data is fixed to July–November 2026. In later months, the dashboard will default to a month with no data. Every month from July 2026 onward stays selectable.
- Months are listed in a single dropdown. Once data spans many years, a year selector may be needed.
- The header date is formatted in the browser after load, so it appears a moment after the rest of the header. It shows the Asia/Manila date (matching the dashboard) in the browser's locale format, and doesn't update if the page stays open past midnight.
- Chart color tokens (`--chart-1` to `--chart-5`) are still the shadcn/ui grayscale defaults and will be themed when charts are added.
- Unit tests cover the finance logic only. There are no component or end-to-end tests in the repo; the SW-002 to SW-004 browser checks were run manually with Playwright.

## Planned backend integration

After the frontend milestones, data storage is planned to move from `localStorage` to a backend (API, database, and authentication). That work is out of scope for SW-001 to SW-008, so the frontend will be structured so that its storage layer can be swapped out later.
