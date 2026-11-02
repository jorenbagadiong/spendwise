import { getTodayInManila } from "@/lib/finance/months";

/** Saves text as a file through the browser's download mechanism. */
export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
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
