import { z } from "zod";

import type {
  Category,
  CategoryColor,
  CategoryIcon,
  CategoryInput,
  CategoryType,
  CategoryUpdate,
  Transaction,
} from "@/types/finance";

export const CATEGORY_NAME_MAX_LENGTH = 50;

/** Every supported icon, in picker order. */
export const CATEGORY_ICONS = [
  "briefcase",
  "coins",
  "piggy-bank",
  "trending-up",
  "gift",
  "utensils",
  "coffee",
  "shopping-basket",
  "receipt",
  "zap",
  "wifi",
  "smartphone",
  "home",
  "bus",
  "car",
  "fuel",
  "plane",
  "shopping-bag",
  "shirt",
  "clapperboard",
  "heart-pulse",
  "graduation-cap",
  "baby",
  "paw-print",
  "circle-ellipsis",
] as const satisfies readonly CategoryIcon[];

/** Every supported color, in picker order. */
export const CATEGORY_COLORS = [
  "emerald",
  "teal",
  "sky",
  "blue",
  "violet",
  "pink",
  "rose",
  "orange",
  "amber",
  "lime",
  "slate",
] as const satisfies readonly CategoryColor[];

// Compile-time check that the lists above cover every union member.
type Missing<Union, List extends readonly unknown[]> = Exclude<Union, List[number]>;
const allIconsListed: Missing<CategoryIcon, typeof CATEGORY_ICONS> extends never ? true : never = true;
const allColorsListed: Missing<CategoryColor, typeof CATEGORY_COLORS> extends never ? true : never = true;
void allIconsListed;
void allColorsListed;

export const categoryTypeLabels: Record<CategoryType, string> = {
  income: "Income",
  expense: "Expense",
};

export function isCategoryIcon(value: string): value is CategoryIcon {
  return (CATEGORY_ICONS as readonly string[]).includes(value);
}

export function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

/**
 * Returns an error message for an invalid category name, or null. Names
 * must be unique within their type (compared trimmed and case-insensitively,
 * archived categories included). "Other" can exist once as income and once
 * as expense.
 */
export function validateCategoryName(
  name: string,
  type: CategoryType,
  categories: readonly Category[],
  excludeId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a category name.";
  if (trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
    return `Use ${CATEGORY_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const lower = trimmed.toLowerCase();
  const duplicate = categories.find(
    (c) => c.id !== excludeId && c.type === type && c.name.trim().toLowerCase() === lower,
  );
  if (duplicate) {
    const kind = categoryTypeLabels[type].toLowerCase();
    return duplicate.isActive
      ? `An ${kind} category named “${duplicate.name}” already exists.`
      : `An archived ${kind} category named “${duplicate.name}” already exists. Restore it instead.`;
  }
  return null;
}

/** Full check for a new category; the store uses it as its safety net. */
export function validateCategoryInput(
  input: CategoryInput,
  categories: readonly Category[],
): string | null {
  if (!Object.hasOwn(categoryTypeLabels, input.type)) return "Choose income or expense.";
  return (
    validateCategoryName(input.name, input.type, categories) ??
    (isCategoryIcon(input.icon) ? null : "Choose an icon from the list.") ??
    (isCategoryColor(input.color) ? null : "Choose a color from the palette.")
  );
}

/** Check for an edit. The type comes from the existing category and can't change. */
export function validateCategoryUpdate(
  existing: Category,
  update: CategoryUpdate,
  categories: readonly Category[],
): string | null {
  return (
    validateCategoryName(update.name, existing.type, categories, existing.id) ??
    (isCategoryIcon(update.icon) ? null : "Choose an icon from the list.") ??
    (isCategoryColor(update.color) ? null : "Choose a color from the palette.")
  );
}

/** What the category form edits. */
export type CategoryFormValues = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

export function getEmptyCategoryFormValues(type: CategoryType = "expense"): CategoryFormValues {
  return { name: "", type, icon: "circle-ellipsis", color: "slate" };
}

const baseShape = {
  name: z.string(),
  type: z.enum(["income", "expense"]),
  icon: z.string(),
  color: z.string(),
};

/**
 * Zod schema for the category form. Pass `existing` when editing: the type
 * is then taken from it and any submitted type is ignored.
 */
export function createCategoryFormSchema(
  categories: readonly Category[],
  existing?: Category | null,
) {
  return z.object(baseShape).transform((values, ctx): CategoryInput => {
    const type = existing?.type ?? values.type;
    const nameError = validateCategoryName(values.name, type, categories, existing?.id);
    if (nameError) ctx.addIssue({ code: "custom", path: ["name"], message: nameError });
    if (!isCategoryIcon(values.icon)) {
      ctx.addIssue({ code: "custom", path: ["icon"], message: "Choose an icon from the list." });
    }
    if (!isCategoryColor(values.color)) {
      ctx.addIssue({ code: "custom", path: ["color"], message: "Choose a color from the palette." });
    }
    return {
      name: values.name.trim(),
      type,
      icon: values.icon as CategoryIcon,
      color: values.color as CategoryColor,
    };
  });
}

/**
 * Categories a transaction form may offer for a type: active categories of
 * that type, plus the archived category the edited transaction already
 * uses (if it's of that type), so existing records stay editable.
 */
export function getSelectableCategories(
  categories: readonly Category[],
  type: CategoryType,
  original?: Transaction | null,
): Category[] {
  return categories.filter(
    (c) => c.type === type && (c.isActive || c.id === original?.categoryId),
  );
}

/** Display name with an "(archived)" suffix for archived categories. */
export function getCategoryLabel(category: Category): string {
  return category.isActive ? category.name : `${category.name} (archived)`;
}

/**
 * How many transactions use a category. Only income and expenses have
 * categories, so transfers are never counted. Derived on demand, never stored.
 */
export function countCategoryUsage(
  categoryId: string,
  transactions: readonly Transaction[],
): number {
  return transactions.filter((t) => t.type !== "transfer" && t.categoryId === categoryId).length;
}
