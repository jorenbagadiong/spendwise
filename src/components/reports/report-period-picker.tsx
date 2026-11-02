"use client";

import { useId } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonthLabel } from "@/lib/finance/months";
import type { MonthKey } from "@/types/finance";

type ReportPeriodPickerProps = {
  /** Newest first, as returned by getReportMonths. */
  months: readonly MonthKey[];
  value: MonthKey;
  onChange: (month: MonthKey) => void;
};

/** Month dropdown with previous/next buttons. Only listed months can be chosen. */
export function ReportPeriodPicker({ months, value, onChange }: ReportPeriodPickerProps) {
  const labelId = useId();
  const options = months.map((month) => ({ value: month, label: formatMonthLabel(month) }));
  const index = months.indexOf(value);
  // Newest first: the older month is at index + 1.
  const older = months[index + 1];
  const newer = index > 0 ? months[index - 1] : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium">
        Reporting period
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          disabled={!older}
          onClick={() => older && onChange(older)}
          aria-label={older ? `Previous month, ${formatMonthLabel(older)}` : "Previous month"}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Select
          items={options}
          value={value}
          onValueChange={(next: MonthKey | null) => {
            if (next && months.includes(next)) onChange(next);
          }}
        >
          <SelectTrigger aria-labelledby={labelId} className="w-full min-w-0 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          disabled={!newer}
          onClick={() => newer && onChange(newer)}
          aria-label={newer ? `Next month, ${formatMonthLabel(newer)}` : "Next month"}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
