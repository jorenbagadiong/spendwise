# Spend Wise Tracker

A modern, responsive, spreadsheet-style personal finance tracker for monitoring salary, daily expenses, multiple accounts, and remaining money.

The project is built frontend-first: the UI and data handling run entirely in the browser before any backend is introduced.

## Technology stack

| Area          | Choice                                                    | Installed version |
| ------------- | --------------------------------------------------------- | ----------------- |
| Framework     | [Next.js](https://nextjs.org) (App Router, Turbopack)     | 16.4.3            |
| UI library    | React                                                     | 19.3.0            |
| Language      | TypeScript (strict mode)                                  | 5.9.3             |
| Styling       | Tailwind CSS v4 (CSS-first config, no `tailwind.config`)  | 4.3.3             |
| Components    | [shadcn/ui](https://ui.shadcn.com) (`base-nova` style, Base UI primitives, CSS variables) | CLI 4.23.0 |
| Icons         | Lucide React                                              | 1.66.0            |
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

Add shadcn/ui components when a feature needs them:

```bash
npx shadcn@latest add <component>
```

## Folder structure

```
spendwise/
├── src/
│   ├── app/                 # App Router: routes, layouts, global styles
│   │   ├── globals.css      # Tailwind v4 import, theme tokens (CSS variables)
│   │   ├── layout.tsx       # Root layout: fonts, metadata, <html>/<body>
│   │   ├── page.tsx         # Home page ("/")
│   │   └── favicon.ico
│   ├── components/
│   │   └── ui/              # shadcn/ui components (generated, owned by this repo)
│   └── lib/
│       └── utils.ts         # Shared helpers (`cn` class-name merging)
├── components.json          # shadcn/ui configuration
├── eslint.config.mjs        # ESLint flat config
├── next.config.ts           # Next.js configuration (Tailwind via Turbopack loader)
├── tsconfig.json            # TypeScript config (strict mode, `@/*` → `src/*`)
└── AGENTS.md                # Next.js-generated notes for AI coding agents
```

Future folders (`src/features`, `src/stores`, `src/types`, `src/hooks`) will be added only when a milestone needs them.

## Current features

- Project scaffold with Next.js App Router, TypeScript strict mode, Tailwind CSS v4, shadcn/ui, and Lucide icons
- Starter home page displaying "Spend Wise Tracker"
- Light/dark theme tokens defined as CSS variables (no theme toggle yet)

## Development progress

A story is checked only when its acceptance criteria and verification checks (typecheck, lint, build) pass.

- [x] **SW-001** — Project initialization (Next.js, TypeScript, Tailwind v4, shadcn/ui, Lucide, ESLint, starter page)
- [ ] **SW-002** — App shell and theming (navy/emerald design tokens, responsive layout, light/dark mode)
- [ ] **SW-003** — Domain model and types (transactions, accounts, categories) with a Zustand store
- [ ] **SW-004** — Spreadsheet-style transaction table
- [ ] **SW-005** — Add and edit transactions (React Hook Form + Zod validation)
- [ ] **SW-006** — Accounts management and per-account balances
- [ ] **SW-007** — Summary dashboard (income, expenses, remaining money)
- [ ] **SW-008** — `localStorage` persistence

> SW-002 to SW-008 are the proposed frontend roadmap. Their scope will be confirmed before each story starts.

## Current limitations

- No transaction, account, or budgeting features yet; the app shows only a starter page.
- No data persistence. Nothing is saved between sessions.
- No theme toggle. Dark styles follow the `.dark` class, which nothing sets yet.
- No automated tests yet.

## Planned backend integration

After the frontend milestones, data storage is planned to move from `localStorage` to a backend (API, database, and authentication). That work is out of scope for SW-001 to SW-008, so the frontend will be structured so that its storage layer can be swapped out later.
