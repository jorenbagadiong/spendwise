import type { Metadata } from "next";
import { WalletCardsIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Accounts",
};

export default function AccountsPage() {
  return (
    <PagePlaceholder
      icon={WalletCardsIcon}
      title="Accounts are coming soon"
      description="Your cash, bank, and e-wallet accounts and their balances will appear here."
    />
  );
}
