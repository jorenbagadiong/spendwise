"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarClockIcon,
  CalendarX2Icon,
  ChartColumnIcon,
  PercentIcon,
  ScaleIcon,
} from "lucide-react";

import { CategoryIconBadge } from "@/components/categories/category-icon-badge";
import { SummaryCard, type SummaryTone } from "@/components/dashboard/summary-card";
import {
  ExpenseBreakdownList,
  type BreakdownListItem,
} from "@/components/reports/expense-breakdown-list";
import { MonthComparison } from "@/components/reports/month-comparison";
import { MonthlyTrendChart } from "@/components/reports/monthly-trend-chart";
import { ReportPeriodPicker } from "@/components/reports/report-period-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { categoryColorClasses } from "@/config/category-appearance";
import { accountTypeLabels } from "@/lib/finance/accounts";
import { formatCurrency } from "@/lib/finance/money";
import { formatMonthLabel, getMonthKey } from "@/lib/finance/months";
import {
  countFutureDatedTransactions,
  formatPercent,
  getExpensesByAccount,
  getExpensesByCategory,
  getMonthlyReport,
  getMonthlyTrend,
  getMonthOverMonthComparison,
  getReportMonths,
} from "@/lib/finance/reports";
import { useAccountStore } from "@/stores/account-store-provider";
import { useCategoryStore } from "@/stores/category-store-provider";
import { useTransactionStore } from "@/stores/transaction-store-provider";
import type { IsoDate, MonthKey } from "@/types/finance";

