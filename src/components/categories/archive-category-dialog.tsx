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
import { useCategoryStore } from "@/stores/category-store-provider";
import type { Category } from "@/types/finance";

type ArchiveCategoryDialogProps = {
  open: boolean;
  /** Kept while closing so the content doesn't vanish during the exit animation. */
  category: Category | null;
  usageCount: number;
  onOpenChange: (open: boolean) => void;
  onArchived: (category: Category | null, name: string) => void;
};

export function ArchiveCategoryDialog({
  open,
  category,
  usageCount,
  onOpenChange,
  onArchived,
}: ArchiveCategoryDialogProps) {
  const archiveCategory = useCategoryStore((state) => state.archiveCategory);

  return (
    <AlertDialog open={open && category !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {category && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {category.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                It won&apos;t be available for new transactions.{" "}
                {usageCount === 0
                  ? "No transactions use it yet."
                  : `The ${usageCount === 1 ? "1 transaction" : `${usageCount} transactions`} that use it keep it, and totals don't change.`}{" "}
                You can restore it at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const result = archiveCategory(category.id);
                  onArchived(result.ok ? result.category : null, category.name);
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
