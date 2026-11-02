"use client";

import { useState } from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CircleCheckIcon,
  PencilIcon,
  PlusIcon,
  TagsIcon,
  XIcon,
} from "lucide-react";

import { ArchiveCategoryDialog } from "@/components/categories/archive-category-dialog";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { CategoryIconBadge } from "@/components/categories/category-icon-badge";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Button } from "@/components/ui/button";
import { categoryTypeLabels, countCategoryUsage } from "@/lib/finance/categories";
import { cn } from "@/lib/utils";
import { useCategoryStore } from "@/stores/category-store-provider";
import { useTransactionStore } from "@/stores/transaction-store-provider";
import type { Category, CategoryType } from "@/types/finance";

type TypeFilter = "all" | CategoryType;

const filterOptions: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export function CategoriesView() {
  const categories = useCategoryStore((state) => state.categories);
  const restoreCategory = useCategoryStore((state) => state.restoreCategory);
  const transactions = useTransactionStore((state) => state.transactions);

  const [filter, setFilter] = useState<TypeFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState<Category | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Usage counts are derived from the current transactions, never stored.
  const usageOf = (category: Category) => countCategoryUsage(category.id, transactions);
  const counts = {
    all: categories.length,
    income: categories.filter((c) => c.type === "income").length,
    expense: categories.filter((c) => c.type === "expense").length,
  };
  const archivedOf = (type: TypeFilter) =>
    categories.filter((c) => !c.isActive && (type === "all" || c.type === type)).length;
  const visible = filter === "all" ? categories : categories.filter((c) => c.type === filter);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleRestore(category: Category) {
    const result = restoreCategory(category.id);
    setNotice(
      result.ok
        ? `Restored “${category.name}”. It can be used for new transactions again.`
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
        <Button onClick={openAdd}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Add category
        </Button>
      </div>

      <section aria-labelledby="categories-summary" className="grid gap-4 sm:grid-cols-3">
        <h2 id="categories-summary" className="sr-only">
          Summary
        </h2>
        <SummaryCard
          title="Total Categories"
          value={String(counts.all)}
          description={`${archivedOf("all")} archived`}
          icon={TagsIcon}
          tone="neutral"
        />
        <SummaryCard
          title="Income Categories"
          value={String(counts.income)}
          description={`${archivedOf("income")} archived`}
          icon={ArrowUpRightIcon}
          tone="income"
        />
        <SummaryCard
          title="Expense Categories"
          value={String(counts.expense)}
          description={`${archivedOf("expense")} archived`}
          icon={ArrowDownRightIcon}
          tone="expense"
        />
      </section>

      <section aria-labelledby="categories-list" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="categories-list" className="font-heading text-lg font-semibold tracking-tight">
            Categories
          </h2>
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Show categories</legend>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
              {filterOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "relative flex cursor-pointer items-center justify-center gap-1 rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors",
                    "has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm",
                    "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  )}
                >
                  <input
                    type="radio"
                    name="category-type-filter"
                    value={option.value}
                    checked={filter === option.value}
                    onChange={() => setFilter(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                  <span className="text-xs tabular-nums opacity-70">{counts[option.value]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <TagsIcon className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">
              {filter === "all"
                ? "No categories yet"
                : `No ${categoryTypeLabels[filter].toLowerCase()} categories yet`}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Categories group income and expenses so you can see where money comes from and goes.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={openAdd}>
              Add category
            </Button>
          </div>
        ) : (
          // Store order is kept (no re-sorting on archive), so the focused
          // Archive/Restore button stays in place after toggling.
          <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10">
            {visible.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                usage={usageOf(category)}
                onEdit={() => {
                  setEditing(category);
                  setFormOpen(true);
                }}
                onArchive={() => {
                  setArchiving(category);
                  setArchiveOpen(true);
                }}
                onRestore={() => handleRestore(category)}
              />
            ))}
          </ul>
        )}
      </section>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        defaultType={filter === "income" ? "income" : "expense"}
        onSaved={(category, action) =>
          setNotice(
            action === "added"
              ? `Added “${category.name}”. It's available in the transaction form.`
              : `Saved “${category.name}”.`,
          )
        }
      />
      <ArchiveCategoryDialog
        open={archiveOpen}
        category={archiving}
        usageCount={archiving ? usageOf(archiving) : 0}
        onOpenChange={setArchiveOpen}
        onArchived={(category, name) =>
          setNotice(
            category
              ? `Archived “${name}”. Its transactions keep it.`
              : `“${name}” no longer exists.`,
          )
        }
      />
    </div>
  );
}

function CategoryRow({
  category,
  usage,
  onEdit,
  onArchive,
  onRestore,
}: {
  category: Category;
  usage: number;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const headingId = `category-${category.id}`;

  return (
    <li
      aria-labelledby={headingId}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3",
        !category.isActive && "bg-muted/40",
      )}
    >
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
        <CategoryIconBadge icon={category.icon} color={category.color} muted={!category.isActive} />
        <div className="min-w-0">
          <h3 id={headingId} className="font-medium [overflow-wrap:anywhere]">
            {category.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            <span
              className={cn(
                "font-medium",
                category.type === "income" ? "text-income" : "text-expense",
              )}
            >
              {categoryTypeLabels[category.type]}
            </span>
            {" · "}
            {usage === 1 ? "1 transaction" : `${usage} transactions`}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 text-xs font-medium",
          category.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {category.isActive ? "Active" : "Archived"}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${category.name}`}>
          <PencilIcon data-icon="inline-start" aria-hidden="true" />
          Edit
        </Button>
        {category.isActive ? (
          <Button variant="ghost" size="sm" onClick={onArchive} aria-label={`Archive ${category.name}`}>
            <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
            Archive
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onRestore} aria-label={`Restore ${category.name}`}>
            <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
            Restore
          </Button>
        )}
      </div>
    </li>
  );
}
