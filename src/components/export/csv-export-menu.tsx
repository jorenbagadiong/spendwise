"use client";

import { ChevronDownIcon, DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadTextFile } from "@/lib/persistence/download";

export type CsvExportOption = {
  id: string;
  label: string;
  /** What's in the file, e.g. "12 transactions · filters and sort applied". */
  detail: string;
  disabled?: boolean;
  /** Builds the file when chosen (not before), so the menu costs nothing to render. */
  create: () => { filename: string; csv: string; successMessage: string };
};

export type CsvExportResult = { ok: true; message: string } | { ok: false; message: string };

type CsvExportMenuProps = {
  options: readonly CsvExportOption[];
  onResult: (result: CsvExportResult) => void;
  /** Optional note at the bottom of the menu. */
  footnote?: string;
};

/**
 * "Export CSV" button with a menu of datasets. Choosing one builds the CSV
 * in the browser and downloads it; no dialog, nothing uploaded, nothing
 * saved. The result is reported only after the download was started, so a
 * success message never appears for a file that failed to generate.
 */
export function CsvExportMenu({ options, onResult, footnote }: CsvExportMenuProps) {
  function exportOption(option: CsvExportOption) {
    try {
      const { filename, csv, successMessage } = option.create();
      downloadTextFile(filename, csv, "text/csv;charset=utf-8");
      onResult({ ok: true, message: successMessage });
    } catch {
      // Deliberately not logged: the error could include financial data.
      onResult({
        ok: false,
        message: "The CSV file couldn't be created. Your data hasn't changed; please try again.",
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <DownloadIcon data-icon="inline-start" aria-hidden="true" />
        Export CSV
        <ChevronDownIcon className="text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Download as CSV</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.id}
              disabled={option.disabled}
              onClick={() => exportOption(option)}
              className="flex-col items-start gap-0.5 py-1.5"
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.detail}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {footnote && (
          <>
            <DropdownMenuSeparator />
            <p className="px-1.5 py-1 text-xs text-muted-foreground">{footnote}</p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
