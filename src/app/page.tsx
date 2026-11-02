import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChartColumnIcon,
  DownloadIcon,
  LandmarkIcon,
  ReceiptTextIcon,
  TagsIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";

import { AppLogo } from "@/components/layout/app-logo";
import { LandingMotion } from "@/components/landing/landing-motion";
import styles from "@/components/landing/landing.module.css";
import {
  BreakdownCard,
  HeroVisual,
  NetCard,
  PrivacyCard,
  StageBase,
  TransactionsCard,
} from "@/components/landing/story-visuals";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance/money";
import { getSampleCategoryTotals, getSampleTotals, sampleTransactions } from "@/lib/landing/sample-month";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Spend Wise Tracker · Know where your money goes" },
  description:
    "A free personal finance tracker for income, expenses, accounts, and reports in Philippine pesos. No account needed: your records stay in your browser.",
};

// The landing page (SW-011): a scroll-driven story told with faux 3D (CSS
// perspective and transforms, no WebGL). It's fully static and
// server-rendered: every headline, number, and link is in the HTML.
// LandingMotion only adds scroll and pointer effects on top. It lives
// outside the (app) route group, so it never reads or writes saved data.

const APP_ENTRY = "/dashboard";
const totals = getSampleTotals();
const categories = getSampleCategoryTotals();

