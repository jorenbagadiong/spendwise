import type { Metadata } from "next";
import { ChartColumnIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return (
    <PagePlaceholder
      icon={ChartColumnIcon}
      title="Reports are coming soon"
      description="Charts and breakdowns of your spending over time will appear here."
    />
  );
}
