"use client";

import { useId, useState } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarX2Icon,
  LandmarkIcon,
  ScaleIcon,
} from "lucide-react";

import { SummaryCard, type SummaryTone } from "@/components/dashboard/summary-card";
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
import type { Account, IsoDate, MonthKey, Transaction } from "@/types/finance";

type FinancialDashboardProps = {
  accounts: readonly Account[];
  transactions: readonly Transaction[];
  /** Today in Asia/Manila, computed on the server so both renders agree. */
  today: IsoDate;
};

export function FinancialDashboard({
  accounts,
  transactions,
  today,
}: FinancialDashboardProps) {
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

  return (
    <div className="flex flex-col gap-6">
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
