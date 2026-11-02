"use client";

import { useRef } from "react";

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
  /**
   * Where focus goes after a delete, since the deleted row's button is gone.
   * Cancel (or Escape) returns focus to the button that opened the dialog.
   */
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
  // Set when Delete is pressed, so closing knows whether the row still exists.
  const deletedRef = useRef(false);

  return (
    <AlertDialog open={open && transaction !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent
        finalFocus={() => {
          const deleted = deletedRef.current;
          deletedRef.current = false;
          // `true` keeps Base UI's default: back to the element focused before opening.
          return deleted ? (finalFocus?.current ?? true) : true;
        }}
      >
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
                  deletedRef.current = true;
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
