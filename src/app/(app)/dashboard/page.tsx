import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { FinancialDashboard } from "@/components/dashboard/financial-dashboard";
import { mockAccounts } from "@/data/mock-finance";
import { getTodayInManila } from "@/lib/finance/months";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  // "Today" must be read per request, not frozen into the build. connection()
  // tells Next.js to render this part at request time; the rest of the page
  // shell is still prerendered.
  await connection();
  const today = getTodayInManila();

  return (
    <FinancialDashboard accounts={mockAccounts} today={today} />
  );
}
