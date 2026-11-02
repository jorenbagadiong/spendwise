import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { AccountsView } from "@/components/accounts/accounts-view";
import { getTodayInManila } from "@/lib/finance/months";

export const metadata: Metadata = {
  title: "Accounts",
};

export default function AccountsPage() {
  return (
    <Suspense>
      <Accounts />
    </Suspense>
  );
}

async function Accounts() {
  // Balances are shown "as of today" in Asia/Manila, read per request.
  await connection();
  return <AccountsView today={getTodayInManila()} />;
}
