import { WalletIcon } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <WalletIcon className="size-7" aria-hidden="true" />
      </div>
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
        Spend Wise Tracker
      </h1>
      <p className="max-w-md text-muted-foreground">
        Track your salary, daily expenses, and accounts in one place.
      </p>
    </main>
  );
}
