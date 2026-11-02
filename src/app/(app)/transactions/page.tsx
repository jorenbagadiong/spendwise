import type { Metadata } from "next";
import { ArrowLeftRightIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return (
    <PagePlaceholder
      icon={ArrowLeftRightIcon}
      title="Transactions are coming soon"
      description="A spreadsheet-style table for recording income and expenses will appear here."
    />
  );
}