type FinancialReportsProps = {
  /** Today in Asia/Manila, computed on the server so both renders agree. */
  today: IsoDate;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The Reports page. It reads the same shared stores as the dashboard and
 * derives every number with lib/finance/reports, so reports update as soon
 * as a transaction, account, or category changes (or a backup is restored).
 * Nothing calculated here is stored. DataGate (in the layout) keeps this
 * hidden until saved data has loaded, so it never shows placeholder totals.
 */
export function FinancialReports({ today }: FinancialReportsProps) {
  const accounts = useAccountStore((state) => state.accounts);
  const categories = useCategoryStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(getMonthKey(today));

  const months = useMemo(
    () => getReportMonths(accounts, transactions, today),
    [accounts, transactions, today],
  );
  // If the data changes underneath (e.g. a restored backup covers other
  // months), fall back to the current month rather than an unlisted one.
  const month = months.includes(selectedMonth) ? selectedMonth : getMonthKey(today);
  const monthLabel = formatMonthLabel(month);

  // Recomputed only when the selected month or the underlying data changes,
  // not on unrelated re-renders.
  const report = useMemo(() => getMonthlyReport(transactions, month), [transactions, month]);
  const trend = useMemo(() => getMonthlyTrend(transactions, month), [transactions, month]);
  const comparison = useMemo(() => getMonthOverMonthComparison(transactions, month), [transactions, month]);
  const byCategory = useMemo(
    () => getExpensesByCategory(transactions, categories, month),
    [transactions, categories, month],
  );
  const byAccount = useMemo(
    () => getExpensesByAccount(transactions, accounts, month),
    [transactions, accounts, month],
  );
  const futureCount = useMemo(
    () => countFutureDatedTransactions(transactions, month, today),
    [transactions, month, today],
  );

  if (transactions.length === 0) {
    return <NoDataState />;
  }

  const netTone: SummaryTone =
    report.netCashFlow > 0 ? "income" : report.netCashFlow < 0 ? "expense" : "neutral";

  const categoryItems: BreakdownListItem[] = byCategory.rows.map((row) => ({
    id: row.id,
    name: row.name,
    isArchived: row.isArchived,
    amount: row.amount,
    percentage: row.percentage,
    detail: plural(row.transactionCount, "expense"),
    leading: row.category ? (
      <CategoryIconBadge
        icon={row.category.icon}
        color={row.category.color}
        muted={row.isArchived}
        className="size-9 [&_svg]:size-4"
      />
    ) : undefined,
    barClassName: row.category ? categoryColorClasses[row.category.color].swatch : "bg-muted-foreground",
  }));

  const accountItems: BreakdownListItem[] = byAccount.rows.map((row) => ({
    id: row.id,
    name: row.name,
    isArchived: row.isArchived,
    amount: row.amount,
    percentage: row.percentage,
    detail: [row.account && accountTypeLabels[row.account.type], plural(row.transactionCount, "expense")]
      .filter(Boolean)
      .join(" · "),
    barClassName: "bg-primary",
  }));

  const noExpensesMessage =
    report.totalIncome > 0
      ? `No expenses in ${monthLabel}. Income this month was ${formatCurrency(report.totalIncome)}.`
      : `No expenses in ${monthLabel}.`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Financial report · {monthLabel}
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {plural(report.transactionCount, "transaction")} in {monthLabel}, transfers included
          </p>
        </div>
        <ReportPeriodPicker months={months} value={month} onChange={setSelectedMonth} />
      </div>

      {futureCount > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <CalendarClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {plural(futureCount, "transaction")} in {monthLabel}{" "}
          {futureCount === 1 ? "is" : "are"} dated after today. They&apos;re included in these
          totals, the same as on the dashboard.
        </p>
      )}

      <section
        aria-label={`Financial summary for ${monthLabel}`}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          title="Total Income"
          value={formatCurrency(report.totalIncome)}
          description={`Received in ${monthLabel}`}
          icon={ArrowUpRightIcon}
          tone="income"
        />
        <SummaryCard
          title="Total Expenses"
          value={formatCurrency(report.totalExpenses)}
          description={`Spent in ${monthLabel}`}
          icon={ArrowDownRightIcon}
          tone="expense"
        />
        <SummaryCard
          title="Net Cash Flow"
          value={formatCurrency(report.netCashFlow, { signed: true })}
          description="Income minus expenses"
          icon={ScaleIcon}
          tone={netTone}
        />
        <SummaryCard
          title="Cash Flow Margin"
          value={formatPercent(report.cashFlowMargin)}
          description={
            report.cashFlowMargin === null
              ? "No income this month, so there's no margin to calculate"
              : "Net cash flow as a share of income"
          }
          icon={PercentIcon}
          tone="neutral"
        />
      </section>

      {report.transactionCount === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <CalendarX2Icon className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">No transactions in {monthLabel}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Totals are ₱0.00 for this month. The trend below still shows the five months before it.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <ReportSection
          title="Income vs expenses"
          description={`${formatMonthLabel(trend[0].month)} to ${monthLabel}. Select a month to view it.`}
          className="lg:col-span-2"
        >
          <MonthlyTrendChart points={trend} selectedMonth={month} onSelectMonth={setSelectedMonth} />
        </ReportSection>

        <ReportSection
          title="Compared with last month"
          description={`${monthLabel} vs ${formatMonthLabel(comparison.previousMonth)}`}
        >
          <MonthComparison comparison={comparison} />
        </ReportSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportSection
          title="Expenses by category"
          description={`Total ${formatCurrency(byCategory.totalExpenses)} in ${monthLabel}`}
        >
          {categoryItems.length > 0 ? (
            <ExpenseBreakdownList label={`Expenses by category, ${monthLabel}`} items={categoryItems} />
          ) : (
            <EmptySection message={noExpensesMessage} />
          )}
        </ReportSection>

        <ReportSection
          title="Spending by account"
          description={`Where ${monthLabel}'s expenses were paid from. Not account balances; transfers excluded.`}
        >
          {accountItems.length > 0 ? (
            <ExpenseBreakdownList label={`Spending by account, ${monthLabel}`} items={accountItems} />
          ) : (
            <EmptySection message={noExpensesMessage} />
          )}
        </ReportSection>
      </div>
    </div>
  );
}

function ReportSection({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="font-heading text-base font-medium">{title}</h3>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptySection({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{message}</p>;
}

function NoDataState() {
  return (
    <section
      aria-labelledby="reports-empty-title"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-card-foreground"
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ChartColumnIcon className="size-6" aria-hidden="true" />
      </span>
      <h2 id="reports-empty-title" className="font-heading text-lg font-semibold">
        No transactions to report yet
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Reports are built from your recorded income and expenses. Opening balances aren&apos;t
        income, so they don&apos;t appear here.
      </p>
      <Button render={<Link href="/transactions" />} nativeButton={false}>
        Add a transaction
      </Button>
    </section>
  );
}
