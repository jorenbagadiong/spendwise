import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { DataGate } from "@/components/persistence/data-gate";
import { FinanceDataProvider } from "@/stores/finance-data-provider";

// Shared shell for every page in the (app) route group. The parentheses keep
// "(app)" out of the URL, so /dashboard maps to (app)/dashboard/page.tsx.
// FinanceDataProvider holds the account, category, and transaction stores
// and saves them to localStorage; it lives here so every page shares them
// across client-side navigation. DataGate shows page content only once the
// saved data has been read. OnboardingGate replaces the whole shell with the
// first-run onboarding when it's needed (SW-010).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <FinanceDataProvider>
      <OnboardingGate>
        <div className="flex min-h-dvh">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <DataGate>{children}</DataGate>
            </main>
          </div>
        </div>
      </OnboardingGate>
    </FinanceDataProvider>
  );
}
