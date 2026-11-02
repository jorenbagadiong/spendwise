"use client";

import { useState } from "react";
import { DatabaseIcon, DownloadIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";

import { PersistenceBanner } from "@/components/persistence/persistence-banner";
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
import { backupFilename, downloadTextFile } from "@/lib/persistence/download";
import { usePersistence, usePersistenceState } from "@/stores/finance-data-provider";

/**
 * Shows page content only once saved data has been read. Until then it
 * shows a loading state (never demo totals), and if the saved data can't be
 * read it shows a recovery screen instead of overwriting anything.
 *
 * The page itself is always rendered (Next.js validates every route
 * segment), but kept hidden with display: none until the data is ready.
 * While hidden, the stores are still empty, so no demo or stale totals can
 * appear in the server HTML.
 */
export function DataGate({ children }: { children: React.ReactNode }) {
  const status = usePersistenceState((state) => state.status);
  const ready = status === "ready";

  return (
    <>
      {status === "loading" && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <DatabaseIcon className="size-4" aria-hidden="true" />
          Loading your saved data…
        </div>
      )}
      {status === "load-error" && <RecoveryScreen />}
      <div hidden={!ready} className={ready ? "flex flex-col gap-6" : "hidden"}>
        {ready && <PersistenceBanner />}
        {children}
      </div>
    </>
  );
}

function RecoveryScreen() {
  const controller = usePersistence();
  const loadError = usePersistenceState((state) => state.loadError);
  const [replaceWith, setReplaceWith] = useState<"demo" | "empty" | null>(null);
  const [lastChoice, setLastChoice] = useState<"demo" | "empty">("demo");
  const [failure, setFailure] = useState<string | null>(null);

  if (!loadError) return null;

  const title =
    loadError.kind === "unsupported-version"
      ? "Your saved data is from a different version"
      : "Your saved data couldn't be loaded";

  return (
    <section
      aria-labelledby="recovery-title"
      className="flex max-w-2xl flex-col gap-5 rounded-xl bg-card p-6 text-card-foreground ring-1 ring-destructive/30"
    >
      <div className="flex items-start gap-3">
        <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h2 id="recovery-title" className="font-heading text-lg font-semibold">
            {title}
          </h2>
          <p className="text-sm">{loadError.message}</p>
          <p className="text-sm text-muted-foreground">
            Nothing has been changed or deleted. Spend Wise won&apos;t save anything
            until you decide what to do. Download the saved data first to keep a copy.
          </p>
        </div>
      </div>

      {loadError.problems.length > 0 && (
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="mb-1 text-sm font-medium">Problems found</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {loadError.problems.map((problem) => (
              <li key={problem} className="[overflow-wrap:anywhere]">
                {problem}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => downloadTextFile(backupFilename("unreadable-data"), loadError.raw)}>
          <DownloadIcon data-icon="inline-start" aria-hidden="true" />
          Download saved data
        </Button>
        <Button variant="outline" onClick={() => controller.reload()}>
          <RotateCwIcon data-icon="inline-start" aria-hidden="true" />
          Try again
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm font-medium">Start over</p>
        <p className="text-sm text-muted-foreground">
          This replaces the saved data in this browser. You can restore the downloaded
          copy later from Settings if it&apos;s a valid backup.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setLastChoice("demo");
              setReplaceWith("demo");
            }}
          >
            Replace with demo data
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setLastChoice("empty");
              setReplaceWith("empty");
            }}
          >
            Start with no data
          </Button>
        </div>
        {failure && (
          <p role="alert" className="text-sm text-destructive">
            {failure}
          </p>
        )}
      </div>

      <AlertDialog open={replaceWith !== null} onOpenChange={(open) => !open && setReplaceWith(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the saved data?</AlertDialogTitle>
            <AlertDialogDescription>
              The unreadable saved data will be overwritten with{" "}
              {lastChoice === "demo" ? "demo data" : "an empty dataset"}. This can&apos;t be
              undone unless you&apos;ve downloaded it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const result = controller.replaceUnreadableData(lastChoice);
                setFailure(result.ok ? null : result.message);
                setReplaceWith(null);
              }}
            >
              Replace saved data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
