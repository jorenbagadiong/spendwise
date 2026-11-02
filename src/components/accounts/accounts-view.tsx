"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  BanknoteIcon,
  CircleCheckIcon,
  LandmarkIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  SmartphoneIcon,
  WalletCardsIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { ArchiveAccountDialog } from "@/components/accounts/archive-account-dialog";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { accountTypeLabels, countAccountTransactions } from "@/lib/finance/accounts";
import { calculateAccountBalance, calculateTotalAccountBalance } from "@/lib/finance/calculations";
import { formatCurrency } from "@/lib/finance/money";
import { formatDateLabel } from "@/lib/finance/months";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/stores/account-store-provider";
import { useTransactionStore } from "@/stores/transaction-store-provider";
import type { Account, AccountType, IsoDate } from "@/types/finance";

const typeIcons: Record<AccountType, LucideIcon> = {
  bank: LandmarkIcon,
  e_wallet: SmartphoneIcon,
  cash: BanknoteIcon,
};

export function AccountsView({ today }: { today: IsoDate }) {
  const accounts = useAccountStore((state) => state.accounts);
  const restoreAccount = useAccountStore((state) => state.restoreAccount);
  const transactions = useTransactionStore((state) => state.transactions);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState<Account | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Balances are always derived from transactions, never stored.
  const balanceOf = (account: Account) => calculateAccountBalance(account, transactions, today);
  const consolidated = calculateTotalAccountBalance(accounts, transactions, today);
  const activeCount = accounts.filter((a) => a.isActive).length;
  const archivedCount = accounts.length - activeCount;

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleRestore(account: Account) {
    const result = restoreAccount(account.id);
    setNotice(
      result.ok
        ? `Restored “${account.name}”. It can be used for new transactions again.`
        : result.error,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Announces saves, archives, and restores. */}
        <div role="status" className="min-w-0 flex-1">
          {notice && (
            <p className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1">{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="-m-1 rounded p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Dismiss message"
              >
                <XIcon className="size-3.5" aria-hidden="true" />
              </button>
            </p>
          )}
        </div>
        <Button ref={addButtonRef} onClick={openAdd}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Add account
        </Button>
      </div>

      <section aria-labelledby="accounts-summary" className="grid gap-4 sm:grid-cols-3">
        <h2 id="accounts-summary" className="sr-only">
          Summary
        </h2>
        <SummaryCard
          title="Consolidated Balance"
          value={formatCurrency(consolidated)}
          description={`All accounts, including archived, as of today, ${formatDateLabel(today)}`}
          icon={LandmarkIcon}
          tone="neutral"
        />
        <SummaryCard
          title="Active Accounts"
          value={String(activeCount)}
          description="Available for new transactions"
          icon={WalletCardsIcon}
          tone="neutral"
        />
        <SummaryCard
          title="Archived Accounts"
          value={String(archivedCount)}
          description="Kept for history and totals"
          icon={ArchiveIcon}
          tone="neutral"
        />
      </section>

      <section aria-labelledby="accounts-list" className="flex flex-col gap-3">
        <h2 id="accounts-list" className="font-heading text-lg font-semibold tracking-tight">
          Accounts
        </h2>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <WalletCardsIcon className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">No accounts yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Add the bank accounts, e-wallets, and cash you want to track.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={openAdd}>
              Add account
            </Button>
          </div>
        ) : (
          // Store order is kept (no re-sorting on archive), so the focused
          // Archive/Restore button stays in place after toggling.
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                balance={balanceOf(account)}
                transactionCount={countAccountTransactions(account.id, transactions)}
                onEdit={() => {
                  setEditing(account);
                  setFormOpen(true);
                }}
                onArchive={() => {
                  setArchiving(account);
                  setArchiveOpen(true);
                }}
                onRestore={() => handleRestore(account)}
              />
            ))}
          </ul>
        )}
      </section>

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        today={today}
        onSaved={(account, action) =>
          setNotice(`${action === "added" ? "Added" : "Saved"} “${account.name}”.`)
        }
      />
      <ArchiveAccountDialog
        open={archiveOpen}
        account={archiving}
        balanceLabel={archiving ? formatCurrency(balanceOf(archiving)) : ""}
        transactionCount={archiving ? countAccountTransactions(archiving.id, transactions) : 0}
        onOpenChange={setArchiveOpen}
        onArchived={(account, name) =>
          setNotice(account ? `Archived “${name}”. Its history and balance are kept.` : `“${name}” no longer exists.`)
        }
      />
    </div>
  );
}

function AccountCard({
  account,
  balance,
  transactionCount,
  onEdit,
  onArchive,
  onRestore,
}: {
  account: Account;
  balance: number;
  transactionCount: number;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const Icon = typeIcons[account.type];
  const headingId = `account-${account.id}`;

  return (
    <li
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10",
        !account.isActive && "bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            account.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="font-medium [overflow-wrap:anywhere]">
            {account.name}
          </h3>
          <p className="text-sm text-muted-foreground">{accountTypeLabels[account.type]}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium",
            account.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {account.isActive ? "Active" : "Archived"}
        </span>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">Current balance</p>
        <p
          className={cn(
            "font-heading text-2xl font-semibold tracking-tight tabular-nums",
            balance < 0 && "text-expense",
          )}
        >
          {formatCurrency(balance)}
        </p>
        <p className="text-xs text-muted-foreground">
          Opened {formatDateLabel(account.openingDate)} with {formatCurrency(account.openingBalance)}
          {" · "}
          {transactionCount === 1 ? "1 transaction" : `${transactionCount} transactions`}
        </p>
      </div>

      <div className="-ml-2 flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${account.name}`}>
          <PencilIcon data-icon="inline-start" aria-hidden="true" />
          Edit
        </Button>
        {account.isActive ? (
          <Button variant="ghost" size="sm" onClick={onArchive} aria-label={`Archive ${account.name}`}>
            <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
            Archive
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onRestore} aria-label={`Restore ${account.name}`}>
            <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
            Restore
          </Button>
        )}
        {/* A real link (not a button), since it navigates to another page. */}
        <Link
          href={`/transactions?account=${encodeURIComponent(account.id)}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          aria-label={`View transactions for ${account.name}`}
        >
          <ListIcon data-icon="inline-start" aria-hidden="true" />
          Transactions
        </Link>
      </div>
    </li>
  );
}
