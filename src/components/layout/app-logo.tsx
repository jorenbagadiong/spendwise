import Image from "next/image";

import logo from "@/assets/spendwise-logo.png";
import { cn } from "@/lib/utils";

/**
 * The Spend Wise logo mark (peso sign over rising bars). Decorative: it's
 * always shown next to the "Spend Wise" name, so the alt text is empty.
 * The favicon and app icons are generated from the same artwork
 * (src/app/favicon.ico, icon.png, apple-icon.png).
 */
export function AppLogo({ size = 32, className }: { size?: number; className?: string }) {
  return <Image src={logo} alt="" width={size} height={size} className={cn("shrink-0", className)} />;
}
