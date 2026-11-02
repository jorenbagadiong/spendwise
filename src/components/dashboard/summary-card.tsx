import type { LucideIcon } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SummaryTone = "income" | "expense" | "neutral";

const toneStyles: Record<SummaryTone, { icon: string; value: string }> = {
  income: { icon: "bg-income/10 text-income", value: "text-income" },
  expense: { icon: "bg-expense/10 text-expense", value: "text-expense" },
  neutral: { icon: "bg-primary/10 text-primary", value: "text-foreground" },
};

type SummaryCardProps = {
  title: string;
  /** Already formatted, e.g. "₱1,234.56". Cards display values, never calculate them. */
  value: string;
  description: string;
  icon: LucideIcon;
  tone: SummaryTone;
};

export function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: SummaryCardProps) {
  const styles = toneStyles[tone];

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <CardAction>
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              styles.icon,
            )}
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p
          className={cn(
            "font-heading text-2xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]",
            styles.value,
          )}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
