"use client";

import { useId, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { CategoryIconBadge } from "@/components/categories/category-icon-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  categoryColorClasses,
  categoryColorLabels,
  categoryIconComponents,
  categoryIconLabels,
} from "@/config/category-appearance";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryTypeLabels,
  createCategoryFormSchema,
  getEmptyCategoryFormValues,
  isCategoryColor,
  isCategoryIcon,
  type CategoryFormValues,
} from "@/lib/finance/categories";
import { cn } from "@/lib/utils";
import { useCategoryStore } from "@/stores/category-store-provider";
import type { Category, CategoryInput, CategoryType } from "@/types/finance";

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The category to edit, or null to add one. */
  category: Category | null;
  /** Preselected type for new categories (e.g. from the page filter). */
  defaultType: CategoryType;
  onSaved: (category: Category, action: "added" | "updated") => void;
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  defaultType,
  onSaved,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Rename the category or change its icon and color. Its transactions keep it."
              : "Group transactions by what the money was for or where it came from."}
          </DialogDescription>
        </DialogHeader>
        {/* The popup unmounts when closed, so each open starts a fresh form. */}
        <CategoryForm
          category={category}
          defaultType={defaultType}
          onSaved={onSaved}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  category,
  defaultType,
  onSaved,
  onDone,
}: Omit<CategoryFormDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const categories = useCategoryStore((state) => state.categories);
  const addCategory = useCategoryStore((state) => state.addCategory);
  const updateCategory = useCategoryStore((state) => state.updateCategory);
  const nameId = useId();

  const schema = useMemo(() => createCategoryFormSchema(categories, category), [categories, category]);
  const { register, handleSubmit, formState, setError, control } = useForm<
    CategoryFormValues,
    unknown,
    CategoryInput
  >({
    resolver: zodResolver(schema),
    defaultValues: category
      ? { name: category.name, type: category.type, icon: category.icon, color: category.color }
      : getEmptyCategoryFormValues(defaultType),
  });
  const [name, icon, color] = useWatch({ control, name: ["name", "icon", "color"] });

  function onSubmit(input: CategoryInput) {
    const result = category
      ? updateCategory(category.id, { name: input.name, icon: input.icon, color: input.color })
      : addCategory(input);
    if (!result.ok) {
      setError(result.error.includes("no longer exists") ? "root" : "name", { message: result.error });
      return;
    }
    onSaved(result.category, category ? "updated" : "added");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FieldGroup>
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
          <CategoryIconBadge
            icon={isCategoryIcon(icon) ? icon : "circle-ellipsis"}
            color={isCategoryColor(color) ? color : "slate"}
          />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Preview</p>
            <p className="truncate font-medium">{name.trim() || "Category name"}</p>
          </div>
        </div>

        <Field data-invalid={!!formState.errors.name}>
          <FieldLabel htmlFor={nameId}>Name</FieldLabel>
          <Input
            id={nameId}
            autoComplete="off"
            placeholder="e.g. Pets"
            aria-invalid={!!formState.errors.name}
            aria-describedby={`${nameId}-error`}
            {...register("name")}
          />
          <FieldError id={`${nameId}-error`} errors={[formState.errors.name]} />
        </Field>

        {category ? (
          <div className="text-sm">
            <p className="font-medium">Type</p>
            <p className="text-muted-foreground">
              {categoryTypeLabels[category.type]}. The type can&apos;t be changed, so
              existing transactions stay valid.
            </p>
          </div>
        ) : (
          <FieldSet>
            <FieldLegend variant="label">Type</FieldLegend>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["expense", "income"] as const).map((value) => (
                <label
                  key={value}
                  className={cn(
                    "relative flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                    "has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm",
                    "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  )}
                >
                  <input type="radio" value={value} className="sr-only" {...register("type")} />
                  {categoryTypeLabels[value]}
                </label>
              ))}
            </div>
          </FieldSet>
        )}

        <FieldSet data-invalid={!!formState.errors.icon}>
          <FieldLegend variant="label">Icon</FieldLegend>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
            {CATEGORY_ICONS.map((value) => {
              const Icon = categoryIconComponents[value];
              return (
                <label
                  key={value}
                  title={categoryIconLabels[value]}
                  className={cn(
                    "relative flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted",
                    "has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary",
                    "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  )}
                >
                  <input type="radio" value={value} className="sr-only" {...register("icon")} />
                  <Icon className="size-4.5" aria-hidden="true" />
                  <span className="sr-only">{categoryIconLabels[value]}</span>
                </label>
              );
            })}
          </div>
          <FieldError errors={[formState.errors.icon]} />
        </FieldSet>

        <FieldSet data-invalid={!!formState.errors.color}>
          <FieldLegend variant="label">Color</FieldLegend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((value) => (
              <label
                key={value}
                title={categoryColorLabels[value]}
                className={cn(
                  "relative flex size-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-popover transition",
                  "has-checked:ring-2 has-checked:ring-foreground",
                  "has-focus-visible:ring-2 has-focus-visible:ring-ring",
                )}
              >
                <input type="radio" value={value} className="sr-only" {...register("color")} />
                <span className={cn("size-6 rounded-full", categoryColorClasses[value].swatch)} aria-hidden="true" />
                <span className="sr-only">{categoryColorLabels[value]}</span>
              </label>
            ))}
          </div>
          <FieldError errors={[formState.errors.color]} />
        </FieldSet>
      </FieldGroup>

      {formState.errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {formState.errors.root.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">{category ? "Save changes" : "Add category"}</Button>
      </DialogFooter>
    </form>
  );
}
