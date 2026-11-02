import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { TransactionsView } from "@/components/transactions/transactions-view";
import { mockAccounts, mockCategories } from "@/data/mock-finance";
import { getTodayInManila } from "@/lib/finance/months";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return (
    <Suspense>
      <Transactions />
    </Suspense>
  );
}

async function Transactions() {
  // The default month filter is the current month, so "today" is read per
  // request (same approach as the dashboard).
  await connection();
  const today = getTodayInManila();

  return (
    <TransactionsView
      accounts={mockAccounts}
      categories={mockCategories}
      today={today}
    />
  );
}
