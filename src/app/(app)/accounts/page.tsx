import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { AccountsView } from "@/components/accounts/accounts-view";
import { getTodayInManila } from "@/lib/finance/months";

export const metadata: Metadata = {
  title: "Accounts",
};

export default function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  return (
    <Suspense>
      <Accounts searchParams={searchParams} />
    </Suspense>
  );
}

async function Accounts({ searchParams }: { searchParams: PageProps<"/accounts">["searchParams"] }) {
  // Balances are shown "as of today" in Asia/Manila, read per request.
  await connection();
  // The dashboard's "Add your first account" links here with ?new=1.
  const { new: openAdd } = await searchParams;
  const startAdding = openAdd === "1";
  return <AccountsView key={startAdding ? "new" : "default"} today={getTodayInManila()} startAdding={startAdding} />;
}
