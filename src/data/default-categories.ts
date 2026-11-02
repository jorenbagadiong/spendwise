import type { Category } from "@/types/finance";

// Starter categories for a new personal workspace (SW-010), also used by the
// demo dataset. They're templates for organizing records, not financial
// activity: a new workspace starts with these and no accounts or
// transactions. They can be renamed, archived, or extended like any other.

export const defaultCategories = [
  { id: "salary", name: "Salary", type: "income", icon: "briefcase", color: "emerald", isActive: true },
  { id: "other-income", name: "Other Income", type: "income", icon: "coins", color: "teal", isActive: true },
  { id: "food", name: "Food", type: "expense", icon: "utensils", color: "orange", isActive: true },
  { id: "groceries", name: "Groceries", type: "expense", icon: "shopping-basket", color: "lime", isActive: true },
  { id: "bills", name: "Bills", type: "expense", icon: "receipt", color: "amber", isActive: true },
  { id: "transportation", name: "Transportation", type: "expense", icon: "bus", color: "sky", isActive: true },
  { id: "shopping", name: "Shopping", type: "expense", icon: "shopping-bag", color: "pink", isActive: true },
  { id: "entertainment", name: "Entertainment", type: "expense", icon: "clapperboard", color: "violet", isActive: true },
  { id: "other-expenses", name: "Other Expenses", type: "expense", icon: "circle-ellipsis", color: "slate", isActive: true },
] as const satisfies readonly Category[];
