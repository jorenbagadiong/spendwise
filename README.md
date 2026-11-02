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
| Browser tests | [Playwright](https://playwright.dev) (`@playwright/test`, Chromium), dev-only | 1.64.1 |
| Accessibility checks | [axe-core](https://github.com/dequelabs/axe-core), injected by the Playwright tests, dev-only | 4.14.0 |
| Shared state  | [Zustand](https://zustand.docs.pmnd.rs) (in-memory transaction store) | 5.0.16 |
| Forms         | [React Hook Form](https://react-hook-form.com) + `@hookform/resolvers` | 7.91.0 / 7.0.1 |
| Validation    | [Zod](https://zod.dev)                                    | 4.6.7             |

Financial data is saved in the browser's `localStorage` (SW-008A). No extra packages are used for persistence: it's built on the existing Zustand stores and Zod.

Reports (SW-008B) add no dependencies either. The trend chart is built from plain elements and Tailwind classes; see [why no chart library](#why-no-chart-library).

CSV export (SW-008C) uses a small built-in CSV writer (`src/lib/export/csv.ts`) instead of a library; see [why no CSV library](#why-no-csv-library).

Onboarding and the local profile (SW-010) add no dependencies. They use the existing React Hook Form, Zod, Zustand, and Base UI components, plus native radio buttons and a checkbox.

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
| `npm run test:e2e`  | Run the Playwright browser tests against the production build (run `npm run build` first) |

`npm run dev` serves the landing page at `/` (SW-011); the app starts at `/dashboard`. Before SW-011, `/` redirected to `/dashboard`.

### Deploying under a sub-path

Set `NEXT_PUBLIC_BASE_PATH` to serve the app under a sub-path, for example `NEXT_PUBLIC_BASE_PATH=/spendwise` on Vercel. Leave it unset locally.

- All routes, links, images, and icons get the prefix (`/spendwise/dashboard`, `/spendwise/icon.png`).
- The bare domain root (`/`) redirects (307) to the base path.
- Verified with a production build under `/spendwise`: the landing page, onboarding, navigation, Demo mode badge, reload persistence, logo, and icons all work, with no failed requests.
- Under a base path, Next.js links the `icon.png` favicon but not `favicon.ico`, which is still served at `/spendwise/favicon.ico`. Browsers' automatic request for `/favicon.ico` at the domain root returns 404, which is harmless.
- `localStorage` is per domain, not per path, so other apps on the same domain could read Spend Wise's keys.

Add shadcn/ui components when a feature needs them:

```bash
npx shadcn@latest add <component>
```

## Folder structure

```
spendwise/
├── src/
│   ├── app/                        # App Router: routes, layouts, global styles
│   │   ├── page.tsx                # Landing page at "/" (SW-011): static, outside the (app) group
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
│   │   ├── favicon.ico         # Favicon (16/32/48 px), generated from the logo artwork
│   │   ├── icon.png            # 512 px app icon (Next.js adds the <link> tags automatically)
│   │   └── apple-icon.png      # 180 px Apple touch icon (opaque, on the logo's teal)
│   ├── components/
│   │   ├── layout/                 # App shell components
│   │   │   ├── app-header.tsx      # Page title/description, date, theme menu, drawer trigger
│   │   │   ├── app-sidebar.tsx     # Desktop sidebar and the shared AppBrand
│   │   │   ├── app-logo.tsx        # The logo mark (next/image), used by every brand lockup
│   │   │   ├── mobile-navigation.tsx # Drawer navigation below the `lg` breakpoint
│   │   │   ├── page-placeholder.tsx  # "Coming soon" state (unused since SW-008B; kept for future sections)
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
│   │   ├── landing/
│   │   │   ├── story-visuals.tsx   # Faux-3D financial cards (hero, breakdown, transactions, net, privacy)
│   │   │   ├── landing-motion.tsx  # Scroll and pointer effects via CSS variables (no React state)
│   │   │   └── landing.module.css  # Perspective, depth layers, stagger, reduced-motion rules
│   │   ├── export/
│   │   │   └── csv-export-menu.tsx # "Export CSV" dropdown: builds and downloads a chosen dataset
│   │   ├── onboarding/
│   │   │   ├── onboarding-gate.tsx # Shows onboarding instead of the app shell when needed (SW-010)
│   │   │   └── onboarding-flow.tsx # Welcome, name, workspace, privacy steps; shared PrivacyNotice
│   │   ├── persistence/
│   │   │   ├── data-gate.tsx       # Loading state, recovery screen, shows pages once data is read
│   │   │   └── persistence-banner.tsx # Warning when changes aren't saved (failure, unavailable, other tab)
│   │   ├── settings/
│   │   │   ├── settings-view.tsx   # Settings: My profile, Appearance, Data management, Privacy & data, Preferences
│   │   │   └── edit-profile-dialog.tsx # Edit the local profile name (React Hook Form + Zod)
│   │   ├── dashboard/
│   │   │   ├── financial-dashboard.tsx # Month selector, summary cards, empty state (client)
│   │   │   └── summary-card.tsx    # Reusable summary card (title, value, icon, tone); also used by Reports
│   │   ├── reports/
│   │   │   ├── financial-reports.tsx # Reports page: period, summary cards, sections, empty states (client)
│   │   │   ├── report-period-picker.tsx # Month dropdown with previous/next buttons
│   │   │   ├── monthly-trend-chart.tsx # Six-month income vs expenses bar chart, tooltips, data table
│   │   │   ├── expense-breakdown-list.tsx # Ranked list with share bars (categories and accounts)
│   │   │   └── month-comparison.tsx # Selected month vs the previous month
│   │   ├── transactions/
│   │   │   ├── transactions-view.tsx # Filters, table/list, row actions, notices, pagination (client)
│   │   │   ├── transaction-form-dialog.tsx # Add/edit form (React Hook Form + Zod) in a dialog
│   │   │   └── delete-transaction-dialog.tsx # Delete confirmation (alert dialog)
│   │   └── ui/                     # shadcn/ui components (alert-dialog, button, card, dialog, dropdown-menu,
│   │                               #   field, input, label, select, separator, sheet, table)
│   ├── assets/
│   │   └── spendwise-logo.png      # Logo mark (peso sign over rising bars), 256 px
│   ├── config/
│   │   ├── category-appearance.ts  # Category icon keys → Lucide icons, color keys → classes
│   │   └── navigation.ts           # Routes, titles, descriptions, icons (single source)
│   ├── data/
│   │   ├── default-categories.ts   # Starter categories for new personal workspaces (and the demo)
│   │   ├── mock-finance.ts         # The demo dataset: deterministic sample accounts, categories, transactions
│   │   └── mock-finance.test.ts    # Checks mock data is valid and matches hand-calculated totals
│   ├── lib/
│   │   ├── finance/
│   │   │   ├── accounts.ts         # Account name rules, account form schemas, selectable accounts
│   │   │   ├── categories.ts       # Category rules, icon/color lists, form schema, selectable categories, usage
│   │   │   ├── calculations.ts     # Pure income/expense/balance/summary functions
│   │   │   ├── invariants.test.ts  # The 17 financial invariants on one ledger, across time zones
│   │   │   ├── reports.ts          # Pure report selectors: monthly report, trend, breakdowns, comparison
│   │   │   ├── money.ts            # formatCurrency ("₱1,234.56"), compact axis labels ("₱40K"), CSV decimals ("-1234.56")
│   │   │   ├── months.ts           # Month keys, labels, shiftMonth, Asia/Manila "today", reporting cutoff
│   │   │   ├── transactions.ts     # Type labels; pure filter, sort, paginate, and amount display helpers
│   │   │   ├── transaction-form.ts # Form values, Zod schema, pesos → centavos for the form
│   │   │   ├── validation.ts       # Business rules TypeScript can't express
│   │   │   └── *.test.ts           # Unit tests next to the code they test
│   │   ├── export/
│   │   │   ├── csv.ts              # CSV writer: escaping, CRLF, BOM, formula-injection defense, filenames
│   │   │   ├── transactions-csv.ts # Transaction CSV schema, export scopes, filenames
│   │   │   ├── reports-csv.ts      # Monthly summary and breakdown CSVs from the report selectors
│   │   │   ├── csv-test-helpers.ts # Test-only RFC 4180 parser for round-trip checks
│   │   │   └── *.test.ts
│   │   ├── landing/
│   │   │   └── sample-month.ts     # Landing page sample month (centavos), totals derived from transactions
│   │   ├── profile/
│   │   │   ├── profile.ts          # Local profile type, name rules, storage key and parsing, greeting
│   │   │   ├── controller.ts       # Loads/saves the profile (write first, then update state)
│   │   │   └── *.test.ts
│   │   ├── workspace/
│   │   │   ├── workspace.ts        # Onboarding plan, completeOnboarding, clearDemoData, starter data
│   │   │   └── workspace.test.ts
│   │   ├── persistence/
│   │   │   ├── snapshot.ts         # Storage key, schema version, snapshot type, Zod validation, integrity checks
│   │   │   ├── storage.ts          # Safe localStorage access and error classification (quota, denied, unavailable)
│   │   │   ├── controller.ts       # The single persistence boundary: load, create workspace, save, replace, conflicts
│   │   │   ├── download.ts         # File download helper (JSON backups and CSV exports) and backup file names
│   │   │   └── *.test.ts
│   │   ├── ids.ts                  # Sequential id helper ("acct-001", "txn-031")
│   │   └── utils.ts                # Shared helpers (`cn` class-name merging)
│   ├── stores/
│   │   ├── account-store.ts        # Zustand store factory: accounts + add/update/archive/restore
│   │   ├── account-store-provider.tsx # React context provider and useAccountStore hook
│   │   ├── account-store.test.ts
│   │   ├── category-store.ts       # Zustand store factory: categories + add/update/archive/restore
│   │   ├── category-store-provider.tsx # React context provider and useCategoryStore hook
│   │   ├── category-store.test.ts
│   │   ├── finance-data-provider.tsx # Creates the three stores + persistence controller (used by the layout)
│   │   ├── transaction-store.ts    # Zustand store factory: transactions + add/update/delete
│   │   ├── transaction-store-provider.tsx # React context provider and useTransactionStore hook
│   │   └── transaction-store.test.ts
│   └── types/
│       └── finance.ts              # Account, Category, Transaction, MonthlySummary
├── components.json                 # shadcn/ui configuration
├── eslint.config.mjs               # ESLint flat config
├── next.config.ts                  # Next.js config (Cache Components; the `/` redirect was removed in SW-011)
├── postcss.config.mjs              # Tailwind CSS v4 PostCSS plugin
├── tsconfig.json                   # TypeScript config (strict mode, `@/*` → `src/*`)
├── vitest.config.mts               # Vitest config (mirrors the `@/*` alias)
├── playwright.config.ts            # Playwright config: Chromium, runs `next start -p 3100`
├── e2e/                            # Browser tests for critical journeys (SW-009)
│   ├── fixtures.ts                 # Deterministic Jan–Feb 2026 dataset, storage seeding, axe helper
│   ├── onboarding.spec.ts          # SW-010: onboarding, demo mode, clearing demo data, profile, existing users
│   ├── landing.spec.ts             # SW-011: landing CTA, story text, nav, scroll stage, tilt, reduced motion, overflow
│   ├── transactions.spec.ts        # Scenario B: create/edit/delete each type, totals after every step
│   ├── accounts-categories.spec.ts # Scenarios C–D: account and category lifecycles
│   ├── backup-csv.spec.ts          # Scenarios E–F: JSON backup/restore, CSV exports and failures
│   ├── persistence-failures.spec.ts # Scenario G: corrupt, unsupported, unavailable, full, stale-tab storage
│   ├── accessibility.spec.ts       # axe WCAG 2.2 A/AA checks, focus trapping, Escape, reduced motion
│   └── responsive.spec.ts          # Overflow and cut-off controls at 375/768/1280/1920px
└── AGENTS.md                       # Next.js-generated notes for AI coding agents
```

A `src/hooks` folder will be added only when a milestone needs it.

## Routes

| Path            | Page                                   | Milestone                                                   |
| --------------- | -------------------------------------- | ----------------------------------------------------------- |
| `/`             | Landing page: scroll-driven faux 3D story (static) | SW-011 (done). SW-002 to SW-010: redirected to `/dashboard` |
| `/dashboard`    | Financial summary dashboard            | SW-003 (done)                                               |
| `/transactions` | Transaction table with add/edit/delete and CSV export | SW-004 (done), SW-005 (done), SW-008C (done: CSV export) |
| `/accounts`     | Account management (`?new=1` opens Add account) | SW-006 (done), SW-010 (`?new=1`)                   |
| `/categories`   | Category management                    | SW-007 (done)                                               |
| `/reports`      | Financial reports and CSV export       | SW-008B (done), SW-008C (done: CSV export)                  |
| `/settings`     | Settings: appearance and data management | SW-002 (theme, in the header menu), SW-008A (done: data management) |

All pages live in the `(app)` route group, so they share one layout and the sidebar and header are never duplicated. To add a section, add an entry to `src/config/navigation.ts` and a `page.tsx` under `src/app/(app)/`.

## Theme behavior

- Three options in the header theme menu: **Light**, **Dark**, and **System** (default, follows the OS setting and reacts live when it changes).
- Since SW-008A, the same menu also appears on the Settings page with the current choice shown ("Theme: Dark"). Both are the same `ThemeToggle` component reading the same `next-themes` state, so they always agree. The menu closes after a choice (Base UI keeps radio menus open by default, so `closeOnClick` is set).
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

`src/data/mock-finance.ts` holds fixed sample data in Philippine pesos. It is plain data, separate from the UI, and never randomly generated. Since SW-010 it's the **demo dataset**: it's loaded only when someone chooses "Explore with demo data" during onboarding, or "Replace with demo data" on the recovery screen. It's never added automatically. Its categories are the same starter categories a personal workspace gets (`src/data/default-categories.ts`).

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
>
> *Update (SW-008A):* transactions, accounts, and categories are now saved in `localStorage` and restored after a refresh. See [Data persistence (SW-008A)](#data-persistence-sw-008a).

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
(app)/layout.tsx → FinanceDataProvider (SW-008A; also creates the persistence controller)
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
- **No persistence in SW-005.** SW-008A added saving through a separate persistence controller rather than Zustand's `persist` middleware (see below).

## Account management (SW-006)

`/accounts` manages the bank accounts, e-wallets, and cash wallets that transactions belong to.

> Accounts are stored in memory like transactions and reset after a full browser refresh. Persistent localStorage support is planned for SW-008. *Update (SW-008A): accounts are now saved and restored.*

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

> Categories are stored in memory like transactions and accounts, and reset after a full browser refresh. Persistent localStorage support is planned for SW-008. *Update (SW-008A): categories are now saved and restored.*

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

## Data persistence (SW-008A)

Accounts, categories, and transactions are saved in the browser's `localStorage` and restored on every visit. Nothing is sent anywhere.

### Architecture

```
FinanceDataProvider (in the (app) layout)
├── account, category, transaction stores   ← start empty
└── persistence controller (src/lib/persistence/controller.ts)
    ├── on mount:   read storage once → load, seed, or show recovery
    ├── on change:  subscribed to the three stores → save one complete snapshot
    ├── restore / clear: write storage first → update stores only if the write succeeded
    └── "storage" event from other tabs → conflict state (writes stop)
DataGate (around page content)
└── loading state → recovery screen → or the page (+ PersistenceBanner when not saved)
```

- **One persistence boundary.** Store actions don't know about storage. The controller subscribes to the stores and saves after any successful change. Rejected actions (validation errors, unknown ids) don't change state, so nothing is written. A save is synchronous, so each change produces exactly one write and saving can never trigger another save.
- **One key, one atomic write.** The full dataset is written as a single JSON string, so storage never holds half of a change. Every save is the complete, current state of all three stores, which the store actions already keep consistent (SW-007 validation).
- **Plain-TypeScript controller.** It has no React code, so the unit tests drive it directly with a fake storage. The React provider only creates it, starts it in an effect, and listens for the `storage` event.

### Storage key and schema

Key: **`spendwise:financial-data:v1`** · schema version **1**

```json
{
  "schemaVersion": 1,
  "revision": "1f0c…",
  "updatedAt": "2026-11-02T06:20:00.000Z",
  "data": {
    "accounts":     [{ "id": "bpi-savings", "name": "BPI Savings", "type": "bank", "openingBalance": 4500000, "openingDate": "2026-07-01", "isActive": true }],
    "categories":   [{ "id": "food", "name": "Food", "type": "expense", "icon": "utensils", "color": "orange", "isActive": true }],
    "transactions": [{ "id": "txn-001", "type": "expense", "amount": 245075, "date": "2026-07-03", "description": "SM Supermarket groceries", "accountId": "gcash", "categoryId": "groceries" }]
  }
}
```

- `revision` changes on every save. It's how a tab notices that another tab has saved since it last read.
- **Not stored:** balances, dashboard totals, usage counts, form or dialog state, filters, or anything about the person. Everything derived is recalculated from the records. The theme preference stays where `next-themes` keeps it (`theme` key).

### Initialization rules

The server can't read `localStorage`, so the server HTML and the first browser render both show **"Loading your saved data…"**, with no hydration mismatch. Storage is read right after hydration. Page content is rendered but hidden until then. The stores are still empty at that point, so no demo or stale totals ever appear.

| What's in storage                       | Result                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Nothing (first visit)                   | **SW-010:** nothing is loaded or written; onboarding asks how to start (own data or demo). Before SW-010, demo data was loaded and saved here. |
| A valid snapshot                        | It's restored exactly.                                                                     |
| A valid **empty** snapshot              | Stays empty. Demo data is never re-added.                                                 |
| Invalid JSON                            | Recovery screen. The stored text is untouched.                                            |
| Unsupported schema version              | Recovery screen ("from a different version"). The stored text is untouched.               |
| Invalid or inconsistent records         | Recovery screen with the list of problems. The stored text is untouched.                  |
| Storage unavailable or blocked          | Onboarding runs and the chosen workspace lives in memory only, with a warning that changes last only until the tab closes. Nothing is written. (Before SW-010: demo data in memory.) |

The **recovery screen** offers:
- **Download saved data**, which downloads the original stored text exactly as it was (`spendwise-unreadable-data-YYYY-MM-DD.json`).
- **Try again.**
- **Replace with demo data** or **Start with no data.** Each asks for confirmation first, because it overwrites the stored data.

While the recovery screen is shown, nothing is saved.

### Data integrity safeguards

Every load and every backup import goes through `parseSnapshot` (`src/lib/persistence/snapshot.ts`):

- **Shape** (strict Zod schemas, unknown fields rejected):
  - Schema version and required fields.
  - Account, category, and transaction ids.
  - Real calendar dates.
  - Integer centavos (positive for transactions, zero or more for opening balances).
  - The income, expense, and transfer union (a transfer with a category is rejected).
  - Known icons and colors, and name lengths.
- **Integrity across records:**
  - Duplicate ids.
  - Duplicate account names, and duplicate category names within a type.
  - Every transaction must reference existing accounts and categories, use a category of the matching type, have distinct transfer accounts, and not be dated before an account opened. This reuses `validateTransaction`.
  - Archived accounts and categories are valid references.
- **Nothing is repaired.** Invalid data is never trimmed, rounded, dropped, or coerced. It's rejected with a list of problems.

### Saving and failures

| Situation                         | What happens                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Save succeeds                     | Settings shows "Saved in this browser" with the time. No banner.                                   |
| Storage full (`QuotaExceededError`) or access denied | A banner says "Your latest changes aren't saved" and why. The change exists in this tab only; the next change retries. |
| Storage unavailable at load       | Banner: "Changes are only kept in this tab." Restore and Clear are disabled.                      |
| Another tab saved newer data      | Banner: "Data changed in another tab." Saving stops (see below).                                   |

Success notices say "Added" or "Updated", not "Saved", so they never claim durability. The banner and the Settings status report the real save state. Every banner offers a backup download.

### Backup and restore (Settings → Data management)

- **Export JSON backup** downloads `spendwise-backup-YYYY-MM-DD.json`: a complete versioned snapshot of all accounts, categories, and transactions. Balances aren't included; they're recalculated after a restore.
- **Import JSON backup:**
  1. Choose a backup file.
  2. The file is fully validated (same checks as loading). An invalid file is rejected with its problems listed, and nothing changes.
  3. A confirmation shows what the backup contains and what it replaces, with a button to back up the current data first.
  4. On confirm, the backup is written to storage first. Only if that succeeds are the stores replaced, all at once. If the write fails, the current data stays as it was. A backup is never partly imported.
- **Clear all data** asks for confirmation, suggests exporting a backup first, and saves an empty dataset. Demo data isn't added back on the next visit. Restore a backup to recover.

### Settings page

`/settings` has three sections:

| Section             | What it does                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **Appearance**      | Theme selector (Light, Dark, System). It reuses the SW-002 `ThemeToggle`, so there's no separate theme state; it shows the current choice and stays in sync with the header menu. |
| **Data management** | Storage status: saved (with time), not saved, unavailable, or changed in another tab, plus the record counts and storage key. When something's wrong, a **What to do** note gives recovery steps (`getStorageGuidance`). Also export JSON backup, import JSON backup (validated, confirmed), and clear all data (confirmed, no demo reseeding). |
| **Preferences**     | Read-only. Currency is fixed to **Philippine peso (PHP, ₱)**, and the reporting time zone is fixed to **Asia/Manila**. There are no controls, because nothing here can be changed yet. |

**Deferred preferences** (not implemented, and no placeholder controls are shown):

- Currency switching or multiple currencies.
- Reporting time zone selection.
- Date and number display formats, and the first day of the week.
- Default account and default category for new transactions.
- Account and profile settings, authentication, and cloud sync (these need the planned backend).

### Multiple tabs

- Each save first checks that the stored `revision` is still the one this tab last read or wrote. If another tab has saved since, this tab **doesn't write**, so it can't overwrite newer data.
- The browser's `storage` event also tells other tabs about a save as soon as it happens.
- The stale tab shows "Data changed in another tab" and stops saving. Its unsaved changes stay on screen and can be downloaded ("Download this tab's data"). **Load latest data** replaces them with the saved data, after which saving resumes.
- **Limitation:** `localStorage` has no transactions or locks across tabs. The check and the write are separate steps, so two tabs saving at almost exactly the same moment could still overwrite each other. The check makes this unlikely, not impossible. Real concurrency control needs a backend.

### Browser storage limitations

- Data lives **only in this browser on this device**. Other browsers, devices, and private windows don't see it.
- Clearing site data (cookies and site data), or the browser evicting storage, **deletes it**. Export backups regularly.
- `localStorage` is usually limited to about 5 MB per site. That's thousands of transactions, but not unlimited. Hitting the limit shows the "aren't saved" banner.
- Some private modes or privacy settings block storage. The app then runs in memory with a warning.
- Data isn't encrypted. Anyone with access to this browser profile can read it.

## Financial reports (SW-008B)

`/reports` shows one month's finances in detail: summary cards, a six-month trend, a comparison with the previous month, and spending broken down by category and by account. Every number is derived from the shared transaction, account, and category stores on each render, so reports update immediately after any transaction change, archive, or backup restore. Nothing calculated is stored or persisted.

### Reporting period

- **Default:** the current month in Asia/Manila (`today` is computed on the server per request, like the dashboard).
- **Choices:** every month from the earliest account opening or transaction through the current month, newest first, chosen from a dropdown or with the previous/next buttons. Months without transactions stay selectable. If any transactions are dated in the future, the list extends to the latest one, so those records are never silently unreachable (`getReportMonths`).
- **One period everywhere:** the cards, trend, comparison, and both breakdowns all use the selected month. The heading names it ("Financial report · October 2026"). Clicking a month in the trend chart also selects it.
- **Calendar months:** a transaction belongs to the month in its `YYYY-MM-DD` date. Dates are calendar dates, not timestamps, so there's no time-zone conversion and no day shift.
- **Future-dated transactions** in the selected month are included in its totals (the dashboard does the same) and a note says how many there are.

### Summary cards

| Card             | Rule                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| Total Income     | Sum of income transactions in the month                              |
| Total Expenses   | Sum of expense transactions in the month                             |
| Net Cash Flow    | Income − expenses, signed (`+₱…` / `-₱…`)                            |
| Cash Flow Margin | Net cash flow ÷ income × 100, one decimal. **N/A** when income is ₱0 |

The first three match the dashboard for the same month exactly (a unit test checks this). Cash flow margin is not called a savings rate: it measures how much of the month's income wasn't spent that month, not money actually moved into savings. It can be negative.

### Reporting calculation rules

All report math is in `src/lib/finance/reports.ts`, built on the SW-003 utilities in `calculations.ts`:

| Function                       | What it returns                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `getMonthlyReport`             | Transaction count, income, expenses, net cash flow, and cash flow margin for a month    |
| `getCashFlowMargin`            | Net ÷ income × 100, or `null` when income is zero                                       |
| `getMonthlyTrend`              | Income, expenses, and net for the selected month and the five before it                 |
| `getExpensesByCategory`        | The month's expenses per category, highest first, with shares of total expenses         |
| `getExpensesByAccount`         | The month's expenses per source account, highest first, with shares                     |
| `getMonthOverMonthComparison`  | Income, expense, and net changes against the immediately preceding month                |
| `getReportMonths`              | Selectable reporting months                                                             |
| `countFutureDatedTransactions` | Transactions in a month dated after today                                               |
| `percentOf` / `formatPercentOf` | Exact percentage of two centavo amounts: `(1_624_950, 3_000_000, 2)` → `"54.17"`; display form `"54.2%"`, `"N/A"` when the total is 0 (SW-009) |

1. **Integer centavos.** All totals are integer sums. Displayed and exported percentages are computed from the two integer amounts with exact (BigInt) division and rounded half away from zero (SW-009 fix: rounding the floating-point value turned 54.165% into 54.16). The unrounded float is used only for bar widths and sorting.
2. **Transfers are never income or expenses**, so they don't appear in any report total or breakdown.
3. **Opening balances aren't income.** They aren't transactions, so reports never see them.
4. **Archived accounts and categories stay in reports.** Historical expenses keep their rows, labeled "Archived". Names, icons, and colors come from the shared stores by id. If a record were missing (storage integrity checks prevent this), the row would still appear as "Unknown category/account" rather than being dropped.
5. **No data is changed.** Selectors only read their inputs (tests run them on frozen data).
6. **Recalculation is cheap and targeted.** Each report is wrapped in `useMemo`, keyed on the stores' arrays and the selected month. Store actions replace arrays on every change, so reports recalculate exactly when the data or period changes. The trend is a single pass over the transactions. There are no loading indicators for these calculations: they're synchronous.

### Monthly trend

- Grouped bars for the selected month and the five months before it (crossing years as needed), oldest on the left. Months with no activity show as empty columns with ₱0 values.
- **Income is always the left bar (solid emerald) and expenses the right bar (striped rose).** The theme's income and expense colors are hard to tell apart with red-green color blindness, especially in dark mode (checked with a CVD palette validator), so position, the stripe texture, and the legend carry the meaning as well as color.
- Hovering or keyboard-focusing a month shows a tooltip with exact income, expenses, and signed net cash flow. Each month column is a button whose accessible name reads the same values; activating it selects that month.
- The value axis rounds up to clean gridlines (`getNiceAxisMax`) and uses compact labels (`₱40K`). Exact values are in the tooltip and in **Show as table**, a full data table with net cash flow, which may be negative.
- Bars and labels use theme tokens (`--income`, `--expense`, `--muted`, …), so light and dark mode both work. Bars are at most 24px wide and the chart resizes with its container.

### Why no chart library

Recharts was considered. Six months × two bars is easy to build with Tailwind, and plain elements need no width measurement, which matters because `DataGate` keeps pages hidden (`display: none`) until storage is read. Measured charts can render at zero width in that case. Skipping the library also avoids a dependency and keeps the colors on the existing CSS variables.

### Category and account breakdowns

- **Expenses by category:** expense transactions only, grouped by category, sorted by amount (ties by name). Each row shows the category icon, name, number of expenses, exact amount, percentage of the month's total expenses, and a share bar. The total is shown in the section header.
- **Spending by account:** expense transactions grouped by the account they were paid from. This is spending per payment source, not an account balance. Transfers and income are excluded.
- **Every category or account with expenses is listed.** Small amounts aren't folded into "Others".
- The share bars are decorative. Names, amounts, and percentages are always written out, so nothing depends on color or bar length. Rounded percentages may not add up to exactly 100.0%.
- **Empty states:** a month with no expenses says so (and mentions the month's income if there was any).

### Month-over-month comparison

- Compares income, expenses, and net cash flow for the selected month against the immediately preceding month (January is compared with December of the previous year), using the same rules as the cards.
- Each row shows both values, the absolute difference, and the percentage change (difference ÷ |previous| × 100).
- **When the previous value is ₱0, the percentage is undefined:** the row shows the absolute difference with "% N/A" instead of dividing by zero.
- **Neutral wording:** "Up", "Down", or "No change" with an arrow, never green/red or "good/bad". Higher expenses or lower income aren't automatically good or bad. The card says so.

### Empty, loading, and error states

| Situation                          | What's shown                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Saved data still loading           | `DataGate` loading state (no report, no demo or placeholder totals)          |
| Saved data unreadable              | `DataGate` recovery screen (SW-008A); reports aren't shown                   |
| No transactions at all             | "No transactions to report yet" with a link to add one                       |
| No transactions in the month       | ₱0.00 cards, margin N/A, a "No transactions in …" note; trend still shown    |
| Income but no expenses             | Margin 100.0%; breakdowns say "No expenses in …" and mention the income      |
| Expenses but no income             | Margin N/A, with an explanation; negative net cash flow shown as `-₱…`       |
| Archived categories/accounts       | Listed with an "Archived" label                                              |

### Responsive and accessible

- Summary cards: 1 column on mobile, 2 from 640px, 4 from 1280px. The trend and comparison sit side by side from 1024px, and so do the two breakdowns. No horizontal scrolling at 375px, even with the data table open (it scrolls inside its own container).
- The period picker is a labeled dropdown plus previous/next buttons with descriptive labels. Everything is reachable with the keyboard.
- The transaction count is announced through a polite live region when the period changes.
- No animations were added.

## CSV export (SW-008C)

Transactions and report tables can be downloaded as CSV files for Excel, Google Sheets, or Numbers. Files are generated entirely in the browser from the current store data and downloaded directly. Nothing is uploaded, saved, or changed.

### Transactions page export

An **Export CSV** button sits next to **Add transaction** (on mobile too). Its menu offers two clearly labeled scopes, each showing how many records the file will contain:

| Scope               | Contents                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Current results** | Every transaction matching the active search, month, type, account, and category filters, in the current sort order. **All pages**, not just the page on screen. |
| **All transactions**| Every saved transaction, ignoring filters, in the current sort order.                                            |

- Both scopes reuse the table's own `filterTransactions` and `sortTransactions` (SW-004), so the file always matches the table. Pagination is never applied.
- A scope with no records is disabled and says why ("No transactions match the current filters").
- Exporting doesn't change the filters, sort, or page.
- The confirmation ("Downloaded 30 transactions as …") appears only after the file was generated and the download started. If generation fails, an error is shown instead and nothing changes.

### Transaction CSV schema

| Column        | Income              | Expense            | Transfer               |
| ------------- | ------------------- | ------------------ | ---------------------- |
| Date          | `YYYY-MM-DD`        | `YYYY-MM-DD`       | `YYYY-MM-DD`           |
| Type          | `Income`            | `Expense`          | `Transfer`             |
| Description   | as entered          | as entered         | as entered             |
| Category      | category name       | category name      | *(empty)*              |
| From Account  | *(empty)*           | source account     | source account         |
| To Account    | receiving account   | *(empty)*          | destination account    |
| Amount (PHP)  | positive (`35000.00`) | negative (`-125.50`) | positive (`5000.00`) |

- Names are resolved from the current account and category stores, archived ones included (plain names, without the "(archived)" suffix the UI shows). Internal ids never appear.
- Amounts are the transaction amounts only. Account balances and opening balances aren't exported.

### Amount formatting

- Converted from integer centavos with integer and string operations (`formatCentavosAsDecimal`): `125050` → `1250.50`, `-5` → `-0.05`. No floating-point division, so there are no rounding artifacts.
- Exactly two decimals, a `.` decimal point, an optional leading `-`, and no currency symbol or thousands separators, so spreadsheets read them as numbers. The currency is in the column header: **Amount (PHP)**.

### Reports page export

An **Export CSV** button next to the reporting period offers three separate files for the selected period:

| Option                   | File                                           | Columns                                                                                    |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Monthly summary**      | `spendwise-monthly-summary-2026-11.csv`        | Month, Income (PHP), Expenses (PHP), Net Cash Flow (PHP), Cash Flow Margin (%)             |
| **Expenses by category** | `spendwise-expenses-by-category-2026-11.csv`   | Month, Category, Status, Expenses (PHP), Share of Expenses (%), Transactions               |
| **Spending by account**  | `spendwise-expenses-by-account-2026-11.csv`    | Month, Account, Account Type, Status, Expenses (PHP), Share of Expenses (%), Transactions  |

- **Monthly summary** covers the same six months as the trend chart (the selected month and the five before it), including months with no activity. Cash flow margin is empty when a month has no income (N/A on the page).
- **Breakdowns** list every category or account with expenses in the month, highest first, archived ones included (Status = `Archived`), and end with a **Total** row equal to the page's total expenses. Remember to exclude the Total row if you sum the column yourself.
- All values come from the SW-008B selectors (`getMonthlyTrend`, `getCashFlowMargin`, `getExpensesByCategory`, `getExpensesByAccount`). Transfers are excluded, as on the page. Shares are written with two decimals, from the exact centavo totals.
- Every row repeats its month, so the files stay unambiguous if combined. Breakdown options are disabled for a month with no expenses.

### Filenames

Built only from fixed words and app-generated dates (`csvFilename`), lowercased, limited to letters, digits, and hyphens:

| Export                                   | Example                                        |
| ---------------------------------------- | ---------------------------------------------- |
| All transactions                         | `spendwise-transactions-2026-11-02.csv` (today, Asia/Manila) |
| Current results with a month filter      | `spendwise-transactions-filtered-2026-11.csv`  |
| Current results across all months        | `spendwise-transactions-filtered-2026-11-02.csv` |
| Monthly summary / breakdowns             | `spendwise-monthly-summary-2026-11.csv`, `spendwise-expenses-by-category-2026-11.csv`, `spendwise-expenses-by-account-2026-11.csv` (selected month) |

### Excel and Google Sheets compatibility

- **UTF-8 with a byte order mark (BOM)**, so Excel shows `ñ`, `₱`, `–`, and emoji correctly instead of garbled characters. Google Sheets and Numbers ignore the BOM.
- **CRLF line endings** and comma separators (RFC 4180).
- Fields are quoted only when needed: values containing commas, double quotes, CR, or LF, or with leading or trailing spaces. Embedded double quotes are doubled (`"Lunch, ""special"" combo"`). Multi-line descriptions stay in one cell.
- Excel may display `YYYY-MM-DD` dates in your system's date format. The underlying value is the same date.
- In locales that use a comma as the decimal separator, Excel may open the file with every value in one column. Use **Data → From Text/CSV** and choose comma as the delimiter.

### CSV injection protection

Spreadsheets treat a cell starting with `=`, `+`, `-`, or `@` as a formula. A description such as `=HYPERLINK("http://evil.example","Click")` could become a live link or worse when the file is opened. Following the [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection) guidance, `neutralizeFormula` prefixes risky **text** cells with a single quote (`'`) so they're shown as text:

- Applies to every user-controlled text cell: descriptions and account and category names (including in report exports).
- Looks past leading whitespace and invisible characters (spaces, tab, CR, LF, non-breaking space, control characters, zero-width characters, stray BOM), because spreadsheets may skip them and still evaluate `" =1+1"` or `"\t=1+1"`. Cells starting with tab or CR are always prefixed.
- Also catches full-width `＝ ＋ － ＠`.
- **Number cells are never prefixed.** Amounts are generated by the app and checked against a strict decimal pattern (an unexpected value throws instead of being written), so `-125.50` stays a number.
- Only the exported copy changes. The stored description is untouched, and the app and JSON backups keep the original text.
- Trade-off: harmless text that starts with one of these characters (`-50 discount`, `+63 917…`) is also prefixed, and spreadsheets show the `'`.

### Why no CSV library

Writing CSV correctly takes about 60 lines: quoting, doubling quotes, CRLF, BOM. A library like Papa Parse is mostly a parser, and formula-injection defense would still need to be written separately. The built-in writer is fully unit-tested, including a round trip through a reference RFC 4180 parser.

### CSV versus JSON backup

|                     | CSV export                                         | JSON backup (Settings)                                       |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Purpose             | Reading and analysis in a spreadsheet              | Restoring Spend Wise data                                     |
| Contents            | Transactions or report tables, with names          | Every account, category, and transaction, with ids and schema version |
| Opening balances, archive state, ids | Not included                       | Included                                                     |
| Text                | Formula-like text prefixed with `'`                | Exact original text                                          |
| Can be imported     | **No.** CSV files can't restore app data           | Yes, via **Import JSON backup**                               |

The Transactions export menu repeats this: "CSV is for spreadsheets and can't be restored. For a restorable copy, use Settings → Data management."

### Data integrity

- Export functions are pure: they read the store arrays and return a string. Inputs are never mutated (tested with frozen data), and nothing is written to `localStorage` (verified in the browser by comparing the stored snapshot before and after exporting).
- No export metadata is stored. Nothing is sent to any server, and errors are not logged, because they could contain descriptions or amounts.
- Temporary object URLs are released after the download starts.

## SW-009 audit and stabilization

SW-009 audited the complete frontend MVP (SW-001 to SW-008C) before backend work. It added no product features. It added a browser test suite and fixed the defects the audit confirmed.

**Outcome: CONDITIONAL PASS.** No critical or high-severity defects remain. One medium-severity accessibility issue (D-2, light-mode text contrast) is open because it needs a design decision about theme colors.

### Verified MVP capabilities

Each of these is verified by an automated browser test against the production build, unless noted:

- First visit seeds demo data exactly once; reloads read the saved data (same revision, no duplicates). *(Superseded in SW-010: first visits now go through onboarding and nothing is seeded automatically.)*
- Income, expense, and transfer create/edit/delete, with the dashboard, Reports, account balances, and consolidated balance re-checked after every step (exact peso values). Changes persist across reloads.
- Account and category lifecycles: create, rename, duplicate-name rejection, opening-date rule, archive (history and balances kept, not selectable for new transactions), restore.
- JSON backup → change → restore returns the exact records. Invalid JSON and unsupported versions are rejected without touching storage.
- CSV: filtered and all scopes, sort order kept, all pages exported (16 rows while the table shows 10), formula-injection protection, archived names, report CSVs equal to the Reports page, error path (no false success message).
- Storage failures: corrupt JSON, unsupported version, broken references (recovery screen, stored value untouched); unavailable storage (in-memory mode with a warning); full quota (old data kept, warning, retry succeeds once space is back); stale tab (writes blocked, "Load latest data" resolves).
- Accessibility: no structural axe violations on any page, dialog, menu, or the mobile drawer in either theme; focus trapping, Escape, and focus return; linked form errors; reduced motion; a keyboard-reachable chart alternative.
- Layout: no horizontal overflow or cut-off controls at 375, 768, 1280, and 1920px; dialogs and menus fit a 375px screen.
- No hydration warnings or console errors on any route in light or dark mode (checked once in `next dev`; not automated).

### Defect register

| ID  | Severity | Area | Defect | Status | Regression test |
| --- | -------- | ---- | ------ | ------ | --------------- |
| D-1 | Medium | Reports, CSV (`reports.ts`, `reports-csv.ts`, report components) | Percentages were rounded from floats, so exact halves could round down: a 54.165% margin exported as `54.16` (and 1-decimal displays had the same risk). This broke the SW-008B rule that percentages come from exact centavo totals. | **Fixed:** `percentOf`/`formatPercentOf` use exact integer division | `reports.test.ts` ("rounds percentages exactly…"), `e2e/backup-csv.spec.ts` (margin `54.17`) |
| D-2 | Medium | Theme (light mode) | Colored text on a 10% tint of the same color is below WCAG AA 4.5:1: active nav link 4.27:1, Active/Income/Expense badges 4.1–4.3:1, tinted destructive buttons ("Clear all data", confirm Delete) 4.0:1 (also in dark mode). The light text tokens are only 4.5–4.9:1 even on white, so no tint level fixes it alone. | **Open:** needs a design decision (see below) | `e2e/accessibility.spec.ts` contrast test, marked `test.fail` until fixed |
| D-3 | Low | Settings (`settings-view.tsx`) | The Preferences `<dl>` wrapped `dt`/`dd` in an extra `div` (invalid markup, flagged by axe as serious), so screen readers couldn't pair terms and values. | **Fixed:** valid `dl > div > dt/dd`, same layout via CSS grid | `e2e/accessibility.spec.ts` structural checks |
| D-4 | Low | Global styles (`globals.css`) | The OS "reduce motion" setting was ignored; dialogs, menus, and the drawer always zoomed or slid. | **Fixed:** a `prefers-reduced-motion` rule shortens animations and transitions to near-zero | `e2e/accessibility.spec.ts` ("reduced-motion…") |
| D-5 | Low | Transactions (`delete-transaction-dialog.tsx`) | Cancelling the delete confirmation (Cancel or Escape) sent focus to "Add transaction" instead of back to the row's Delete button (WCAG 2.4.3). | **Fixed:** focus goes to "Add transaction" only after an actual delete | `e2e/accessibility.spec.ts` ("dialogs trap focus…") |
| D-6 | Low | Transactions (`transactions-view.tsx`) | A CSV export error stayed on screen after later successful saves or deletes. | **Fixed:** cleared by the next save or delete | `e2e/backup-csv.spec.ts` ("a failed CSV download…") |

**D-2 options** (any one fixes it; each changes how the theme looks, so it needs approval):

1. Neutral text on tinted chips and the active nav link (`text-foreground`), keeping the colored tint and icon as the identity cue.
2. A darker shade of emerald and rose, used only for text on tints in light mode (adds theme tokens).
3. Remove the tints from chips and buttons in light mode (text-only badges, outlined destructive buttons).

### Risks and observations (not defects)

| ID  | Area | Observation |
| --- | ---- | ----------- |
| R-1 | Storage capacity | A snapshot is about 155 bytes per transaction (20,000 transactions ≈ 3 MB). With the usual ~5 MB `localStorage` quota, the practical ceiling is roughly 30,000 transactions. When the quota is reached, saves fail visibly (tested) and nothing is lost, but the app can't grow past it without a backend. |
| R-2 | Dependencies | `npm audit` reports 21 moderate/low advisories. The 6 in "production" dependencies all come through the `shadcn` CLI package (`deepmerge`, `minimatch` via `ts-morph`), which is used at build time only (the app imports only its CSS). npm's only automatic fix would downgrade shadcn from 4.23 to 1.0.0, so it was not applied. The other 15 are in ESLint tooling. |
| R-3 | Bundle size | About 300 KB of compressed JavaScript per route (900–975 KB uncompressed). The largest app-specific part is Zod (~66 KB compressed), loaded on every route because the shared persistence provider validates snapshots. A possible later optimization is `zod/mini` or moving validation server-side with the backend. Not changed. |
| R-4 | Dashboard months | The dashboard and the Transactions month filter list months only up to the current month, so a future-dated month is reachable only via "All months" there. Reports includes future months. This is a documented SW-003 rule, not changed. |
| R-5 | Browser coverage | Automated and manual checks ran in Chromium only. Firefox and Safari (WebKit) weren't tested. |
| R-6 | Focus guards | Base UI moves focus off its invisible focus guards asynchronously. Tab presses less than ~20 ms apart (faster than key repeat) can briefly land on a guard. Measured: no leak at 33 ms or slower. Library behavior; not changed. |

### Financial invariants

`src/lib/finance/invariants.test.ts` checks each invariant on one hand-calculated ledger. Deeper coverage lives in the calculation, store, report, and CSV tests, and in the browser tests.

1. Authoritative amounts are integer centavos.
2. Opening balances are not income.
3. Income increases its receiving account.
4. Expenses decrease their source account.
5. Transfers debit one account and credit another.
6. Transfers don't affect income, expenses, or net cash flow.
7. Transfers don't change the consolidated balance.
8. Editing a transaction applies its effect exactly once (repeating the same edit changes nothing).
9. Deleting removes its effect exactly once (a second delete is a no-op).
10. Archived accounts stay in historical and consolidated balances.
11. Archived categories stay resolvable in historical transactions and reports.
12. Months use calendar boundaries (last and first days tested).
13. Historical month-end balances include all earlier transactions.
14. Reports reconcile with dashboard totals.
15. CSV exports reconcile with the report data.
16. Negative calculated balances are supported.
17. Dates don't shift with the machine's time zone (tested under UTC−12, UTC−8, UTC, UTC+8, and UTC+14).

### Performance findings

Measured in headless Chromium against the production build with generated datasets of 1,000, 5,000, and 20,000 transactions. The browser's long-task API reported nothing even for a deliberate 120 ms block, so it was replaced by measuring the largest gap between animation frames.

| Measurement (20,000 transactions, 3 MB) | Result |
| --- | --- |
| Full page load to data ready (includes Zod validation of every record) | 354 ms |
| Switching the table to "All months" | max frame gap 33 ms |
| Typing in search (filter + sort on every keystroke) | max frame gap 17 ms |
| Stepping Reports back 5 months | max frame gap 17 ms |
| Save: `JSON.stringify` / `localStorage.setItem` | 6 ms / 23 ms |
| Delete + save | max frame gap 83 ms, the same at 1k, 5k, and 20k (dialog transition, not data-dependent) |

No data-dependent slowdowns were found, so no optimizations were added. Zustand selectors subscribe to single arrays, and report selectors are memoized per month (SW-008B).

### Security and data integrity review

- **Rendering:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`; all user text renders through React escaping.
- **Network:** no `fetch`, `XMLHttpRequest`, beacons, analytics, or other outbound calls; no environment variables or secrets in client code.
- **Logging:** no `console` calls in application code.
- **Storage:** imported and stored JSON is fully validated (Zod schema plus integrity checks). Corrupt or unsupported data is never overwritten automatically, restores are atomic (storage first, then the stores), and stale tabs can't overwrite newer data. All of this is covered by unit and browser tests.
- **CSV:** formula injection is neutralized (SW-008C), including in names, verified end to end.
- **Limitations of browser-only storage:** data isn't encrypted and is readable by anyone with access to the browser profile or by scripts on the same origin. It's limited to about 5 MB, isn't synced, and is lost when site data is cleared. Authentication and encryption are out of scope until a backend exists.

### Backend readiness

**Ready to start SW-010**, with D-2 tracked separately.

- **Data model:** typed discriminated-union records with string ids, integer centavos, and ISO calendar dates map directly onto database rows. Snapshot schema version 1 gives a defined import format for migrating existing local data.
- **One persistence boundary:** stores never touch storage; `createPersistenceController` loads, saves, restores, and detects conflicts. A server-backed controller can replace it without changing pages or stores. Its revision check is already the optimistic-concurrency pattern an API needs.
- **Validation is shared and pure** (`validateTransaction`, `checkDataIntegrity`, Zod schemas), so the same rules can run on the server.
- **Calculations are pure functions** that can run server-side or stay client-side over fetched data.
- **Gaps a backend must close:** no user or auth model; ids are sequential per device (`txn-031`), so they'd collide across devices (switch to server-issued ids or UUIDs); edits overwrite with no history; the whole dataset is saved at once, which a backend should replace with per-record writes.

## Onboarding, local profile, and privacy (SW-010)

Spend Wise works without registration, accounts, or a backend. SW-010 adds a first-run onboarding, a local profile (a name for personalization), an explicit choice between a personal and a demo workspace, safe removal of demo data, and clear disclosures about browser storage.

**Outcome: CONDITIONAL PASS.** Every SW-010 requirement is implemented and verified. The open SW-009 contrast issue (D-2) still applies to the new screens' tinted badges and the destructive "Clear demo data" confirm button.

### First-time onboarding

A new visitor (nothing saved in this browser) sees four steps instead of the app. A step indicator shows the progress, with Back and Continue buttons:

1. **Welcome:** what Spend Wise does (income and expenses, accounts, categories, balances and cash flow, reports, CSV export), with no account needed.
2. **What should we call you?** One field: full name. It's required, trimmed, at most 80 characters (each Unicode character counts once), and any script is fine ("José", "Ñoño", "李小龍"). Whitespace-only names and control characters are rejected. No email, password, birthday, phone, or address is asked for. The name stays in the form when going Back.
3. **How would you like to start?**
   - **Start with my own data** (default): a personal workspace with the 9 starter categories (templates, not activity), **no accounts and no transactions**. The dashboard then shows "Let's set up your finances." with **Add your first account**, which opens the Add account form (`/accounts?new=1`).
   - **Explore with demo data:** the sample dataset (July–November 2026), labeled as demo data everywhere.
4. **Your data, your privacy:** the privacy notice (below) and an **unticked, required** checkbox: "I understand that my data is stored locally and may be permanently lost if browser site data is cleared." The finish button stays disabled until it's ticked. The acknowledgement time is saved with the profile.

Nothing is written to storage until the last step. Focus moves to each step's heading. Everything works with the keyboard (tested). Finishing opens the app at the top of the page with focus on the page title, and the finish button can't submit twice. Returning visitors never see a flash of onboarding: it's decided only after both saved records and the profile have been read.

### Local profile

Stored under its own key, **`spendwise:profile:v1`** (profile schema version 1), separate from the financial snapshot:

| Field | Meaning |
| --- | --- |
| `profileSchemaVersion` | `1` |
| `fullName` | The trimmed name |
| `workspaceMode` | `"personal"` or `"demo"` |
| `privacyAcknowledgedAt` | When the storage acknowledgement was ticked (ISO timestamp) |
| `onboardingCompletedAt` | When onboarding finished (ISO timestamp) |

- It's **not an identity or a login**: nothing verifies it, there's no session, and nothing else references it (so it has no id).
- `createProfileController` writes to storage **first** and updates the app only if the write succeeded, so "Saved" is never shown for a failed save. A stored profile is validated strictly and never repaired.
- Without usable storage, the profile lives in memory for the tab, and Settings says so.
- Other tabs pick up profile changes through the `storage` event.
- **Personalized dashboard:** "Good morning / afternoon / evening, *name*!" The time of day is computed in Asia/Manila on the server per request, like "today", so the server HTML and the browser agree (no hydration mismatch, verified in `next dev`). Long names wrap instead of overflowing.
- **Settings → My profile** shows the name and an **Edit profile** dialog with the same validation. The greeting updates immediately, and the change persists after refresh.

### Personal versus demo mode

| | Personal | Demo |
| --- | --- | --- |
| Data | The person's own records (also used for data of unknown origin) | The sample dataset |
| Indicator | None | A **Demo mode** badge in the header (links to Settings), plus a note on the dashboard: "You're exploring demo data: these accounts and transactions are examples." |
| Leaving it | — | **Settings → Data management → Clear Demo Data & Start Fresh** |

Demo and personal records are never mixed silently. The only ways into demo mode are choosing it in onboarding, or "Replace with demo data" on the recovery screen.

### Clearing demo data

**Clear Demo Data & Start Fresh** (shown only in demo mode) opens a confirmation that says exactly what happens:

- **Everything in the workspace is replaced**, including anything added or changed while exploring. Records can't reliably be told apart as demo or personal, so this is an explicitly confirmed whole-workspace replacement, never a selective delete.
- The result is a personal workspace: starter categories, no accounts or transactions.
- The **name, privacy acknowledgement, and theme stay**, onboarding stays complete, and demo data is never re-added (also not after a refresh, which is tested).
- **Export backup first** is offered in the dialog.
- The replacement uses the same atomic, conflict-checked write as backup restore. If it can't be saved (storage full, another tab saved newer data), **nothing changes** and the message says so.

**Clear all data** (the SW-008A reset) is still a separate, destructive action with its own confirmation. After either action, or after restoring a backup, the workspace mode becomes personal.

### Existing users (data saved before SW-010)

| What's saved | What happens |
| --- | --- |
| Valid financial records, no profile | **"Welcome back" onboarding:** welcome → name → **"What should we do with your saved data?"** → privacy. The data step shows what's saved ("4 accounts, 9 categories, and 30 transactions") and explains that earlier versions added sample records automatically. It offers two choices: **Keep my current data** (selected by default; nothing is changed, and the snapshot isn't even rewritten) or **Start fresh with my own data**. Start fresh shows a warning, a **Download backup first** button, and a required checkbox ("I understand that my saved accounts, categories, and transactions will be removed"). Continue stays disabled until it's ticked, and the final button reads **Start fresh**. Nothing is removed until that final button; the replacement is atomic, and if it fails nothing changes. Kept data is treated as **personal**: records are never *assumed* to be demo data, so the person decides. |
| A valid empty snapshot, no profile | Same flow; keeping it leaves it empty. |
| Corrupt or unsupported financial data | The SW-008A recovery screen, as before. Onboarding never runs on top of it, and nothing is overwritten. |
| A profile but no financial data (that key was removed) | Only the workspace step; the name and acknowledgement are kept. |
| An unreadable profile | Treated as no profile; onboarding writes a new one. It only ever held a name and choices. |

The financial snapshot schema is **unchanged (version 1)**, so no migration was needed.

### Privacy and storage disclosures

The onboarding notice and **Settings → Privacy & data** say:

- **Stored on your device:** name, accounts, categories, and transactions are in this browser's local storage, not uploaded to an application backend. There's no server-side database, analytics, or tracking scripts.
- **Private:** no account is needed. The host serving the app can see normal page requests (IP address, pages opened), but those don't contain financial records or the name. Local storage **isn't encrypted**.
- **Data can be lost:** clearing cookies and site data, removing browser storage, or using another browser or device can erase it. Clearing only cached images and files usually doesn't. Private or incognito windows discard it when closed.
- **Protect your records:** download a **JSON backup** regularly (Settings → Data management). **CSV exports are for spreadsheets and can't be restored.**
- Settings adds: no cloud sync, the ~5 MB / ~30,000-transaction limit, both storage keys, and a direct **Export JSON backup** button.

**How these claims were verified.** A browser session went through onboarding, every page, a CSV export, and a backup download:

- All **142 network requests** went to the app's own origin (no third-party hosts; fonts are self-hosted by `next/font` at build time).
- **No cookies** were set, and no URL contained the name or any financial data.
- Only the two Spend Wise keys were in `localStorage` (plus next-themes' `theme` once a theme is picked).
- The code has no analytics, monitoring, `fetch`, or logging (SW-009 review).

**Not verifiable from the repo:** what a future hosting provider logs (request metadata only, since data never leaves the browser) and what browser extensions do. The wording avoids claiming that "no information is collected".

### Backup and restore compatibility

- JSON backups are **unchanged**: schema version 1, financial records only. They don't include the profile (name, mode, acknowledgement) or the theme, and Settings says so. Old backups restore as before, and new backups restore in older SW-008A/B/C builds.
- **Restoring never changes the profile name.** A restored backup is treated as the person's own data, so the mode becomes **personal** (tested from demo mode). Validation, atomicity, archived records, and relationships are unchanged. An invalid file changes nothing.

## Landing page (SW-011)

`/` is a cinematic, scroll-driven landing page that tells a financial story in six scenes: **monitor your money → understand your spending → see what remains → make smarter saving decisions**. It uses faux 3D: CSS `perspective`, `transform-style: preserve-3d`, `translate3d`, and `rotateX`/`rotateY` on layered DOM cards. There's **no WebGL, Three.js, video, or new dependency**, and no motion library was installed, because a ~100-line script and a CSS module were enough.

### Scenes

| # | Headline | What happens |
| --- | --- | --- |
| 1 | **Know Where Your Money Goes.** | Hero with a floating, tilted dashboard and an income card in front of it. **Start Tracking for Free** is visible and usable immediately. |
| 2 | **Where Does Your Money Go?** | Expenses grouped into Food, Bills, Transportation, and Other, with exact shares; category bars grow in. |
| 3 | **Every Peso Has a Story.** | 11 sample transactions stack in one by one and add up exactly to the category totals. |
| 4 | **See What Remains.** | Income minus expenses becomes net cash flow. The copy says it **isn't money saved yet**, but knowing it helps decide how much to set aside. |
| 5 | **Your Money. Your Data. Your Control.** | localStorage storage, no registration, no automatic cloud sync, clearing site data can erase records, JSON backups recommended. |
| 6 | **Make Every Peso Count.** | Final CTA **Start Tracking Now**. |

Every CTA and the **Open App** button go to `/dashboard`, where SW-010 onboarding greets new visitors. The header links to **Features**, **How It Works**, and **Privacy**, which are anchors on the page.

### Sample numbers

All amounts come from `src/lib/landing/sample-month.ts`, in integer centavos, and are formatted with the app's own `formatCurrency` and `formatPercentOf`. Every total is **derived from the 11 transactions**: Food ₱8,450.00 + Bills ₱6,200.00 + Transportation ₱2,350.00 + Other ₱3,000.00 = ₱20,000.00 in expenses, and ₱45,000.00 income − ₱20,000.00 = ₱25,000.00 net cash flow. A unit test checks the reconciliation and the shares (42.3%, 31.0%, 11.8%, 15.0%). The page labels the figures as sample data in the cards, the hero, and the footer.

### How the scrollytelling works

- **Static and server-rendered.** `src/app/page.tsx` is a server component prerendered at build time (`○ /`). Every headline, number, and link is in the HTML. The page sits outside the `(app)` route group, so it **never reads or writes saved data** (tested).
- **Native scrolling.** The story is a normal two-column layout: scene text on the left, and on the right a CSS `position: sticky` stage. Nothing is pinned by JavaScript, scrolling isn't hijacked, no animation has to finish, and scrolling back up reverses everything (tested). Each scene is about 78% of the viewport tall, so the story isn't padded with long scroll distances.
- **No React state while scrolling.** `LandingMotion`, a client component that renders nothing, listens to `scroll` passively, updates at most once per animation frame, and writes CSS custom properties directly to the DOM:
  - Each stage layer gets `--v` (visibility, 0–1) and `--d` (position relative to its scene, −1–1).
  - The dashboard behind gets `--focus`, so it recedes while a layer is in front.
  - The page gets `--page-progress` for the thin progress bar at the top.
  - The hero's 3D rig gets `--rx`/`--ry` from the pointer.
- **Transforms and opacity only** (`landing.module.css`). Layers rise from depth (`translate3d` on Z) as their scene arrives and drift up and back as the next one takes over. Transaction rows stagger with `clamp()` on `--v` and their index. Category bars scale in. Blur isn't used; glows are a single radial gradient.
- **Pointer tilt** applies on the hero only, with a fine pointer at 1024px or wider, never on touch devices.
- **Visuals are decorative copies.** The cards are `aria-hidden`, and every fact they show is also in the scene text (the transaction list is a visually hidden list for screen readers), so nothing depends on seeing the animation.

### Mobile and reduced motion

- **Below 1024px:** no sticky stage. Each scene shows its own card inline and flat, with gentler perspective on the hero, no floating overlap, and no pointer effects. There's no horizontal overflow at 375, 768, 1280, or 1920px (tested). The header keeps the brand, theme menu, and **Open App**. The section anchors are hidden below 768px, but the hero's "See how it works" link remains.
- **`prefers-reduced-motion: reduce`:** no tilt, parallax, entrance animation, or 3D transforms. The stage is hidden and the story becomes one readable column with every card shown statically. The CTAs and navigation are unchanged (tested). The global SW-009 reduced-motion rule also applies.

### Performance (measured)

Measured in headless Chromium against the production build:

| Measurement | Desktop 1440px | Mobile 375px |
| --- | --- | --- |
| Scrolling the whole page down and back up | 137 frames, 95th percentile 17 ms, max 33 ms, none over 50 ms | 195 frames, 95th percentile 17 ms, max 17 ms, none over 50 ms |
| Cumulative layout shift | 0 | 0 |
| Largest contentful paint (local server) | 104 ms | 72 ms |
| Scripts referenced by the HTML (gzip) | 244 KB: Next.js runtime, React, and the Base UI theme menu | same |

After load, Next.js prefetches the `/dashboard` route behind the CTA links (including Zod), so clicking into the app is fast. Those chunks aren't on the landing page's critical path.

### Accessibility

One `h1` per page, with scenes as `article`s labelled by their headings. No structural axe violations in light or dark mode (tested). CTAs are real links, keyboard-reachable, with visible focus rings. The progress bar and visuals are hidden from assistive technology. Contrast follows the existing theme tokens, so the open D-2 item applies to tinted chips, as elsewhere.

### Privacy claims

The scene 5 statements repeat what SW-010 verified with a network capture: data stays in localStorage, there's no account, no cloud sync, clearing site data erases it, and JSON backups restore it. They avoid claiming that "nothing is collected", since hosting logs can't be verified from the repo.

## Testing

```bash
npm test             # unit tests (Vitest), run once
npm run test:watch   # unit tests in watch mode
npm run build        # production build (needed before browser tests)
npm run test:e2e     # browser tests (Playwright, Chromium)
```

**Browser tests (SW-009, extended in SW-010 and SW-011)** in `e2e/` run against the production build. `landing.spec.ts` covers the immediately usable CTA leading into onboarding, the story text and reconciled numbers, nav anchors, the sticky stage following native scroll forwards and backwards, pointer tilt on desktop only, reduced motion, overflow at four widths, axe in both themes, and that the landing page never touches saved data. `onboarding.spec.ts` covers the new-visitor flow (validation, Back, the acknowledgement), demo mode and clearing it, existing-user migration, no onboarding flash for returning users, profile editing, restoring a backup in demo mode, keyboard-only onboarding with axe checks, and the mobile scroll position. Other specs seed a finished profile so they skip onboarding. The test runner: Playwright starts `next start -p 3100`, or reuses a server already on that port. Each test seeds its own deterministic dataset (January–February 2026) into `localStorage` before the app loads, so results don't depend on the demo data or today's date. Tests use roles, labels, and visible text, not CSS classes. Accessibility checks inject the installed `axe-core` and run its WCAG 2.2 A/AA rules. The first run needs a Playwright Chromium (`npx playwright install chromium`, about 170 MB, stored outside the repo).

Why Playwright: earlier milestones' browser checks were one-off scripts. A committed suite makes the critical journeys repeatable. The cost is a dev-only dependency that never ships to users. Component tests (jsdom/React Testing Library) weren't added, because the browser tests cover the same integration paths against the real build without a second test environment.

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
- Persistence (`src/lib/persistence/*.test.ts`, using an in-memory fake storage):
  - Loading: first visit writes nothing (SW-010), creating a workspace once (refused if one exists or another tab saved), reload with valid data, empty dataset.
  - Saving: every transaction, account, and category mutation (including archive and restore); no writes for rejected actions.
  - Load failures: invalid JSON, unsupported version, invalid amounts, broken references, duplicates.
  - Storage failures: access denied, quota errors, unavailable storage.
  - Backups: export, valid restore, atomic replacement on write failure, clear-all.
  - Multiple tabs: conflict detection before writing and from the storage event, cleared-elsewhere data, resolving by reloading.
  - Recovery guidance for each storage state (`guidance.test.ts`).
- Reports (`src/lib/finance/reports.test.ts`, hand-calculated fixture spanning December 2025 to April 2026):
  - Monthly income, expenses, net cash flow, and cash flow margin; agreement with the dashboard summary.
  - Zero income (margin N/A), negative net cash flow, income without expenses, empty months, empty datasets.
  - Transfer and opening-balance exclusion.
  - Category and account totals, exact shares, sorting and tie-breaking, archived categories and accounts, missing records.
  - Month boundaries (first/last day), year transitions (December → January), six-month trend with missing months.
  - Month-over-month changes, including previous-month zero and negative previous net cash flow.
  - Selectable months (including future-dated transactions), percentage and axis formatting, `shiftMonth`.
  - No mutation of source data (frozen inputs).
  - Recalculation after adding, editing, and deleting through the transaction store, after adding a transfer, after archiving, and after restoring a backup through the persistence controller.
- Onboarding and profile (SW-010, `src/lib/profile/*.test.ts`, `src/lib/workspace/workspace.test.ts`):
  - Name rules: trimming, required, whitespace-only, Unicode in several scripts, the 80-character limit counted per character (emoji), control characters.
  - Stored profile parsing: missing, valid, invalid JSON, other versions, unknown fields, unclean names (never repaired).
  - Profile controller: write-first saves, failed saves leave state unchanged, editing, mode switching, memory-only mode (decided after hydration), other-tab changes.
  - Onboarding plan for every combination of saved data and profile; personal and demo workspaces; required acknowledgement; returning users; retry after a failed profile save without creating the workspace twice; memory-only mode.
  - Existing users: records kept and not rewritten by default, demo-looking data treated as personal, explicit start-fresh replaces them (and changes nothing if the save fails), empty snapshots kept, corrupt or unsupported data never onboarded over.
  - Clearing demo data: whole-workspace replacement including edits made while exploring, profile and acknowledgement kept, no re-seeding after refresh, nothing changed on save failure or other-tab conflict.
  - Greeting: Asia/Manila time-of-day boundaries.
- Landing sample month (SW-011, `src/lib/landing/sample-month.test.ts`): transactions → categories → expenses → net cash flow reconcile; integer centavos; exact shares.
- CSV export (`src/lib/export/*.test.ts`):
  - Escaping: commas, double quotes, CR/LF and multi-line text, leading/trailing spaces; CRLF line endings; BOM bytes; round trips through a reference RFC 4180 parser; Unicode (ñ, ₱, –, emoji, CJK).
  - Formula injection: `=`, `+`, `-`, `@`, `HYPERLINK`/DDE payloads, leading whitespace and control-character bypasses, full-width characters; safe text left alone; number cells never prefixed and rejected if not plain decimals.
  - Amounts: integer-centavo conversion, exactly two decimals, negatives, `0.1 + 0.2`, the largest allowed amount.
  - Transaction schema: income, expense, and transfer rows; archived and missing references; no internal ids; dates; empty, single, and multiple transactions.
  - Scopes: all records, filtered (search, month, type, account incl. transfer destination, category), sort order preserved, all 25 rows exported when the table shows 10 per page, no matches.
  - Reports: six-month summary with zero months and N/A margins, category and account breakdowns with archived rows and Total rows, reconciliation with report and transaction totals, empty months, filenames.
  - Source data never mutated.

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
- **SW-008A:** local data persistence
  - Accounts, categories, and transactions saved to `localStorage` and restored on every visit
  - Demo data seeded only on the first visit (replaced by onboarding in SW-010); validated, versioned snapshot; recovery screen for unreadable data
  - Settings page: Appearance (shared theme selector), Data management (status with recovery guidance, JSON backup export and import, clear all data), and read-only Preferences (PHP currency, Asia/Manila time zone)
  - Save-failure warnings and multiple-tab conflict protection
- **SW-008B:** financial reports
  - Reports page with a month/year reporting period (Asia/Manila default, previous/next buttons)
  - Summary cards: income, expenses, net cash flow, cash flow margin (N/A without income)
  - Six-month income vs expenses chart with tooltips, texture as well as color, and a data table
  - Expenses by category and spending by account, archived records included
  - Month-over-month comparison with neutral wording
- **SW-008C:** CSV export
  - Transactions: export current filtered results (all pages, current sort) or all transactions, with record counts
  - Reports: monthly summary, expenses by category, and spending by account for the selected period
  - Excel-friendly UTF-8 CSV (BOM, CRLF, RFC 4180 quoting) with formula-injection protection
- **SW-009:** frontend MVP audit and stabilization
  - Playwright browser tests for every critical journey and storage-failure case, plus axe accessibility and responsive checks
  - Financial invariant suite, including time-zone independence
  - Fixes: exact percentage rounding, Settings definition-list markup, reduced-motion support, focus return after cancelling a delete, stale CSV error message
- **SW-010:** onboarding, local profile, demo data management, and privacy
  - Four-step first-run onboarding (welcome, name, workspace, privacy acknowledgement); existing users choose to keep their saved data (default) or start fresh, with confirmation
  - Local profile with a personalized dashboard greeting; Settings → My profile with editing
  - Personal or demo workspace; Demo mode badge; Clear Demo Data & Start Fresh (confirmed, atomic)
  - New personal workspaces start with starter categories and a "Let's set up your finances" dashboard
  - Settings → Privacy & data with verified, accurate storage and privacy disclosures
- **SW-011:** cinematic faux 3D landing page at `/`
  - Six-scene scroll story (money in, money out, every peso, what remains, privacy, final CTA) with a sticky 3D stage
  - Native scrolling, CSS-variable motion without React re-renders, pointer tilt on desktop
  - Flat inline layout on mobile and with reduced motion; reconciled sample numbers; verified privacy copy

## Development progress

A story is checked only when its acceptance criteria and verification checks (typecheck, lint, unit tests, build, and browser checks where applicable) pass.

- [x] **SW-001** — Project setup (Next.js, TypeScript, Tailwind v4, shadcn/ui, Lucide, ESLint, starter page)
- [x] **SW-002** — Application layout (sidebar, header, mobile drawer, routes, light/dark/system theme)
- [x] **SW-003** — Financial dashboard and mock data (summary cards, month selector, calculation utilities, unit tests)
- [x] **SW-004** — Transactions table (spreadsheet-style, read-only view with search, filters, sorting, and pagination)
- [x] **SW-005** — Transaction CRUD (add, edit, and delete transactions; React Hook Form + Zod; shared Zustand store)
- [x] **SW-006** — Account management (add, edit, archive, and restore accounts; calculated balances; shared account store)
- [x] **SW-007** — Category management (add, edit, archive, and restore categories; icons and colors; usage counts; shared category store)
- [x] **SW-008A** — Local data persistence (`localStorage`, validated versioned snapshot, backup and restore, Settings data management, multiple-tab protection)
- [x] **SW-008B** — Financial reports (reporting period, summary cards with cash flow margin, six-month trend, category and account breakdowns, month-over-month comparison)
- [x] **SW-008C** — CSV export (transactions: filtered or all; reports: monthly summary and expense breakdowns; formula-injection protection)
- [x] **SW-009** — Frontend MVP audit and stabilization (conditional pass: browser test suite, 6 defects found, 5 fixed, D-2 contrast open pending a design decision)
- [x] **SW-010** — Onboarding, local profile, demo data management, and privacy (conditional pass: D-2 contrast still open)
- [x] **SW-011** — Cinematic faux 3D scrollytelling landing page
- Backend and API development: postponed indefinitely unless requested. Future milestones focus on local-first improvements.

### Milestone dependencies

- **SW-004 → SW-005:** CRUD builds on the transactions table, which becomes the place to add, edit, and delete entries.
- **SW-005 depends on accounts and categories.** Every transaction references an account (and a destination account for transfers). Income and expense transactions also reference a category. Until SW-006 and SW-007, SW-005 picks from the fixed mock accounts and categories.
- **SW-006 and SW-007 must protect existing transactions.** An account or category that transactions still reference can't simply be deleted, or those transactions would point at nothing. It is archived instead (accounts already have `isActive`), or deletion is blocked. Account balances are always derived from transactions, never stored.
- **SW-008 depends on SW-005 to SW-007:** persistence saves accounts, categories, and transactions together, and reports read all three. SW-008 is split into 008A (persistence), 008B (reports), and 008C (CSV export), all done.

### Reports scope (SW-008B and SW-008C)

- **SW-008B (done):** monthly summary and cash flow margin, six-month trend, expense breakdowns by category and by account, and month-over-month comparison, all reusing the SW-003 calculation utilities. Income-by-category breakdowns weren't part of the final scope.
- **SW-008C (done):** CSV export of transactions (filtered or all) and of the three report tables. CSV is export-only; JSON backups remain the restore format.

### Settings scope

- **SW-002 (done):** theme preference (Light, Dark, System). It's currently set from the header theme menu and saved in `localStorage`.
- **SW-008A (done):** local data management: storage status, JSON backup export and import, and clear all data.

**Next milestone:** to be decided (local-first improvements). Resolving D-2 needs a design decision.

## Current limitations

- Data is saved only in this browser's `localStorage` (see [Browser storage limitations](#browser-storage-limitations)): no sync between devices, deleted if site data is cleared, about 5 MB, not encrypted. Export backups regularly.
- `localStorage` can't guarantee transactional concurrency across tabs. Conflicting saves are detected and blocked, but two saves at almost the same instant can't be fully prevented.
- A conflicted tab can download its unsaved changes but can't merge them into the newer data. Merging is manual (re-enter or restore).
- Backups are full replacements. There's no partial import or merge.
- CSV files are export-only and can't be imported or used to restore data. Use JSON backups for that.
- Formula-injection protection prefixes harmless text that starts with `=`, `+`, `-`, or `@` (for example "-50 discount") with a visible `'` in spreadsheets.
- CSV exports were checked with a standard CSV parser, byte-level checks, and the browser download. They haven't been opened in Excel, Google Sheets, or Numbers as part of this milestone's automated or manual checks.
- Report CSVs cover one selected period (the monthly summary covers its six-month window). There's no multi-month breakdown export or XLSX/PDF output.
- Breakdown CSVs end with a Total row. Exclude it when summing the column in a spreadsheet.
- Page content waits for storage to be read, so each full page load briefly shows "Loading your saved data…".
- Reports cover one calendar month at a time. There are no custom date ranges, quarters, or year-to-date totals, and the trend always shows six months.
- Breakdowns are expense-only. Income by category isn't reported yet.
- Percentages are rounded to one decimal independently (exactly, from centavos), so a breakdown may total 99.9% or 100.1%.
- Light-mode text on tinted chips, the active nav link, and tinted destructive buttons is below WCAG AA contrast (D-2, open).
- `localStorage` holds roughly 30,000 transactions before the browser quota is reached (R-1).
- Verified in Chromium only (R-5).
- The trend chart's tooltip appears on hover or keyboard focus. On touch screens, tapping a month selects it; exact values are in the summary cards and the data table.
- The reporting period is local page state. It isn't in the URL, and it isn't shared with the dashboard's month selector.
- Category icons and colors appear on the Categories page only. The transaction table shows category names without icons.
- A category can't be merged into another, and its type can't change. To move transactions to another category, edit them one at a time.
- An account's opening balance and date can't be corrected after creation. A future adjustment or reconciliation workflow is needed for that.
- Account balances on the Accounts page are as of today. There is no per-account balance history or statement view.
- Deletion is permanent and has no undo or audit history.
- Success messages appear inline. There's no toast system.
- Filters, sort order, and page aren't kept in the URL, so a filtered view can't be bookmarked or shared. With Cache Components, Next.js keeps up to three recently visited pages mounted (hidden with React `<Activity>`), so filters survive moving between pages; a full refresh resets them.
- On mobile the six filter controls stack vertically and take up a lot of space before the results.
- Search matches descriptions and category names, not account names or amounts.
- Landing page: the section anchor links are hidden below 768px (the hero's "See how it works" remains). Without JavaScript, the desktop 3D stage stays empty, but all text and numbers remain. Browsers without CSS `clamp()` or `preserve-3d` show flat cards. Only Chromium was tested.
- The demo dataset is fixed to July–November 2026. In later months, the demo dashboard defaults to a month with no data. Every month from July 2026 onward stays selectable.
- The profile and the financial data use two storage keys, which can't be written atomically together. Each step is ordered and safe to retry: the workspace is created first, then the profile. If the profile can't be saved, onboarding stays open and retrying doesn't create a second workspace. A failure between them leaves at most a mismatched demo/personal label, never lost records.
- JSON backups don't include the profile (name, mode, acknowledgement). After restoring on a new browser, onboarding asks for a name again (profile-only flow).
- Clearing demo data replaces the whole workspace. Records added while exploring the demo can't be kept selectively; export a backup first if needed.
- Existing users from before SW-010 who still have the auto-added sample records are asked during onboarding whether to keep their saved data or start fresh (explicitly confirmed). If they keep it, the records count as personal data, and Settings → Clear all data (which mentions this case) can remove them later.
- The onboarding and Settings privacy text describes this app's behavior. It can't account for a hosting provider's request logs or browser extensions.
- Months are listed in a single dropdown. Once data spans many years, a year selector may be needed.
- The header date is formatted in the browser after load, so it appears a moment after the rest of the header. It shows the Asia/Manila date (matching the dashboard) in the browser's locale format, and doesn't update if the page stays open past midnight.
- Chart color tokens (`--chart-1` to `--chart-5`) are still the shadcn/ui grayscale defaults. The Reports chart uses the existing `--income` and `--expense` tokens and category colors instead.
- Unit tests cover the finance logic, form schemas, stores, and persistence. Browser tests (SW-009) cover the critical journeys in Chromium. There are no isolated component tests.

## Planned backend integration

Backend work is **postponed indefinitely** (as of SW-010) unless explicitly requested; Spend Wise is developed as a local-first app. If it resumes, see [Backend readiness](#backend-readiness). Originally, after the frontend milestones, data storage was planned to move from `localStorage` to a backend (API, database, and authentication). That work is out of scope for SW-001 to SW-008, so the frontend will be structured so that its storage layer can be swapped out later.
