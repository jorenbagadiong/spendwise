import type { Metadata } from "next";
import { SettingsIcon } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <PagePlaceholder
      icon={SettingsIcon}
      title="More settings are coming soon"
      description="Theme preferences are available now from the theme menu in the header. Local data management, such as exporting, importing, and clearing your data, will appear here."
    />
  );
}
