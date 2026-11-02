"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getNavigationItem } from "@/config/navigation";

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
  });
const getServerDateSnapshot = () => null;

// The date depends on the visitor's time zone and locale, which the server
// doesn't know. useSyncExternalStore renders nothing on the server and the
// formatted date in the browser, without a hydration mismatch.
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
