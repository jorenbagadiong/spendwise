import type { Metadata } from "next";
import { LayoutDashboardIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <PagePlaceholder
      icon={LayoutDashboardIcon}
      title="Dashboard is coming soon"
      description="Summary cards for your income, expenses, and remaining money will appear here."
    />
  );
}