const features: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ReceiptTextIcon, title: "Income and expenses", text: "Record every peso in and out, in a fast spreadsheet-style table with search and filters." },
  { icon: WalletCardsIcon, title: "Accounts", text: "Track bank accounts, e-wallets, and cash, with balances calculated from your records." },
  { icon: TagsIcon, title: "Categories", text: "Organize spending with categories you can rename, recolor, archive, and restore." },
  { icon: LandmarkIcon, title: "Balances and cash flow", text: "See income, expenses, net cash flow, and your total balance for any month." },
  { icon: ChartColumnIcon, title: "Reports", text: "Six-month trends, spending by category and account, and month-over-month changes." },
  { icon: DownloadIcon, title: "Export and backup", text: "Download CSV files for spreadsheets and JSON backups you can restore later." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
      {/* Reading progress (scaled by LandingMotion). Decorative. */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary"
        style={{ transform: "scaleX(var(--page-progress, 0))" }}
      />

      <LandingHeader />

      <main>
        <Hero />

        <section id="how-it-works" aria-labelledby="how-heading" className="relative scroll-mt-20">
          <h2 id="how-heading" className="sr-only">
            How it works
          </h2>
          {/* Two columns (story + sticky stage) only with motion; otherwise one readable column. */}
          <div className="mx-auto grid w-full max-w-6xl gap-x-12 px-4 sm:px-6 lg:px-8 lg:motion-safe:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="flex flex-col lg:motion-reduce:max-w-3xl">
              <Scene n={2} eyebrow="Money out" title="Where Does Your Money Go?" visual={<BreakdownCard />}>
                <p>
                  Every expense lands in a category, so the month&apos;s spending explains itself. In this sample
                  month, {formatCurrency(totals.expenses)} of spending splits into four categories.
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {categories.map(({ category, amount }) => (
                    <li key={category} className="rounded-lg bg-muted/50 px-3 py-2">
                      <span className="block text-muted-foreground">{category}</span>
                      <span className="font-medium tabular-nums text-foreground">{formatCurrency(amount)}</span>
                    </li>
                  ))}
                </ul>
              </Scene>

              <Scene n={3} eyebrow="Every peso has a story" title="Every Peso Has a Story." visual={<TransactionsCard />}>
                <p>
                  Category totals are built from real entries: groceries, fares, bills. Add a transaction once
                  and it shows up in your balances, category totals, and reports.
                </p>
                <p className="mt-3">
                  Here, {sampleTransactions.length} sample expenses add up to exactly{" "}
                  {formatCurrency(totals.expenses)}.
                </p>
                <ul className="sr-only">
                  {sampleTransactions.map((t) => (
                    <li key={t.description}>
                      {t.description}, {t.category}, {formatCurrency(t.amount)}
                    </li>
                  ))}
                </ul>
              </Scene>

              <Scene n={4} eyebrow="Money left" title="See What Remains." visual={<NetCard />}>
                <p>
                  {formatCurrency(totals.income)} in income minus {formatCurrency(totals.expenses)} in expenses
                  leaves <strong className="text-foreground">{formatCurrency(totals.net)}</strong> of net cash flow.
                </p>
                <p className="mt-3">
                  That isn&apos;t money saved yet. It&apos;s what&apos;s left to decide on. Knowing it each month helps
                  you choose how much to set aside, and spot months when spending runs ahead of income.
                </p>
              </Scene>

              <Scene n={5} id="privacy" eyebrow="Privacy and control" title="Your Money. Your Data. Your Control." visual={<PrivacyCard />}>
                <ul className="flex list-disc flex-col gap-2 pl-5">
                  <li>Your financial records are stored in your browser&apos;s local storage on this device.</li>
                  <li>No account registration is required.</li>
                  <li>There&apos;s no automatic cloud sync, so other browsers and devices don&apos;t see your data.</li>
                  <li>Clearing your browser&apos;s site data can erase your records.</li>
                  <li>Download a JSON backup regularly from Settings so you can restore your records later.</li>
                </ul>
              </Scene>
            </div>

            {/* Sticky faux-3D stage (desktop with motion). Decorative: the facts are in the text. */}
            <div className="hidden lg:block lg:motion-reduce:hidden" aria-hidden="true">
              <div data-stage className={cn(styles.stage, "sticky top-24 h-[min(36rem,calc(100dvh-8rem))]")}>
                <div className={cn(styles.stageRig, "relative h-full")}>
                  <div data-stage-base className={cn(styles.stageBase, "absolute inset-0")}>
                    <StageBase />
                  </div>
                  {[
                    { n: 2, card: <BreakdownCard animated /> },
                    { n: 3, card: <TransactionsCard animated /> },
                    { n: 4, card: <NetCard /> },
                    { n: 5, card: <PrivacyCard /> },
                  ].map(({ n, card }) => (
                    <div key={n} data-layer={n} className={cn(styles.layer, "absolute inset-x-6 top-1/2 -translate-y-1/2")}>
                      {card}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" aria-labelledby="features-heading" className="scroll-mt-20 border-t border-border py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 id="features-heading" className="font-heading text-3xl font-semibold tracking-tight">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Spend Wise is free, works in your browser, and is built for Philippine pesos.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex flex-col gap-3 rounded-2xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:ring-primary/40">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="final-heading" className="relative overflow-hidden border-t border-border py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_65%)]"
          />
          <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 text-center">
            <h2 id="final-heading" className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Make Every Peso Count.
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Start in seconds. No sign-up, and your records stay in your browser. Try it with demo data, or
              start with your own.
            </p>
            <Link href={APP_ENTRY} className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base" })}>
              Start Tracking Now
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>Spend Wise Tracker · Personal finance in Philippine pesos</p>
          <p>Amounts on this page are sample data.</p>
        </div>
      </footer>

      <LandingMotion />
    </div>
  );
}

function LandingHeader() {
  const links = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#privacy", label: "Privacy" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <AppLogo />
          <span className="font-heading text-base font-semibold tracking-tight">Spend Wise</span>
        </Link>
        <nav aria-label="Landing page" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <ThemeToggle />
          <Link href={APP_ENTRY} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open App
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section data-hero aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_60%)]"
      />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-20 lg:pb-28">
        <div className="flex flex-col items-start gap-5">
          <p className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-foreground ring-1 ring-primary/20">
            Free · No sign-up · Your data stays in your browser
          </p>
          <h1 id="hero-heading" className="font-heading text-4xl font-semibold tracking-tight [text-wrap:balance] sm:text-5xl lg:text-6xl">
            Know Where Your Money Goes.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Track income, expenses, and accounts in one place. Understand your spending, see what remains each
            month, and make smarter saving decisions, in pesos.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={APP_ENTRY} className={buttonVariants({ size: "lg", className: "h-11 px-5 text-base" })}>
              Start Tracking for Free
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className={buttonVariants({ variant: "ghost", size: "lg", className: "h-11 px-4 text-base" })}>
              See how it works
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Sample month shown: {formatCurrency(totals.income)} income, {formatCurrency(totals.expenses)} expenses.
          </p>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function Scene({
  n,
  id,
  eyebrow,
  title,
  visual,
  children,
}: {
  n: number;
  id?: string;
  eyebrow: string;
  title: string;
  visual: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article
      id={id}
      data-scene={n}
      aria-labelledby={`scene-${n}-heading`}
      className="flex scroll-mt-20 flex-col justify-center gap-6 border-l-2 border-transparent py-14 pl-5 transition-colors data-active:border-primary lg:min-h-[78vh] lg:py-0"
    >
      <div>
        <p className="text-sm font-medium text-primary">
          <span className="tabular-nums">0{n}</span> · {eyebrow}
        </p>
        <h3 id={`scene-${n}-heading`} className="mt-2 font-heading text-3xl font-semibold tracking-tight [text-wrap:balance] sm:text-4xl">
          {title}
        </h3>
        <div className="mt-4 text-muted-foreground">{children}</div>
      </div>
      {/* Phones, tablets, and reduced motion: the scene's card sits inline, flat. */}
      <div className="lg:hidden lg:motion-reduce:block" aria-hidden="true">
        {visual}
      </div>
    </article>
  );
}
