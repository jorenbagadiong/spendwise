import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { TransactionsView } from "@/components/transactions/transactions-view";
import { getTodayInManila } from "@/lib/finance/months";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <Suspense>
      <Transactions searchParams={searchParams} />
    </Suspense>
  );
}

async function Transactions({
  searchParams,
}: {
  searchParams: PageProps<"/transactions">["searchParams"];
}) {
  // The default month filter is the current month, so "today" is read per
  // request (same approach as the dashboard).
  await connection();
  const today = getTodayInManila();
  // "View transactions" on the Accounts page links here with ?account=<id>.
  const { account } = await searchParams;
  const initialAccountId = typeof account === "string" ? account : undefined;

  return (
    // Next.js keeps visited pages mounted (hidden) and restores their state.
    // The key gives each ?account= value its own fresh filter state.
    <TransactionsView
      key={initialAccountId ?? "all"}
      today={today}
      initialAccountId={initialAccountId}
    />
  );
}
