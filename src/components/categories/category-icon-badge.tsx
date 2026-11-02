import { categoryColorClasses, categoryIconComponents } from "@/config/category-appearance";
import { cn } from "@/lib/utils";
import type { CategoryColor, CategoryIcon } from "@/types/finance";

/** A category's icon on its color, e.g. in the category list and form preview. */
export function CategoryIconBadge({
  icon,
  color,
  muted = false,
  className,
}: {
  icon: CategoryIcon;
  color: CategoryColor;
  /** Greyed out, e.g. for archived categories. */
  muted?: boolean;
  className?: string;
}) {
  const Icon = categoryIconComponents[icon];
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        muted ? "bg-muted text-muted-foreground" : categoryColorClasses[color].chip,
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}
