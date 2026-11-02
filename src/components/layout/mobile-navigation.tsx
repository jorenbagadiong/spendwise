"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";

import { AppBrand } from "@/components/layout/app-sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Below `lg`, the sidebar becomes a drawer. The Sheet (a Base UI Dialog)
// handles focus trapping, Escape to close, and returning focus to the trigger.
export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation menu"
          />
        }
      >
        <MenuIcon aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 gap-6 bg-sidebar px-4 py-5 text-sidebar-foreground"
      >
        <SheetHeader className="gap-0 p-0 px-2">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Go to a section of Spend Wise Tracker.
          </SheetDescription>
          <AppBrand />
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
