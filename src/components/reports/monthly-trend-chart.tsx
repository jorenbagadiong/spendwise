"use client";

import type { CSSProperties } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompactCurrency, formatCurrency } from "@/lib/finance/money";
import { formatMonthLabel } from "@/lib/finance/months";
import { getNiceAxisMax, type MonthlyTrendPoint } from "@/lib/finance/reports";
import { cn } from "@/lib/utils";
import type { MonthKey } from "@/types/finance";

// Hand-built bar chart (no chart library): six months × two bars is simple
// enough for CSS, and plain elements size themselves correctly even while
// the page is hidden behind DataGate.
//
// The theme's income and expense colors are hard to tell apart with
// red-green color blindness, especially in dark mode, so color is never the
// only cue: income is always the left bar, expense bars carry a diagonal
// stripe (also shown in the legend), and the tooltip and table name each value.

const TICKS = 4;

/** Diagonal stripes in the card color over the expense fill. */
const expenseTexture: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, transparent 0 3px, color-mix(in oklab, var(--card) 55%, transparent) 3px 5px)",
};

/** "Jan" plus the year on its own line where the year changes, so labels fit narrow columns. */
function MonthTick({ month, withYear }: { month: MonthKey; withYear: boolean }) {
  return (
    <>
      {formatMonthLabel(month).slice(0, 3)}
      {withYear && <span className="block text-[0.65rem] text-muted-foreground">{month.slice(0, 4)}</span>}
    </>
  );
}

function describePoint(point: MonthlyTrendPoint): string {
  return `${formatMonthLabel(point.month)}: income ${formatCurrency(point.income)}, expenses ${formatCurrency(point.expenses)}, net cash flow ${formatCurrency(point.netCashFlow, { signed: true })}`;
}

type MonthlyTrendChartProps = {
  points: readonly MonthlyTrendPoint[];
  selectedMonth: MonthKey;
  onSelectMonth: (month: MonthKey) => void;
};

export function MonthlyTrendChart({ points, selectedMonth, onSelectMonth }: MonthlyTrendChartProps) {
  const axisMax = getNiceAxisMax(Math.max(0, ...points.flatMap((p) => [p.income, p.expenses])));
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (axisMax * (TICKS - i)) / TICKS);
  const hasActivity = axisMax > 0;
  const columns: CSSProperties = { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` };
  const heightOf = (value: number) => (axisMax === 0 ? "0%" : `${(value / axisMax) * 100}%`);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-income" aria-hidden="true" />
          Income (left bar)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-expense" style={expenseTexture} aria-hidden="true" />
          Expenses (right bar, striped)
        </li>
      </ul>

      <div className="flex gap-2">
        {/* Y axis labels; visual only, the table carries exact values. */}
        <div className="relative h-56 w-11 shrink-0 text-right text-[0.7rem] text-muted-foreground tabular-nums" aria-hidden="true">
          {hasActivity &&
            ticks.map((tick, i) => (
              <span
                key={i}
                className="absolute right-0 -translate-y-1/2"
                style={{ top: `${(i / TICKS) * 100}%` }}
              >
                {formatCompactCurrency(tick)}
              </span>
            ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            {/* Gridlines */}
            {ticks.map((tick, i) => (
              <div
                key={i}
                className={cn("absolute inset-x-0 border-t", i === TICKS ? "border-border" : "border-border/60")}
                style={{ top: `${(i / TICKS) * 100}%` }}
                aria-hidden="true"
              />
            ))}

            <ol className="relative grid h-full" style={columns} aria-label="Income and expenses by month">
              {points.map((point, index) => {
                const selected = point.month === selectedMonth;
                const align =
                  index === 0 ? "left-0" : index === points.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
                return (
                  <li key={point.month} className="relative h-full">
                    <button
                      type="button"
                      onClick={() => onSelectMonth(point.month)}
                      aria-label={`${describePoint(point)}.${selected ? " Selected period." : " Show this month."}`}
                      aria-pressed={selected}
                      className={cn(
                        "group/bar flex h-full w-full items-end justify-center gap-0.5 rounded-md px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        selected ? "bg-muted/70" : "hover:bg-muted/40",
                      )}
                    >
                      <span
                        className="w-full max-w-6 rounded-t-[4px] bg-income"
                        style={{ height: heightOf(point.income), minHeight: point.income > 0 ? 2 : 0 }}
                        aria-hidden="true"
                      />
                      <span
                        className="w-full max-w-6 rounded-t-[4px] bg-expense"
                        style={{ ...expenseTexture, height: heightOf(point.expenses), minHeight: point.expenses > 0 ? 2 : 0 }}
                        aria-hidden="true"
                      />
                    </button>
                    {/* Tooltip on hover or keyboard focus. The button's label already says the same for screen readers. */}
                    <div
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute top-1 z-10 hidden w-44 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10",
                        "[li:has(button:hover)>&]:block [li:has(button:focus-visible)>&]:block",
                        align,
                      )}
                    >
                      <p className="mb-1.5 font-medium">{formatMonthLabel(point.month)}</p>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 tabular-nums">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-sm bg-income" />
                          Income
                        </dt>
                        <dd className="text-right">{formatCurrency(point.income)}</dd>
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-sm bg-expense" style={expenseTexture} />
                          Expenses
                        </dt>
                        <dd className="text-right">{formatCurrency(point.expenses)}</dd>
                        <dt className="text-muted-foreground">Net</dt>
                        <dd className="text-right font-medium">
                          {formatCurrency(point.netCashFlow, { signed: true })}
                        </dd>
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ol>

            {!hasActivity && (
              <p className="absolute inset-x-0 top-1/3 text-center text-sm text-muted-foreground">
                No income or expenses in these six months.
              </p>
            )}
          </div>

          {/* X axis labels */}
          <div className="mt-2 grid text-center text-xs" style={columns} aria-hidden="true">
            {points.map((point, index) => (
              <span
                key={point.month}
                className={cn(
                  "truncate",
                  point.month === selectedMonth ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                <MonthTick month={point.month} withYear={index === 0 || point.month.endsWith("-01")} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="group/details rounded-lg border border-border">
        <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          Show as table
        </summary>
        <Table>
          <caption className="sr-only">Income, expenses, and net cash flow for the six months shown in the chart</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Net cash flow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((point) => (
              <TableRow key={point.month} aria-current={point.month === selectedMonth ? "true" : undefined}>
                <TableCell className={cn(point.month === selectedMonth && "font-semibold")}>
                  {formatMonthLabel(point.month)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(point.income)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(point.expenses)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(point.netCashFlow, { signed: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  );
}
