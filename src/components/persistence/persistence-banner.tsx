"use client";

import { DownloadIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { backupFilename, downloadTextFile } from "@/lib/persistence/download";
import { usePersistence, usePersistenceState } from "@/stores/finance-data-provider";

/**
 * A visible warning whenever what's on screen isn't safely stored: a failed
 * save, unavailable storage, or a newer save from another tab. Nothing is
 * shown while everything is saved.
 */
export function PersistenceBanner() {
  const controller = usePersistence();
  const saveState = usePersistenceState((state) => state.saveState);

  if (saveState.kind !== "failed" && saveState.kind !== "unavailable" && saveState.kind !== "conflict") {
    return null;
  }

  const title =
    saveState.kind === "conflict"
      ? "Data changed in another tab"
      : saveState.kind === "unavailable"
        ? "Changes are only kept in this tab"
        : "Your latest changes aren't saved";

  const downloadThisTab = () =>
    downloadTextFile(backupFilename(), JSON.stringify(controller.exportSnapshot(), null, 2));

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground">
            {saveState.message}
            {saveState.kind === "failed" && " Your next change will try again. Download a backup to keep a copy."}
            {saveState.kind === "conflict" &&
              " Download this tab's data if you want to keep its changes, then load the latest data."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={downloadThisTab}>
          <DownloadIcon data-icon="inline-start" aria-hidden="true" />
          {saveState.kind === "conflict" ? "Download this tab's data" : "Download backup"}
        </Button>
        {saveState.kind === "conflict" && (
          <Button size="sm" onClick={() => controller.reload()}>
            <RotateCwIcon data-icon="inline-start" aria-hidden="true" />
            Load latest data
          </Button>
        )}
      </div>
    </div>
  );
}
