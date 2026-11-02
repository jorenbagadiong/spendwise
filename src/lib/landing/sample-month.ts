import type { Centavos } from "@/types/finance";

// Illustrative numbers for the landing page (SW-011): one sample month,
// in integer centavos like the app itself. Every total is derived from the
// individual transactions below, so the story always adds up. The landing
// page labels all of it as sample data.

export type SampleCategory = "Food" | "Bills" | "Transportation" | "Other";

export type SampleTransaction = {
  description: string;
  category: SampleCategory;
  amount: Centavos;
};

export const SAMPLE_INCOME: Centavos = 4_500_000; // ₱45,000.00 salary

export const sampleTransactions: readonly SampleTransaction[] = [
  { description: "Groceries at SM", category: "Food", amount: 520_000 },
  { description: "Carinderia lunches", category: "Food", amount: 245_000 },
  { description: "Coffee", category: "Food", amount: 80_000 },
  { description: "Meralco electricity", category: "Bills", amount: 360_000 },
  { description: "PLDT Fiber", category: "Bills", amount: 169_900 },
  { description: "Water bill", category: "Bills", amount: 90_100 },
  { description: "Grab rides", category: "Transportation", amount: 135_000 },
  { description: "Jeepney and MRT fares", category: "Transportation", amount: 100_000 },
  { description: "Birthday gift", category: "Other", amount: 150_000 },
  { description: "Medicine", category: "Other", amount: 100_000 },
  { description: "Haircut", category: "Other", amount: 50_000 },
];

export const sampleCategories: readonly SampleCategory[] = ["Food", "Bills", "Transportation", "Other"];

export function getSampleCategoryTotals(): { category: SampleCategory; amount: Centavos }[] {
  return sampleCategories.map((category) => ({
    category,
    amount: sampleTransactions.filter((t) => t.category === category).reduce((sum, t) => sum + t.amount, 0),
  }));
}

export function getSampleTotals() {
  const expenses = sampleTransactions.reduce((sum, t) => sum + t.amount, 0);
  return { income: SAMPLE_INCOME, expenses, net: SAMPLE_INCOME - expenses };
}
