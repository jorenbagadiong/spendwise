import { createStore } from "zustand/vanilla";

import { validateCategoryInput, validateCategoryUpdate } from "@/lib/finance/categories";
import { nextSequentialId } from "@/lib/ids";
import type { Category, CategoryInput, CategoryUpdate } from "@/types/finance";

export type CategoryResult =
  | { ok: true; category: Category }
  | { ok: false; error: string };

export type CategoryStore = {
  /** The single in-memory source of truth for categories. Usage counts are derived, not stored. */
  categories: readonly Category[];
  /** Creates an active category with a new id. Rejects invalid or duplicate names, icons, colors. */
  addCategory: (input: CategoryInput) => CategoryResult;
  /** Changes name, icon, and color only; the type can't change. */
  updateCategory: (id: string, update: CategoryUpdate) => CategoryResult;
  /** Hides a category from new transactions; existing transactions keep it. */
  archiveCategory: (id: string) => CategoryResult;
  /** Makes an archived category selectable again. */
  restoreCategory: (id: string) => CategoryResult;
};

/** Next category id: "cat-001", "cat-002", … (never reuses a taken id). */
export function generateCategoryId(existing: readonly Category[]): string {
  return nextSequentialId("cat", existing.map((c) => c.id));
}

const notFound = { ok: false, error: "This category no longer exists." } as const;

/**
 * Creates a category store (one per browser session in the app, one per
 * test in tests). Categories are never deleted, only archived, so every
 * transaction can always resolve its category.
 */
export function createCategoryStore(initialCategories: readonly Category[]) {
  return createStore<CategoryStore>()((set, get) => {
    function replace(id: string, change: (category: Category) => Category): CategoryResult {
      const existing = get().categories.find((c) => c.id === id);
      if (!existing) return notFound;
      const category = change(existing);
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? category : c)),
      }));
      return { ok: true, category };
    }

    return {
      categories: [...initialCategories],

      addCategory: (input) => {
        const categories = get().categories;
        const error = validateCategoryInput(input, categories);
        if (error) return { ok: false, error };
        const category: Category = {
          id: generateCategoryId(categories),
          name: input.name.trim(),
          type: input.type,
          icon: input.icon,
          color: input.color,
          isActive: true,
        };
        set((state) => ({ categories: [...state.categories, category] }));
        return { ok: true, category };
      },

      updateCategory: (id, update) => {
        const existing = get().categories.find((c) => c.id === id);
        if (!existing) return notFound;
        const error = validateCategoryUpdate(existing, update, get().categories);
        if (error) return { ok: false, error };
        // Only the editable fields are copied; type and id never change.
        return replace(id, (c) => ({
          ...c,
          name: update.name.trim(),
          icon: update.icon,
          color: update.color,
        }));
      },

      archiveCategory: (id) => replace(id, (c) => (c.isActive ? { ...c, isActive: false } : c)),

      restoreCategory: (id) => replace(id, (c) => (c.isActive ? c : { ...c, isActive: true })),
    };
  });
}

export type CategoryStoreApi = ReturnType<typeof createCategoryStore>;
