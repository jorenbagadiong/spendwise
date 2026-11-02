"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, navigationItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  /** Called after a link is clicked, e.g. to close the mobile drawer. */
  onNavigate?: () => void;
};

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-1">
        {navigationItems.map(({ title, href, icon: Icon }) => {
          const isActive = isActivePath(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
