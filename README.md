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

Planned for later milestones (not installed yet): Zustand (shared state), React Hook Form + Zod (forms), and `localStorage` persistence.

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
│   │   └── ui/                     # shadcn/ui components (button, dropdown-menu, sheet)
│   ├── config/
│   │   └── navigation.ts           # Routes, titles, descriptions, icons (single source)
│   └── lib/
│       └── utils.ts                # Shared helpers (`cn` class-name merging)
├── components.json                 # shadcn/ui configuration
├── eslint.config.mjs               # ESLint flat config
├── next.config.ts                  # Next.js config (Cache Components, `/` redirect)
├── postcss.config.mjs              # Tailwind CSS v4 PostCSS plugin
├── tsconfig.json                   # TypeScript config (strict mode, `@/*` → `src/*`)
└── AGENTS.md                       # Next.js-generated notes for AI coding agents
```

Future folders (`src/features`, `src/stores`, `src/types`, `src/hooks`) will be added only when a milestone needs them.

## Routes

| Path            | Page                                   |
| --------------- | -------------------------------------- |
| `/`             | Redirects to `/dashboard` (temporary 307, set in `next.config.ts`) |
| `/dashboard`    | Dashboard (placeholder)                |
| `/transactions` | Transactions (placeholder)             |
| `/accounts`     | Accounts (placeholder)                 |
| `/categories`   | Categories (placeholder)               |
| `/reports`      | Reports (placeholder)                  |
| `/settings`     | Settings (placeholder)                 |

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

## Current features

- **SW-001:** project scaffold with Next.js App Router, TypeScript strict mode, Tailwind CSS v4, shadcn/ui, and Lucide icons
- **SW-002:** responsive app shell
  - Sidebar with active-route highlighting and a mobile drawer
  - Header with page title, description, and today's date
  - Light/dark/system theme with a navy and emerald palette
  - Placeholder pages for all six sections

## Development progress

A story is checked only when its acceptance criteria and verification checks (typecheck, lint, build, and browser checks where applicable) pass.

- [x] **SW-001** — Project initialization (Next.js, TypeScript, Tailwind v4, shadcn/ui, Lucide, ESLint, starter page)
- [x] **SW-002** — Responsive app shell and theme system (sidebar, header, mobile drawer, routes, light/dark/system theme)
- [ ] **SW-003** — Domain model and types (transactions, accounts, categories) with a Zustand store
- [ ] **SW-004** — Spreadsheet-style transaction table
- [ ] **SW-005** — Add and edit transactions (React Hook Form + Zod validation)
- [ ] **SW-006** — Accounts management and per-account balances
- [ ] **SW-007** — Summary dashboard (income, expenses, remaining money)
- [ ] **SW-008** — `localStorage` persistence

> SW-003 to SW-008 are the proposed frontend roadmap. Their scope will be confirmed before each story starts. The Categories and Reports pages exist in the navigation but don't have their own milestone yet. Category management is expected to start with the domain model in SW-003, and reports aren't scheduled yet.

**Next milestone:** SW-003 — Domain model and types.

## Current limitations

- All six pages are placeholders. There are no transaction, account, category, or report features yet.
- No data persistence apart from the theme choice. Nothing else is saved between sessions.
- The header date is formatted in the browser after load, so it appears a moment after the rest of the header. It doesn't update if the page stays open past midnight.
- Chart color tokens (`--chart-1` to `--chart-5`) are still the shadcn/ui grayscale defaults and will be themed when charts are added.
- No automated tests yet. SW-002 browser checks were run manually with Playwright and are not part of the repo.

## Planned backend integration

After the frontend milestones, data storage is planned to move from `localStorage` to a backend (API, database, and authentication). That work is out of scope for SW-001 to SW-008, so the frontend will be structured so that its storage layer can be swapped out later.
