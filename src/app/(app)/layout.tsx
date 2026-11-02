import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { mockAccounts, mockTransactions } from "@/data/mock-finance";
import { AccountStoreProvider } from "@/stores/account-store-provider";
import { TransactionStoreProvider } from "@/stores/transaction-store-provider";

// Shared shell for every page in the (app) route group. The parentheses keep
// "(app)" out of the URL, so /dashboard maps to (app)/dashboard/page.tsx.
// The account and transaction stores live here so all pages share them
// across client-side navigation.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AccountStoreProvider initialAccounts={mockAccounts}>
      <TransactionStoreProvider initialTransactions={mockTransactions}>
        <div className="flex min-h-dvh">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        </div>
      </TransactionStoreProvider>
    </AccountStoreProvider>
  );
}
