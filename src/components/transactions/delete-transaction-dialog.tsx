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
import { formatDateLabel } from "@/lib/finance/months";
import { formatTransactionAmount } from "@/lib/finance/transactions";
import { useTransactionStore } from "@/stores/transaction-store-provider";
import type { Transaction } from "@/types/finance";

type DeleteTransactionDialogProps = {
  open: boolean;
  /** Kept while closing so the content doesn't vanish during the exit animation. */
  transaction: Transaction | null;
  onOpenChange: (open: boolean) => void;
  /** Receives the removed record, or null if it was already gone. */
  onDeleted: (transaction: Transaction | null, description: string) => void;
  /** Where focus goes after closing, since the deleted row's button is gone. */
  finalFocus?: React.RefObject<HTMLElement | null>;
};

export function DeleteTransactionDialog({
  open,
  transaction,
  onOpenChange,
  onDeleted,
  finalFocus,
}: DeleteTransactionDialogProps) {
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction);

  return (
    <AlertDialog open={open && transaction !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent finalFocus={finalFocus}>
        {transaction && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium text-foreground">{transaction.description}</span>
                {" · "}
                <span className="tabular-nums">{formatTransactionAmount(transaction)}</span>
                {" · "}
                {formatDateLabel(transaction.date)}
                <br />
                It will be removed and every total recalculated. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onDeleted(deleteTransaction(transaction.id), transaction.description);
                  onOpenChange(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
