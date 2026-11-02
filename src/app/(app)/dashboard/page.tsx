import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { FinancialDashboard } from "@/components/dashboard/financial-dashboard";
import { getTodayInManila } from "@/lib/finance/months";
import { getTimeOfDayInManila } from "@/lib/profile/profile";

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
  const now = new Date();

  // The greeting's time of day is decided here too, so the server HTML and
  // the first browser render agree.
  return <FinancialDashboard today={getTodayInManila(now)} timeOfDay={getTimeOfDayInManila(now)} />;
}
