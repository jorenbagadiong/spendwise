import {
  BabyIcon,
  BriefcaseIcon,
  BusIcon,
  CarIcon,
  CircleEllipsisIcon,
  ClapperboardIcon,
  CoffeeIcon,
  CoinsIcon,
  FuelIcon,
  GiftIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  HouseIcon,
  type LucideIcon,
  PawPrintIcon,
  PiggyBankIcon,
  PlaneIcon,
  ReceiptIcon,
  ShirtIcon,
  ShoppingBagIcon,
  ShoppingBasketIcon,
  SmartphoneIcon,
  TrendingUpIcon,
  UtensilsIcon,
  WifiIcon,
  ZapIcon,
} from "lucide-react";

import type { CategoryColor, CategoryIcon } from "@/types/finance";

// The only place category icons and colors become UI. Records keyed by the
// union types make TypeScript flag any icon or color without a mapping.

export const categoryIconComponents: Record<CategoryIcon, LucideIcon> = {
  briefcase: BriefcaseIcon,
  coins: CoinsIcon,
  "piggy-bank": PiggyBankIcon,
  "trending-up": TrendingUpIcon,
  gift: GiftIcon,
  utensils: UtensilsIcon,
  coffee: CoffeeIcon,
  "shopping-basket": ShoppingBasketIcon,
  receipt: ReceiptIcon,
  zap: ZapIcon,
  wifi: WifiIcon,
  smartphone: SmartphoneIcon,
  home: HouseIcon,
  bus: BusIcon,
  car: CarIcon,
  fuel: FuelIcon,
  plane: PlaneIcon,
  "shopping-bag": ShoppingBagIcon,
  shirt: ShirtIcon,
  clapperboard: ClapperboardIcon,
  "heart-pulse": HeartPulseIcon,
  "graduation-cap": GraduationCapIcon,
  baby: BabyIcon,
  "paw-print": PawPrintIcon,
  "circle-ellipsis": CircleEllipsisIcon,
};

/** Readable names for the icon picker's accessible labels. */
export const categoryIconLabels: Record<CategoryIcon, string> = {
  briefcase: "Briefcase",
  coins: "Coins",
  "piggy-bank": "Piggy bank",
  "trending-up": "Trending up",
  gift: "Gift",
  utensils: "Utensils",
  coffee: "Coffee",
  "shopping-basket": "Shopping basket",
  receipt: "Receipt",
  zap: "Lightning",
  wifi: "Wi-Fi",
  smartphone: "Phone",
  home: "House",
  bus: "Bus",
  car: "Car",
  fuel: "Fuel",
  plane: "Plane",
  "shopping-bag": "Shopping bag",
  shirt: "Shirt",
  clapperboard: "Movies",
  "heart-pulse": "Health",
  "graduation-cap": "Education",
  baby: "Baby",
  "paw-print": "Pets",
  "circle-ellipsis": "Other",
};

/**
 * Tailwind classes per palette color. Written out in full so Tailwind can
 * find them when scanning the source.
 * - `chip`: tinted background + readable foreground for the icon badge
 * - `swatch`: solid color for the color picker
 */
export const categoryColorClasses: Record<CategoryColor, { chip: string; swatch: string }> = {
  emerald: { chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", swatch: "bg-emerald-500" },
  teal: { chip: "bg-teal-500/15 text-teal-700 dark:text-teal-300", swatch: "bg-teal-500" },
  sky: { chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300", swatch: "bg-sky-500" },
  blue: { chip: "bg-blue-500/15 text-blue-700 dark:text-blue-300", swatch: "bg-blue-500" },
  violet: { chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300", swatch: "bg-violet-500" },
  pink: { chip: "bg-pink-500/15 text-pink-700 dark:text-pink-300", swatch: "bg-pink-500" },
  rose: { chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300", swatch: "bg-rose-500" },
  orange: { chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300", swatch: "bg-orange-500" },
  amber: { chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300", swatch: "bg-amber-500" },
  lime: { chip: "bg-lime-500/15 text-lime-700 dark:text-lime-300", swatch: "bg-lime-500" },
  slate: { chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300", swatch: "bg-slate-500" },
};

export const categoryColorLabels: Record<CategoryColor, string> = {
  emerald: "Emerald",
  teal: "Teal",
  sky: "Sky",
  blue: "Blue",
  violet: "Violet",
  pink: "Pink",
  rose: "Rose",
  orange: "Orange",
  amber: "Amber",
  lime: "Lime",
  slate: "Slate",
};
