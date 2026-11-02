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
      title="Settings are coming soon"
      description="Preferences such as currency and display options will appear here. Use the theme menu in the header to switch between light and dark mode."
    />
  );
}
