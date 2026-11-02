import type { LucideIcon } from "lucide-react";

type PagePlaceholderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Temporary empty state for sections whose features arrive in later milestones.
export function PagePlaceholder({
  icon: Icon,
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <section
      aria-labelledby="page-placeholder-title"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center text-card-foreground"
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 id="page-placeholder-title" className="font-heading text-lg font-semibold">
        {title}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </section>
  );
}
