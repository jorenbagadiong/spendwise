import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

import { formatCurrency } from "@/lib/finance/money";
import { formatMonthLabel } from "@/lib/finance/months";
import {
  formatPercentOf,
  type MetricChange,
  type MonthOverMonthComparison,
} from "@/lib/finance/reports";

/**
 * Neutral wording on purpose: "Up" and "Down" with no green/red. Whether
 * higher spending or lower income is good depends on context (a planned
 * purchase, a one-off bonus), so the report doesn't judge.
 */
function describeChange(change: MetricChange, previousLabel: string) {
  if (change.difference === 0) {
    return { Icon: MinusIcon, text: "No change", title: undefined };
  }
  const direction = change.difference > 0 ? "Up" : "Down";
  const amount = formatCurrency(Math.abs(change.difference));
  // A change from ₱0.00 has no percentage; the absolute difference stands alone.
  const percent =
    change.percentChange === null
      ? "% N/A"
      : formatPercentOf(Math.abs(change.difference), Math.abs(change.previous));
  return {
    Icon: change.difference > 0 ? ArrowUpIcon : ArrowDownIcon,
    text: `${direction} ${amount} (${percent})`,
    title:
      change.percentChange === null
        ? `No percentage change: ${previousLabel} was ₱0.00.`
        : undefined,
  };
}

export function MonthComparison({ comparison }: { comparison: MonthOverMonthComparison }) {
  const previousLabel = formatMonthLabel(comparison.previousMonth);
  const rows = [
    { label: "Income", change: comparison.income, signed: false },
    { label: "Expenses", change: comparison.expenses, signed: false },
    { label: "Net cash flow", change: comparison.netCashFlow, signed: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-border">
        {rows.map(({ label, change, signed }) => {
          const { Icon, text, title } = describeChange(change, previousLabel);
          return (
            <div key={label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="flex flex-col gap-0.5 sm:items-end">
                <span className="font-medium tabular-nums">
                  {formatCurrency(change.current, { signed })}
                  <span className="font-normal text-muted-foreground">
                    {" "}vs {formatCurrency(change.previous, { signed })}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground" title={title}>
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  {text}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="text-xs text-muted-foreground">
        Up and down show direction only. Whether a change is good depends on what it was for.
      </p>
    </div>
  );
}
