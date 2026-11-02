"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarX2Icon,
  LandmarkIcon,
  PlusIcon,
  ScaleIcon,
  SparklesIcon,
  WalletCardsIcon,
} from "lucide-react";

import { SummaryCard, type SummaryTone } from "@/components/dashboard/summary-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateMonthlySummary } from "@/lib/finance/calculations";
import { formatCurrency } from "@/lib/finance/money";
import {
  formatDateLabel,
  formatMonthLabel,
  getMonthKey,
  getSelectableMonths,
} from "@/lib/finance/months";
import { formatGreeting, type TimeOfDay } from "@/lib/profile/profile";
import { useAccountStore } from "@/stores/account-store-provider";
import { useProfileState } from "@/stores/finance-data-provider";
import { useTransactionStore } from "@/stores/transaction-store-provider";
import type { IsoDate, MonthKey } from "@/types/finance";

type FinancialDashboardProps = {
  /** Today in Asia/Manila, computed on the server so both renders agree. */
  today: IsoDate;
  /** For the greeting; also computed on the server. */
  timeOfDay: TimeOfDay;
};

export function FinancialDashboard({ today, timeOfDay }: FinancialDashboardProps) {
  // Shared stores, so changes on other pages show up here.
  const accounts = useAccountStore((state) => state.accounts);
  const transactions = useTransactionStore((state) => state.transactions);
  const fullName = useProfileState((state) => state.profile?.fullName ?? null);
  const isDemo = useProfileState((state) => state.profile?.workspaceMode === "demo");
  const monthSelectLabelId = useId();
  const [month, setMonth] = useState<MonthKey>(getMonthKey(today));

  const monthOptions = getSelectableMonths(
    [...accounts.map((a) => a.openingDate), ...transactions.map((t) => t.date)],
    today,
  ).map((value) => ({ value, label: formatMonthLabel(value) }));

  // All the math lives in lib/finance; this component only displays results.
  const summary = calculateMonthlySummary(accounts, transactions, month, today);
  const monthLabel = formatMonthLabel(month);
  const isEmpty = summary.transactionCount === 0;
  const netTone: SummaryTone =
    summary.netCashFlow > 0 ? "income" : summary.netCashFlow < 0 ? "expense" : "neutral";
  const balanceDescription =
    summary.balanceAsOf === today
      ? `All accounts as of today, ${formatDateLabel(today)}`
      : `All accounts at month end, ${formatDateLabel(summary.balanceAsOf)}`;

  function handleMonthChange(value: MonthKey | null) {
    // Only months from the option list are accepted.
    if (value && monthOptions.some((option) => option.value === value)) {
      setMonth(value);
    }
  }

  const greeting = (
    <div className="flex flex-col gap-1">
      <h2 className="font-heading text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
        {formatGreeting(timeOfDay, fullName)}
      </h2>
      {isDemo && (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <SparklesIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            You&apos;re exploring demo data: these accounts and transactions are examples.{" "}
            <Link href="/settings#demo-data" className="font-medium text-foreground underline underline-offset-4">
              Start fresh with your own data
            </Link>
          </span>
        </p>
      )}
    </div>
  );

  // A new personal workspace has no accounts yet: guide the first step
  // instead of showing ₱0.00 cards.
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {greeting}
        <section
          aria-labelledby="setup-heading"
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-card-foreground"
        >
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <WalletCardsIcon className="size-6" aria-hidden="true" />
          </span>
          <h3 id="setup-heading" className="font-heading text-lg font-semibold">
            Let&apos;s set up your finances.
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Start by adding your first account, then record your income and expenses.
          </p>
          {/* A real link styled as a button: it navigates, so it must be announced as a link. */}
          <Link href="/accounts?new=1" className={buttonVariants({ className: "mt-1" })}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Add your first account
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {greeting}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Monthly summary
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {summary.transactionCount === 1
              ? `1 transaction in ${monthLabel}`
              : `${summary.transactionCount} transactions in ${monthLabel}`}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span id={monthSelectLabelId} className="text-sm font-medium">
            Month
          </span>
          <Select items={monthOptions} value={month} onValueChange={handleMonthChange}>
            <SelectTrigger
              aria-labelledby={monthSelectLabelId}
              className="w-full sm:w-48"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section
        aria-label={`Financial summary for ${monthLabel}`}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          title="Total Income"
          value={formatCurrency(summary.totalIncome)}
          description={`Received in ${monthLabel}`}
          icon={ArrowUpRightIcon}
          tone="income"
        />
        <SummaryCard
          title="Total Expenses"
          value={formatCurrency(summary.totalExpenses)}
          description={`Spent in ${monthLabel}`}
          icon={ArrowDownRightIcon}
          tone="expense"
        />
        <SummaryCard
          title="Net Cash Flow"
          value={formatCurrency(summary.netCashFlow, { signed: true })}
          description="Income minus expenses"
          icon={ScaleIcon}
          tone={netTone}
        />
        <SummaryCard
          title="Total Account Balance"
          value={formatCurrency(summary.totalAccountBalance)}
          description={balanceDescription}
          icon={LandmarkIcon}
          tone="neutral"
        />
      </section>

      {isEmpty && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <CalendarX2Icon className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">No transactions in {monthLabel}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Income, expenses, and net cash flow are ₱0.00 for this month. The
            account balance still includes opening balances and earlier
            transactions.
          </p>
        </div>
      )}
    </div>
  );
}
