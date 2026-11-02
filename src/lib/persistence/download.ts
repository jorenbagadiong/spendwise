import { getTodayInManila } from "@/lib/finance/months";

/**
 * Saves text as a file through the browser's download mechanism. Runs
 * entirely in the browser; nothing is uploaded. Defaults to JSON (backups);
 * CSV exports pass "text/csv;charset=utf-8".
 */
export function downloadTextFile(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** e.g. "spendwise-backup-2026-11-02.json" (date in Asia/Manila). */
export function backupFilename(kind: "backup" | "unreadable-data" = "backup", now = new Date()) {
  return `spendwise-${kind}-${getTodayInManila(now)}.json`;
}
