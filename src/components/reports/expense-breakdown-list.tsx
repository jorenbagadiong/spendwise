import type { ReactNode } from "react";

import { formatCurrency } from "@/lib/finance/money";
import { formatPercentOf } from "@/lib/finance/reports";
import { cn } from "@/lib/utils";
import type { Centavos } from "@/types/finance";

export type BreakdownListItem = {
  id: string;
  name: string;
  isArchived: boolean;
  amount: Centavos;
  /** 0–100, unrounded; used for the bar width only. */
  percentage: number;
  /** Secondary line, e.g. "Bank · 3 expenses". */
  detail: string;
  /** Leading visual (icon badge); decorative. */
  leading?: ReactNode;
  /** Tailwind background class for the share bar. */
  barClassName: string;
};

type ExpenseBreakdownListProps = {
  /** Accessible name for the list, e.g. "Expenses by category, November 2026". */
  label: string;
  items: readonly BreakdownListItem[];
  /** Total expenses for the period; shares are formatted exactly from it. */
  total: Centavos;
};

/**
 * Ranked list (highest first) with a share bar per row. The bar is
 * decorative: the name, exact amount, and percentage are always written out,
 * so nothing depends on color or bar length. Every row is listed; small
 * amounts are never folded into an "Others" row.
 */
export function ExpenseBreakdownList({ label, items, total }: ExpenseBreakdownListProps) {
  return (
    <ol aria-label={label} className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3">
          {item.leading}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {item.name}
                  {item.isArchived && " "}
                  {item.isArchived && (
                    <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      Archived
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-medium tabular-nums">{formatCurrency(item.amount)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatPercentOf(item.amount, total)}</p>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className={cn("h-full rounded-full", item.barClassName)}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
