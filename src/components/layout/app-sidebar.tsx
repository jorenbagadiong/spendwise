import Link from "next/link";
import { WalletIcon } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";

export function AppBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <WalletIcon className="size-4" aria-hidden="true" />
      </span>
      <span className="font-heading text-base font-semibold tracking-tight">
        Spend Wise Tracker
      </span>
    </Link>
  );
}

// Desktop sidebar. Hidden below the `lg` breakpoint, where MobileNavigation
// shows the same navigation inside a drawer.
export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
      <div className="px-2">
        <AppBrand />
      </div>
      <SidebarNav />
    </aside>
  );
}
