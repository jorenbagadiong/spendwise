"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SparklesIcon } from "lucide-react";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getNavigationItem } from "@/config/navigation";
import { REPORTING_TIME_ZONE } from "@/lib/finance/months";
import { usePersistenceState, useProfileState } from "@/stores/finance-data-provider";

export function AppHeader() {
  const pathname = usePathname();
  const page = getNavigationItem(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <MobileNavigation />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-heading text-lg font-semibold tracking-tight sm:text-xl">
            {page?.title ?? "Spend Wise Tracker"}
          </h1>
          {page && (
            <p className="truncate text-sm text-muted-foreground">
              {page.description}
            </p>
          )}
        </div>
        <DemoModeBadge />
        <CurrentDate />
        <ThemeToggle />
      </div>
    </header>
  );
}

const subscribe = () => () => {};
const getDateSnapshot = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: REPORTING_TIME_ZONE,
  });
const getServerDateSnapshot = () => null;

// Shows today's date in Asia/Manila, matching the dashboard's reporting date,
// formatted in the visitor's locale. The locale is only known in the browser,
// so useSyncExternalStore renders nothing on the server and the formatted
// date in the browser, without a hydration mismatch.
function CurrentDate() {
  const date = useSyncExternalStore(
    subscribe,
    getDateSnapshot,
    getServerDateSnapshot,
  );

  return (
    <p className="hidden min-w-28 text-right text-sm text-muted-foreground sm:block">
      {date}
    </p>
  );
}

/**
 * Shown while the workspace is the demo dataset (SW-010): a small, always
 * visible reminder that the records are examples, linking to the Settings
 * action that clears them. Rendered only in the browser after the profile
 * loads, so there's nothing to mismatch during hydration.
 */
function DemoModeBadge() {
  const mode = useProfileState((state) => state.profile?.workspaceMode);
  const workspace = usePersistenceState((state) => state.workspace);
  if (mode !== "demo" || workspace !== "present") return null;

  return (
    <Link
      href="/settings#demo-data"
      className="flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground outline-none hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label="Demo mode: these are example records. Open Settings to clear them and start fresh."
    >
      <SparklesIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      Demo mode
    </Link>
  );
}
