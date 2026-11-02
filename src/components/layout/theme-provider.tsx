"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes stores the choice in localStorage and injects a small blocking
// script that applies the `.dark` class before the first paint (no flash).
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
