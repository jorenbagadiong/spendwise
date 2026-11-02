"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAccountStore } from "@/stores/account-store-provider";
import type { Account } from "@/types/finance";

type ArchiveAccountDialogProps = {
  open: boolean;
  /** Kept while closing so the content doesn't vanish during the exit animation. */
  account: Account | null;
  /** Formatted current balance, shown so the person knows it stays counted. */
  balanceLabel: string;
  transactionCount: number;
  onOpenChange: (open: boolean) => void;
  onArchived: (account: Account | null, name: string) => void;
};

export function ArchiveAccountDialog({
  open,
  account,
  balanceLabel,
  transactionCount,
  onOpenChange,
  onArchived,
}: ArchiveAccountDialogProps) {
  const archiveAccount = useAccountStore((state) => state.archiveAccount);

  return (
    <AlertDialog open={open && account !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {account && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {account.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                It won&apos;t be available for new transactions. Its{" "}
                {transactionCount === 1 ? "1 transaction" : `${transactionCount} transactions`} and its
                balance of <span className="font-medium text-foreground tabular-nums">{balanceLabel}</span>{" "}
                stay in your history and totals. You can restore it at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const result = archiveAccount(account.id);
                  onArchived(result.ok ? result.account : null, account.name);
                  onOpenChange(false);
                }}
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
