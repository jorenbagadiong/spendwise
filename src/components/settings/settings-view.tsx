"use client";

import { useRef, useState } from "react";
import {
  CircleCheckIcon,
  DatabaseIcon,
  DownloadIcon,
  PaletteIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { REPORTING_TIME_ZONE } from "@/lib/finance/months";
import { getStorageGuidance, type SaveState } from "@/lib/persistence/controller";
import { backupFilename, downloadTextFile } from "@/lib/persistence/download";
import {
  parseSnapshot,
  SCHEMA_VERSION,
  STORAGE_KEY,
  type FinancialData,
  type FinancialSnapshot,
} from "@/lib/persistence/snapshot";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/stores/account-store-provider";
import { useCategoryStore } from "@/stores/category-store-provider";
import { usePersistence, usePersistenceState } from "@/stores/finance-data-provider";
import { useTransactionStore } from "@/stores/transaction-store-provider";

const statusText: Record<SaveState["kind"], string> = {
  idle: "Loading…",
  saved: "Saved in this browser",
  failed: "Latest changes not saved",
  unavailable: "Browser storage unavailable",
  conflict: "Changed in another tab",
};

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: REPORTING_TIME_ZONE,
  }).format(new Date(iso));
}

function count(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function describeCounts(data: FinancialData) {
  return [
    count(data.accounts.length, "account", "accounts"),
    count(data.categories.length, "category", "categories"),
    `and ${count(data.transactions.length, "transaction", "transactions")}`,
  ].join(", ");
}

export function SettingsView() {
  const controller = usePersistence();
  const saveState = usePersistenceState((state) => state.saveState);
  const accounts = useAccountStore((state) => state.accounts);
  const categories = useCategoryStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
  const fileInput = useRef<HTMLInputElement>(null);

  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [importErrors, setImportErrors] = useState<{ file: string; message: string; problems: string[] } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ file: string; snapshot: FinancialSnapshot } | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const current: FinancialData = { accounts, categories, transactions };
  const writesBlocked = saveState.kind === "conflict" || saveState.kind === "unavailable";
  const guidance = getStorageGuidance(saveState);

  function exportBackup() {
    downloadTextFile(backupFilename(), JSON.stringify(controller.exportSnapshot(), null, 2));
    setNotice({ tone: "success", text: `Downloaded a backup of ${describeCounts(current)}.` });
  }

  async function handleFile(file: File) {
    setNotice(null);
    setImportErrors(null);
    const result = parseSnapshot(await file.text());
    if (result.kind !== "valid") {
      setImportErrors({
        file: file.name,
        message: result.message.replace("The saved data", "The file"),
        problems: result.kind === "invalid-data" ? result.problems : [],
      });
      return;
    }
    setPendingRestore({ file: file.name, snapshot: result.snapshot });
    setRestoreOpen(true);
  }

  function confirmRestore() {
    if (!pendingRestore) return;
    const result = controller.restore(pendingRestore.snapshot);
    setNotice(
      result.ok
        ? { tone: "success", text: `Restored ${describeCounts(pendingRestore.snapshot.data)} from “${pendingRestore.file}”.` }
        : { tone: "error", text: `Nothing was changed. ${result.message}` },
    );
    setRestoreOpen(false);
  }

  function confirmClear() {
    const result = controller.clearAll();
    setNotice(
      result.ok
        ? { tone: "success", text: "All financial data was cleared. Add accounts to start again, or import a backup." }
        : { tone: "error", text: `Nothing was changed. ${result.message}` },
    );
    setClearOpen(false);
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section aria-labelledby="appearance-heading" className="flex flex-col gap-4">
        <h2 id="appearance-heading" className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          <PaletteIcon className="size-4.5 text-muted-foreground" aria-hidden="true" />
          Appearance
        </h2>
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium">Theme</h3>
            <p className="text-sm text-muted-foreground">
              Light, Dark, or System (follows your device). This is the same setting as the
              theme menu in the header, and it&apos;s remembered in this browser.
            </p>
          </div>
          <div className="shrink-0">
            <ThemeToggle showLabel />
          </div>
        </div>
      </section>

      <section aria-labelledby="data-heading" className="flex flex-col gap-4">
        <h2 id="data-heading" className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          <DatabaseIcon className="size-4.5 text-muted-foreground" aria-hidden="true" />
          Data management
        </h2>

        <div role="status" className="empty:hidden">
          {notice && (
            <p
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                notice.tone === "success" ? "border-border bg-card" : "border-destructive/30 bg-destructive/10",
              )}
            >
              {notice.tone === "success" ? (
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="-m-1 rounded p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Dismiss message"
              >
                <XIcon className="size-3.5" aria-hidden="true" />
              </button>
            </p>
          )}
        </div>

        {/* Storage status */}
        <div className="rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10">
          <h3 className="text-sm font-medium text-muted-foreground">Storage status</h3>
          <p
            className={cn(
              "mt-1 font-heading text-lg font-semibold",
              saveState.kind === "saved" ? "text-primary" : "text-destructive",
            )}
          >
            {statusText[saveState.kind]}
          </p>
          <p className="text-sm text-muted-foreground">
            {saveState.kind === "saved" ? `Last saved ${formatTimestamp(saveState.at)}. ` : ""}
            {"message" in saveState ? `${saveState.message} ` : ""}
            Currently {describeCounts(current)}.
          </p>
          {guidance && (
            <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm">
              <span className="font-medium">What to do: </span>
              {guidance}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Stored in this browser only, under <code className="font-mono">{STORAGE_KEY}</code> (schema
            version {SCHEMA_VERSION}). Other browsers and devices don&apos;t see it, and clearing your
            browser&apos;s site data deletes it.
          </p>
        </div>

        {/* Backup */}
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium">Back up your data</h3>
            <p className="text-sm text-muted-foreground">
              Downloads every account, category, and transaction as a versioned JSON file.
              Balances and totals aren&apos;t included; they&apos;re recalculated from the records.
            </p>
          </div>
          <Button onClick={exportBackup} className="shrink-0">
            <DownloadIcon data-icon="inline-start" aria-hidden="true" />
            Export JSON backup
          </Button>
        </div>

        {/* Restore */}
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium">Restore from a backup</h3>
              <p className="text-sm text-muted-foreground">
                Replaces all current data with a Spend Wise JSON backup. The file is checked
                completely first; nothing changes unless it&apos;s valid and you confirm.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0"
              disabled={writesBlocked}
              onClick={() => fileInput.current?.click()}
            >
              <UploadIcon data-icon="inline-start" aria-hidden="true" />
              Import JSON backup
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              aria-label="Backup file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleFile(file);
              }}
            />
          </div>
          {importErrors && (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <p className="font-medium">“{importErrors.file}” can&apos;t be restored. Nothing was changed.</p>
              <p className="text-muted-foreground">{importErrors.message}</p>
              {importErrors.problems.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {importErrors.problems.map((problem) => (
                    <li key={problem} className="[overflow-wrap:anywhere]">
                      {problem}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {writesBlocked && (
            <p className="text-sm text-muted-foreground">
              Restoring is unavailable while changes can&apos;t be saved (see the message above).
            </p>
          )}
        </div>

        {/* Clear */}
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-destructive/30 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium">Clear all financial data</h3>
            <p className="text-sm text-muted-foreground">
              Deletes every account, category, and transaction from this browser. Demo data
              isn&apos;t added back. Export a backup first if you might need the data.
            </p>
          </div>
          <Button
            variant="destructive"
            className="shrink-0"
            disabled={writesBlocked}
            onClick={() => setClearOpen(true)}
          >
            <Trash2Icon data-icon="inline-start" aria-hidden="true" />
            Clear all data
          </Button>
        </div>
      </section>

      <section aria-labelledby="preferences-heading" className="flex flex-col gap-4">
        <h2 id="preferences-heading" className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          <SlidersHorizontalIcon className="size-4.5 text-muted-foreground" aria-hidden="true" />
          Preferences
        </h2>
        <dl className="divide-y divide-border rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10">
          {/* dl > div > dt/dd only (no extra wrapper), laid out with a grid. */}
          <div className="grid gap-1 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
            <dt className="font-medium sm:col-start-1 sm:row-start-1">Currency</dt>
            <dd className="text-sm text-muted-foreground sm:col-start-1 sm:row-start-2">
              Fixed for this version. Amounts are stored in whole centavos and shown as{" "}
              <span className="tabular-nums">₱1,234.56</span>.
            </dd>
            <dd className="font-medium sm:col-start-2 sm:row-span-2 sm:row-start-1">Philippine peso (PHP, ₱)</dd>
          </div>
          <div className="grid gap-1 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
            <dt className="font-medium sm:col-start-1 sm:row-start-1">Reporting time zone</dt>
            <dd className="text-sm text-muted-foreground sm:col-start-1 sm:row-start-2">
              Fixed. Decides &ldquo;today&rdquo; and which month a transaction belongs to.
            </dd>
            <dd className="font-medium sm:col-start-2 sm:row-span-2 sm:row-start-1">Asia/Manila (UTC+8)</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          Other preferences, such as switching currency, are planned for later versions.
        </p>
      </section>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          {pendingRestore && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Replace all data with this backup?</AlertDialogTitle>
                <AlertDialogDescription>
                  “{pendingRestore.file}” (saved {formatTimestamp(pendingRestore.snapshot.updatedAt)}) has{" "}
                  {describeCounts(pendingRestore.snapshot.data)}. It will replace your current{" "}
                  {describeCounts(current)}. Download a backup of the current data first if you
                  might need it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" onClick={exportBackup}>
                  <DownloadIcon data-icon="inline-start" aria-hidden="true" />
                  Back up current data
                </Button>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRestore}>Replace data</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all financial data?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes {describeCounts(current)} from this browser. It can&apos;t be undone.
              To keep a copy, export a backup first; you can restore it later from this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={exportBackup}>
              <DownloadIcon data-icon="inline-start" aria-hidden="true" />
              Export backup first
            </Button>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmClear}>
              Clear all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
