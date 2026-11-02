import type { CSSProperties } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  DownloadIcon,
  HardDriveIcon,
  LockKeyholeIcon,
  ScaleIcon,
  type LucideIcon,
} from "lucide-react";

import { AppLogo } from "@/components/layout/app-logo";
import { categoryColorClasses } from "@/config/category-appearance";
import { formatCurrency } from "@/lib/finance/money";
import { formatPercentOf } from "@/lib/finance/reports";
import {
  getSampleCategoryTotals,
  getSampleTotals,
  sampleTransactions,
  type SampleCategory,
} from "@/lib/landing/sample-month";
import { STORAGE_KEY } from "@/lib/persistence/snapshot";
import { cn } from "@/lib/utils";
import type { CategoryColor } from "@/types/finance";

import styles from "./landing.module.css";

// Illustrative financial UI for the landing page. Every number comes from
// lib/landing/sample-month (integer centavos) and is formatted with the
// app's own helpers, so the story adds up. These visuals are decorative
// duplicates of facts stated in the page text, so they're aria-hidden.

const categoryColor: Record<SampleCategory, CategoryColor> = {
  Food: "orange",
  Bills: "amber",
  Transportation: "sky",
  Other: "slate",
};

const totals = getSampleTotals();
const categories = getSampleCategoryTotals();

export const glass = "rounded-2xl bg-card text-card-foreground shadow-xl shadow-black/5 ring-1 ring-foreground/10 dark:shadow-black/40";

function SampleLabel() {
  return <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">Sample month</span>;
}

function Stat({ label, value, tone, icon: Icon }: { label: string; value: string; tone: "income" | "expense" | "neutral"; icon: LucideIcon }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-muted/50 p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("size-3.5", tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-primary")} />
        {label}
      </span>
      <span className="truncate font-heading text-base font-semibold tabular-nums sm:text-lg">{value}</span>
    </div>
  );
}

/** Hero: a floating dashboard with an income card in front of it. */
export function HeroVisual() {
  return (
    <div className={cn(styles.heroScene, "relative mx-auto w-full max-w-lg")} aria-hidden="true">
      <div data-tilt className={cn(styles.heroRig, "relative")}>
        <div className={cn(styles.heroBase, glass, "relative flex flex-col gap-4 p-5")}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <AppLogo size={28} />
              Monthly summary
            </span>
            <SampleLabel />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Income" value={formatCurrency(totals.income)} tone="income" icon={ArrowUpRightIcon} />
            <Stat label="Expenses" value={formatCurrency(totals.expenses)} tone="expense" icon={ArrowDownRightIcon} />
          </div>
          <div className="flex h-24 items-end gap-2 rounded-xl bg-muted/40 p-3">
            {[38, 52, 44, 61, 48, 70].map((height, i) => (
              <div key={i} className="flex h-full flex-1 items-end gap-0.5">
                <div className="w-1/2 rounded-t-[3px] bg-income" style={{ height: `${height}%` }} />
                <div className="w-1/2 rounded-t-[3px] bg-expense" style={{ height: `${height * 0.45}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className={cn(styles.heroFloat, glass, "relative mt-3 flex items-center gap-3 p-4 lg:absolute lg:-right-6 lg:-bottom-8 lg:mt-0 lg:w-64")}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-income/10 text-income">
            <ArrowUpRightIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Salary received</p>
            <p className="font-heading text-lg font-semibold text-income tabular-nums">+{formatCurrency(totals.income)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The dashboard frame behind every story layer (desktop stage). */
export function StageBase() {
  return (
    <div className={cn(glass, "flex h-full flex-col gap-4 p-5")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Spend Wise · Dashboard</span>
        <SampleLabel />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Income" value={formatCurrency(totals.income)} tone="income" icon={ArrowUpRightIcon} />
        <Stat label="Expenses" value={formatCurrency(totals.expenses)} tone="expense" icon={ArrowDownRightIcon} />
        <Stat label="Net cash flow" value={formatCurrency(totals.net, { signed: true })} tone="neutral" icon={ScaleIcon} />
      </div>
      <div className="flex-1 rounded-xl bg-muted/40" />
    </div>
  );
}

/** Scene 2: expenses grouped into categories, with exact shares. */
export function BreakdownCard({ animated = false }: { animated?: boolean }) {
  return (
    <div className={cn(glass, "flex flex-col gap-4 p-5")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Expenses by category</span>
        <span className="font-heading font-semibold tabular-nums">{formatCurrency(totals.expenses)}</span>
      </div>
      <ul className="flex flex-col gap-3">
        {categories.map(({ category, amount }) => (
          <li key={category} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", categoryColorClasses[categoryColor[category]].swatch)} />
                {category}
              </span>
              <span className="tabular-nums">
                {formatCurrency(amount)} <span className="text-xs text-muted-foreground">{formatPercentOf(amount, totals.expenses)}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", categoryColorClasses[categoryColor[category]].swatch, animated && styles.bar)}
                style={{ width: `${(amount / totals.expenses) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Scene 3: the individual transactions behind the category totals. */
export function TransactionsCard({ animated = false }: { animated?: boolean }) {
  return (
    <div className={cn(glass, "flex flex-col gap-3 p-5")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Transactions</span>
        <span className="text-xs text-muted-foreground">{sampleTransactions.length} expenses · {formatCurrency(totals.expenses)}</span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {sampleTransactions.map((t, i) => (
          <li
            key={t.description}
            className={cn("flex items-center justify-between gap-3 py-1.5 text-sm", animated && styles.row)}
            style={animated ? ({ "--i": i } as CSSProperties) : undefined}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("size-2 shrink-0 rounded-full", categoryColorClasses[categoryColor[t.category]].swatch)} />
              <span className="truncate">{t.description}</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{t.category}</span>
            </span>
            <span className="shrink-0 tabular-nums text-expense">-{formatCurrency(t.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Scene 4: income minus expenses. Net cash flow, not savings. */
export function NetCard() {
  return (
    <div className={cn(glass, "flex flex-col gap-4 p-5")}>
      <span className="text-sm font-medium">Net cash flow</span>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Income</dt>
          <dd className="tabular-nums">{formatCurrency(totals.income)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Expenses</dt>
          <dd className="tabular-nums">−{formatCurrency(totals.expenses)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-2">
          <dt className="font-medium">What remains</dt>
          <dd className="font-heading text-2xl font-semibold text-income tabular-nums">{formatCurrency(totals.net, { signed: true })}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {formatPercentOf(totals.net, totals.income)} of income, before you decide what to save.
      </p>
    </div>
  );
}

/** Scene 5: records stay in this browser; back them up as JSON. */
export function PrivacyCard() {
  return (
    <div className={cn(glass, "flex flex-col gap-4 p-5")}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LockKeyholeIcon className="size-5" />
        </span>
        <div>
          <p className="font-medium">Stored in this browser</p>
          <p className="text-xs text-muted-foreground">No account · No cloud sync</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 font-mono text-xs [overflow-wrap:anywhere]">
        <HardDriveIcon className="size-4 shrink-0 text-muted-foreground" />
        localStorage · {STORAGE_KEY}
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-xs">
        <DownloadIcon className="size-4 shrink-0 text-primary" />
        spendwise-backup.json · restore it anytime
      </div>
    </div>
  );
}
