import {
  ArrowLeftRightIcon,
  ChartColumnIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  SettingsIcon,
  TagsIcon,
  WalletCardsIcon,
} from "lucide-react";

export type NavigationItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

// Single source of truth for the app's sections. The sidebar, mobile drawer,
// and header all read from this list.
export const navigationItems = [
  {
    title: "Dashboard",
    description: "An overview of your income, spending, and balances.",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Transactions",
    description: "Record and review your income and expenses.",
    href: "/transactions",
    icon: ArrowLeftRightIcon,
  },
  {
    title: "Accounts",
    description: "Manage your cash, bank, and e-wallet accounts.",
    href: "/accounts",
    icon: WalletCardsIcon,
  },
  {
    title: "Categories",
    description: "Organize transactions into income and expense categories.",
    href: "/categories",
    icon: TagsIcon,
  },
  {
    title: "Reports",
    description: "See where your money goes over time.",
    href: "/reports",
    icon: ChartColumnIcon,
  },
  {
    title: "Settings",
    description: "Adjust your preferences for Spend Wise Tracker.",
    href: "/settings",
    icon: SettingsIcon,
  },
] as const satisfies readonly NavigationItem[];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavigationItem(pathname: string): NavigationItem | undefined {
  return navigationItems.find((item) => isActivePath(pathname, item.href));
}
