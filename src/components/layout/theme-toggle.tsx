"use client";

import { useSyncExternalStore } from "react";
import { ChevronDownIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themeOptions = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

const subscribeNever = () => () => {};

/**
 * Light / Dark / System menu. The header uses the icon-only version; the
 * Settings page passes `showLabel` to also show the current choice. Both
 * read and write the same next-themes state, so they always agree.
 */
export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, setTheme } = useTheme();
  // next-themes only knows the saved choice in the browser, so the label
  // text waits until after hydration to avoid a server/client mismatch.
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const currentLabel = themeOptions.find((option) => option.value === theme)?.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          showLabel ? (
            <Button variant="outline" />
          ) : (
            <Button variant="ghost" size="icon" aria-label="Change theme" />
          )
        }
      >
        {/* The visible icon is chosen with CSS (the `.dark` class), not JS,
            so server and client render identical markup. */}
        <SunIcon className="dark:hidden" aria-hidden="true" />
        <MoonIcon className="hidden dark:block" aria-hidden="true" />
        {showLabel && (
          <>
            Theme: {isClient && currentLabel ? currentLabel : "…"}
            <ChevronDownIcon className="text-muted-foreground" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={showLabel ? "start" : "end"} className="w-36">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            {themeOptions.map(({ value, label, icon: Icon }) => (
              // Close after choosing (Base UI keeps radio menus open by default).
              <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                <Icon aria-hidden="true" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
