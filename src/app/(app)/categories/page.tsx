import type { Metadata } from "next";
import { TagsIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Categories",
};

export default function CategoriesPage() {
  return (
    <PagePlaceholder
      icon={TagsIcon}
      title="Categories are coming soon"
      description="Income and expense categories for organizing transactions will appear here."
    />
  );
}
