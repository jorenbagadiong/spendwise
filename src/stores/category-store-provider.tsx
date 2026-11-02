"use client";

import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";

import {
  createCategoryStore,
  type CategoryStore,
  type CategoryStoreApi,
} from "@/stores/category-store";
import type { Category } from "@/types/finance";

const CategoryStoreContext = createContext<CategoryStoreApi | null>(null);

/** One category store per browser session, seeded once. Lives in the (app) layout. */
export function CategoryStoreProvider({
  initialCategories,
  children,
}: {
  initialCategories: readonly Category[];
  children: React.ReactNode;
}) {
  const [store] = useState(() => createCategoryStore(initialCategories));
  return (
    <CategoryStoreContext.Provider value={store}>{children}</CategoryStoreContext.Provider>
  );
}

/** The store itself, for other stores that need to read categories. */
export function useCategoryStoreApi(): CategoryStoreApi {
  const store = useContext(CategoryStoreContext);
  if (!store) {
    throw new Error("Category store used outside CategoryStoreProvider.");
  }
  return store;
}

/** Reads from the category store; select only what the component needs. */
export function useCategoryStore<T>(selector: (state: CategoryStore) => T): T {
  return useStore(useCategoryStoreApi(), selector);
}
