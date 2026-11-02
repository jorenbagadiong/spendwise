import { describe, expect, it } from "vitest";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  countCategoryUsage,
  createCategoryFormSchema,
  getCategoryLabel,
  getSelectableCategories,
  validateCategoryInput,
  validateCategoryName,
  validateCategoryUpdate,
} from "@/lib/finance/categories";
import type { Category, Transaction } from "@/types/finance";

const categories: Category[] = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "orange", isActive: true },
  { id: "old-fun", name: "Old Fun", type: "expense", icon: "clapperboard", color: "violet", isActive: false },
  { id: "old-bonus", name: "Old Bonus", type: "income", icon: "gift", color: "teal", isActive: false },
];

describe("validateCategoryName", () => {
  it("accepts a new name and the same name under the other type", () => {
    expect(validateCategoryName("Freelance", "income", categories)).toBeNull();
    expect(validateCategoryName("Salary", "expense", categories)).toBeNull();
  });

  it("rejects empty, whitespace-only, and too-long names", () => {
    expect(validateCategoryName("", "expense", categories)).toBe("Enter a category name.");
    expect(validateCategoryName("   ", "expense", categories)).toBe("Enter a category name.");
    expect(validateCategoryName("x".repeat(50), "expense", categories)).toBeNull();
    expect(validateCategoryName("x".repeat(51), "expense", categories)).toBe("Use 50 characters or fewer.");
  });

  it("rejects duplicates within a type case-insensitively, archived included", () => {
    expect(validateCategoryName("  FOOD ", "expense", categories)).toBe("An expense category named “Food” already exists.");
    expect(validateCategoryName("old fun", "expense", categories)).toBe(
      "An archived expense category named “Old Fun” already exists. Restore it instead.",
    );
  });

  it("ignores the category being edited", () => {
    expect(validateCategoryName("food", "expense", categories, "food")).toBeNull();
  });
});

describe("icons and colors", () => {
  it("rejects unsupported icons and colors", () => {
    const base = { name: "Pets", type: "expense", icon: "paw-print", color: "amber" } as const;
    expect(validateCategoryInput(base, categories)).toBeNull();
    expect(validateCategoryInput({ ...base, icon: "skull" as never }, categories)).toBe("Choose an icon from the list.");
    expect(validateCategoryInput({ ...base, color: "#ff0000" as never }, categories)).toBe("Choose a color from the palette.");
    expect(validateCategoryInput({ ...base, type: "transfer" as never }, categories)).toBe("Choose income or expense.");
  });

  it("offers a non-empty list of each", () => {
    expect(CATEGORY_ICONS.length).toBeGreaterThan(10);
    expect(new Set(CATEGORY_ICONS).size).toBe(CATEGORY_ICONS.length);
    expect(new Set(CATEGORY_COLORS).size).toBe(CATEGORY_COLORS.length);
  });

  it("validates updates against the existing category's type", () => {
    expect(validateCategoryUpdate(categories[1], { name: "Salary", icon: "coffee", color: "rose" }, categories)).toBeNull();
    expect(validateCategoryUpdate(categories[1], { name: "old fun", icon: "coffee", color: "rose" }, categories)).toMatch(/already exists/);
  });
});

describe("createCategoryFormSchema", () => {
  it("creates a category with a trimmed name", () => {
    expect(createCategoryFormSchema(categories).parse({ name: " Pets ", type: "expense", icon: "paw-print", color: "amber" })).toEqual({
      name: "Pets",
      type: "expense",
      icon: "paw-print",
      color: "amber",
    });
  });

  it("reports name, icon, and color problems inline", () => {
    const result = createCategoryFormSchema(categories).safeParse({ name: "food", type: "expense", icon: "nope", color: "nope" });
    expect(result.error?.issues.map((i) => [i.path[0], i.message])).toEqual([
      ["name", "An expense category named “Food” already exists."],
      ["icon", "Choose an icon from the list."],
      ["color", "Choose a color from the palette."],
    ]);
  });

  it("keeps the existing type when editing, whatever is submitted", () => {
    const schema = createCategoryFormSchema(categories, categories[1]);
    expect(schema.parse({ name: "Meals", type: "income", icon: "coffee", color: "rose" }).type).toBe("expense");
    // Duplicate checks use the category's real type.
    expect(schema.safeParse({ name: "Old Fun", type: "income", icon: "coffee", color: "rose" }).success).toBe(false);
  });
});

describe("getSelectableCategories", () => {
  const expenseWithArchived: Transaction = { id: "t", type: "expense", amount: 1, date: "2026-01-02", description: "", accountId: "a", categoryId: "old-fun" };

  it("separates income and expense and hides archived categories", () => {
    expect(getSelectableCategories(categories, "income").map((c) => c.id)).toEqual(["salary"]);
    expect(getSelectableCategories(categories, "expense").map((c) => c.id)).toEqual(["food"]);
  });

  it("keeps the archived category an edited transaction already uses", () => {
    expect(getSelectableCategories(categories, "expense", expenseWithArchived).map((c) => c.id)).toEqual(["food", "old-fun"]);
  });

  it("doesn't offer that archived category under the other type", () => {
    expect(getSelectableCategories(categories, "income", expenseWithArchived).map((c) => c.id)).toEqual(["salary"]);
  });

  it("labels archived categories", () => {
    expect(getCategoryLabel(categories[2])).toBe("Old Fun (archived)");
    expect(getCategoryLabel(categories[1])).toBe("Food");
  });
});

describe("countCategoryUsage", () => {
  it("counts income and expense transactions and never transfers", () => {
    const transactions: Transaction[] = [
      { id: "1", type: "expense", amount: 1, date: "2026-01-02", description: "", accountId: "a", categoryId: "food" },
      { id: "2", type: "expense", amount: 1, date: "2026-01-03", description: "", accountId: "a", categoryId: "food" },
      { id: "3", type: "income", amount: 1, date: "2026-01-03", description: "", accountId: "a", categoryId: "salary" },
      { id: "4", type: "transfer", amount: 1, date: "2026-01-03", description: "", accountId: "a", destinationAccountId: "b" },
    ];
    expect(countCategoryUsage("food", transactions)).toBe(2);
    expect(countCategoryUsage("salary", transactions)).toBe(1);
    expect(countCategoryUsage("old-fun", transactions)).toBe(0);
    expect(countCategoryUsage("food", [])).toBe(0);
  });
});
