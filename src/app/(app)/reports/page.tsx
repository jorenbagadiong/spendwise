import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { FinancialReports } from "@/components/reports/financial-reports";
import { getTodayInManila } from "@/lib/finance/months";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}

async function Reports() {
  // Same as the dashboard: "today" (Asia/Manila) is read per request so the
  // default reporting month is never frozen into the build.
  await connection();
  const today = getTodayInManila();

  return <FinancialReports today={today} />;
}
