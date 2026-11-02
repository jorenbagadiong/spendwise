"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArchiveIcon,
  ChartColumnIcon,
  DownloadIcon,
  FolderOpenIcon,
  HardDriveIcon,
  LandmarkIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagsIcon,
  TriangleAlertIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";

import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { backupFilename, downloadTextFile } from "@/lib/persistence/download";
import { profileNameFormSchema, type WorkspaceMode } from "@/lib/profile/profile";
import { cn } from "@/lib/utils";
import { completeOnboarding, type OnboardingPlan } from "@/lib/workspace/workspace";
import { useAccountStore } from "@/stores/account-store-provider";
import { useCategoryStore } from "@/stores/category-store-provider";
import { usePersistence, useProfileController } from "@/stores/finance-data-provider";
import { useTransactionStore } from "@/stores/transaction-store-provider";

type Step = "welcome" | "name" | "workspace" | "existing" | "privacy";

const stepLabels: Record<Step, string> = {
  welcome: "Welcome",
  name: "Your name",
  workspace: "Workspace",
  existing: "Your data",
  privacy: "Privacy",
};

const stepsFor: Record<Exclude<OnboardingPlan, "loading" | "blocked" | "none">, Step[]> = {
  "new-user": ["welcome", "name", "workspace", "privacy"],
  // Saved records exist: keeping them is the default; starting fresh needs
  // an explicit confirmation.
  "existing-data": ["welcome", "name", "existing", "privacy"],
  "missing-workspace": ["workspace"],
};

const features: { icon: LucideIcon; text: string }[] = [
  { icon: ReceiptTextIcon, text: "Track income and expenses" },
  { icon: WalletCardsIcon, text: "Manage bank accounts, e-wallets, and cash" },
  { icon: TagsIcon, text: "Organize transactions with categories" },
  { icon: LandmarkIcon, text: "Monitor balances and cash flow" },
  { icon: ChartColumnIcon, text: "See monthly financial reports" },
  { icon: DownloadIcon, text: "Export your records as CSV" },
];

/**
 * First-run onboarding (SW-010). Which steps appear depends on what's
 * already saved (see getOnboardingPlan). Nothing is written until the last
 * step, and then only through completeOnboarding, which never replaces
 * saved financial records.
 */
export function OnboardingFlow({ plan: currentPlan }: { plan: keyof typeof stepsFor }) {
  const finance = usePersistence();
  const profile = useProfileController();
  // Keep the plan the flow started with. If finishing fails halfway (the
  // workspace was created but the profile couldn't be saved), the live plan
  // changes to "existing-data", but the person should stay on the same step
  // and simply retry.
  const [plan] = useState(currentPlan);
  const steps = stepsFor[plan];
  const [index, setIndex] = useState(0);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("personal");
  const [acknowledged, setAcknowledged] = useState(false);
  const [existingData, setExistingData] = useState<"keep" | "start-fresh">("keep");
  const [freshConfirmed, setFreshConfirmed] = useState(false);
  const savedCounts = {
    accounts: useAccountStore((state) => state.accounts.length),
    categories: useCategoryStore((state) => state.categories.length),
    transactions: useTransactionStore((state) => state.transactions.length),
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameId = useId();
  const ackId = useId();
  const freshId = useId();

  // The name form stays registered across steps, so going Back keeps what was typed.
  const form = useForm({ resolver: zodResolver(profileNameFormSchema), defaultValues: { fullName: "" } });

  const step = steps[index];
  const isLast = index === steps.length - 1;

  // Move focus to each step's heading so keyboard and screen-reader users
  // start at the top of the new content.
  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  function goBack() {
    setError(null);
    setIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    setError(null);
    setIndex((i) => Math.min(steps.length - 1, i + 1));
  }

  function finish() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = completeOnboarding(
      { finance, profile },
      { fullName: form.getValues("fullName"), workspaceMode, privacyAcknowledged: acknowledged, existingData },
    );
    // On success the gate swaps this screen for the app; on failure stay here.
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
    }
  }

  const finishLabel =
    plan === "existing-data"
      ? existingData === "start-fresh"
        ? "Start fresh"
        : "Continue to my data"
      : plan === "missing-workspace"
        ? "Create workspace"
        : "Start using Spend Wise";

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-8 sm:py-12">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <AppLogo />
          <span className="font-heading text-base font-semibold tracking-tight">Spend Wise Tracker</span>
        </div>

        {steps.length > 1 && (
          <nav aria-label="Setup progress">
            <p className="mb-2 text-sm text-muted-foreground">
              Step {index + 1} of {steps.length}
            </p>
            <ol className="flex gap-2">
              {steps.map((s, i) => (
                <li key={s} aria-current={i === index ? "step" : undefined} className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn("h-1.5 rounded-full", i <= index ? "bg-primary" : "bg-muted")}
                  />
                  <span className={cn("truncate text-xs", i === index ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {stepLabels[s]}
                    <span className="sr-only">{i < index ? " (done)" : i === index ? " (current)" : ""}</span>
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <main className="rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 sm:p-6">
          {step === "welcome" && (
            <section aria-labelledby="onboarding-heading" className="flex flex-col gap-4">
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold tracking-tight outline-none">
                {plan === "existing-data" ? "Welcome back to Spend Wise Tracker" : "Welcome to Spend Wise Tracker"}
              </h1>
              {plan === "existing-data" ? (
                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <p>
                    This browser already has saved accounts, categories, and transactions. Spend Wise
                    now asks for a name to personalize the app and explains how your data is stored.
                  </p>
                  <p>
                    You&apos;ll also choose whether to keep your saved data or start fresh. Nothing
                    changes unless you choose to start fresh and confirm it.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Take control of your finances in one simple place. Track your income, expenses,
                    accounts, and spending habits without creating an account.
                  </p>
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {features.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-start gap-2.5 text-sm">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="pt-1">{text}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <StepActions onNext={goNext} nextLabel="Get started" />
            </section>
          )}

          {step === "name" && (
            <form
              aria-labelledby="onboarding-heading"
              noValidate
              onSubmit={form.handleSubmit(goNext)}
              className="flex flex-col gap-4"
            >
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold tracking-tight outline-none">
                What should we call you?
              </h1>
              <Field data-invalid={!!form.formState.errors.fullName}>
                <FieldLabel htmlFor={nameId}>Full name</FieldLabel>
                <Input
                  id={nameId}
                  autoComplete="name"
                  aria-invalid={!!form.formState.errors.fullName}
                  aria-describedby={`${nameId}-hint ${nameId}-error`}
                  {...form.register("fullName")}
                />
                <p id={`${nameId}-hint`} className="text-sm text-muted-foreground">
                  Your name is used to personalize your experience and is saved only in this browser.
                </p>
                <FieldError id={`${nameId}-error`} errors={[form.formState.errors.fullName]} />
              </Field>
              <StepActions onBack={goBack} submit nextLabel="Continue" />
            </form>
          )}

          {step === "workspace" && (
            <section aria-labelledby="onboarding-heading" className="flex flex-col gap-4">
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold tracking-tight outline-none">
                How would you like to start?
              </h1>
              {plan === "missing-workspace" && (
                <p className="text-sm text-muted-foreground">
                  Your profile is here, but no financial data is saved in this browser (it may have
                  been cleared). Choose how to continue, or restore a JSON backup afterwards in
                  Settings.
                </p>
              )}
              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">Workspace</legend>
                <ChoiceOption
                  name="workspace-mode"
                  value="personal"
                  checked={workspaceMode === "personal"}
                  onChange={() => setWorkspaceMode("personal")}
                  icon={FolderOpenIcon}
                  title="Start with my own data"
                  badge="Recommended"
                  description="An empty workspace with starter categories. You add your own accounts and transactions, starting with your first account."
                />
                <ChoiceOption
                  name="workspace-mode"
                  value="demo"
                  checked={workspaceMode === "demo"}
                  onChange={() => setWorkspaceMode("demo")}
                  icon={SparklesIcon}
                  title="Explore with demo data"
                  description="Example accounts and transactions (July–November 2026), labeled as demo data, so you can try every page. Clear them in Settings when you're ready to start fresh."
                />
              </fieldset>
              {isLast ? (
                <FinishActions onBack={index > 0 ? goBack : undefined} label={finishLabel} onFinish={finish} disabled={submitting} error={error} />
              ) : (
                <StepActions onBack={goBack} onNext={goNext} nextLabel="Continue" />
              )}
            </section>
          )}

          {step === "existing" && (
            <section aria-labelledby="onboarding-heading" className="flex flex-col gap-4">
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold tracking-tight outline-none">
                What should we do with your saved data?
              </h1>
              <p className="text-sm text-muted-foreground">
                This browser has {plural(savedCounts.accounts, "account")}, {plural(savedCounts.categories, "category", "categories")},
                and {plural(savedCounts.transactions, "transaction")} saved. Earlier versions of Spend
                Wise added sample records automatically on the first visit, so these may be examples
                rather than your own.
              </p>
              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">Saved data</legend>
                <ChoiceOption
                  name="existing-data"
                  value="keep"
                  checked={existingData === "keep"}
                  onChange={() => setExistingData("keep")}
                  icon={ArchiveIcon}
                  title="Keep my current data"
                  badge="Recommended"
                  description="Continue with everything as it is. Nothing is changed or removed."
                />
                <ChoiceOption
                  name="existing-data"
                  value="start-fresh"
                  checked={existingData === "start-fresh"}
                  onChange={() => setExistingData("start-fresh")}
                  icon={RotateCcwIcon}
                  title="Start fresh with my own data"
                  description="Remove all saved accounts, categories, and transactions, and start with an empty personal workspace (starter categories only)."
                />
              </fieldset>
              {existingData === "start-fresh" && (
                <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="flex items-start gap-2">
                    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                    <span>
                      Starting fresh permanently removes the saved records from this browser. If any of
                      them are yours, download a backup first; you can restore it later in Settings.
                    </span>
                  </p>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTextFile(backupFilename(), JSON.stringify(finance.exportSnapshot(), null, 2))}
                    >
                      <DownloadIcon data-icon="inline-start" aria-hidden="true" />
                      Download backup first
                    </Button>
                  </div>
                  <div className="flex items-start gap-3">
                    <input
                      id={freshId}
                      type="checkbox"
                      checked={freshConfirmed}
                      onChange={(event) => setFreshConfirmed(event.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                    />
                    <label htmlFor={freshId} className="font-medium">
                      I understand that my saved accounts, categories, and transactions will be removed.
                    </label>
                  </div>
                </div>
              )}
              <StepActions
                onBack={goBack}
                onNext={goNext}
                nextLabel="Continue"
                disabled={existingData === "start-fresh" && !freshConfirmed}
              />
            </section>
          )}

          {step === "privacy" && (
            <section aria-labelledby="onboarding-heading" className="flex flex-col gap-4">
              <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold tracking-tight outline-none">
                Your data, your privacy
              </h1>
              <PrivacyNotice />
              <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-3">
                <input
                  id={ackId}
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  aria-describedby={`${ackId}-required`}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <label htmlFor={ackId} className="text-sm font-medium">
                  I understand that my data is stored locally and may be permanently lost if browser
                  site data is cleared.
                </label>
              </div>
              <p id={`${ackId}-required`} className="text-sm text-muted-foreground">
                {acknowledged ? "Thanks. You can review this anytime in Settings." : "Tick the box to continue."}
              </p>
              <FinishActions onBack={goBack} label={finishLabel} onFinish={finish} disabled={!acknowledged || submitting} error={error} describedBy={`${ackId}-required`} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

const plural = (count: number, word: string, pluralWord = `${word}s`) => `${count} ${count === 1 ? word : pluralWord}`;

/** The privacy and local-storage notice, shared with Settings → Privacy & data. */
export function PrivacyNotice({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-4 text-sm">
      <NoticeItem icon={HardDriveIcon} heading={Heading} title="Stored on your device">
        Your name, accounts, categories, and transactions are stored in this browser&apos;s local
        storage. Your financial records aren&apos;t uploaded to an application backend: Spend Wise
        has no server-side database, analytics, or tracking scripts.
      </NoticeItem>
      <NoticeItem icon={ShieldCheckIcon} heading={Heading} title="Your financial data stays private">
        Spend Wise doesn&apos;t require an account. Your financial records are meant to stay on your
        device. Like any website, the host serving the app can see normal page requests (such as
        your IP address and the pages you open), but those requests don&apos;t contain your financial
        records or your name. Local storage isn&apos;t encrypted, so anyone with access to this
        browser profile can read it.
      </NoticeItem>
      <NoticeItem icon={TriangleAlertIcon} heading={Heading} title="Important: your data can be lost" tone="warning">
        Your information is saved in this browser, not in the cloud. Clearing cookies and site data,
        removing browser storage, or switching to another browser or device can permanently erase
        your records. Clearing only cached images and files usually doesn&apos;t remove it. In
        private or incognito windows, the browser discards it when the window closes.
      </NoticeItem>
      <NoticeItem icon={DownloadIcon} heading={Heading} title="Protect your records">
        Download a JSON backup regularly from Settings → Data management. A JSON backup can restore
        your accounts, categories, and transactions later. CSV exports are for spreadsheets and
        can&apos;t be restored.
      </NoticeItem>
    </div>
  );
}

function NoticeItem({
  icon: Icon,
  heading: Heading,
  title,
  tone = "default",
  children,
}: {
  icon: LucideIcon;
  heading: "h2" | "h3";
  title: string;
  tone?: "default" | "warning";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          tone === "warning" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <Heading className="font-medium">{title}</Heading>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function ChoiceOption({
  name,
  value,
  checked,
  onChange,
  icon: Icon,
  title,
  badge,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  icon: LucideIcon;
  title: string;
  badge?: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg p-4 ring-1 transition-colors",
        "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        checked ? "bg-primary/5 ring-primary" : "ring-foreground/10 hover:bg-muted/50",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          {title}
          {badge && <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{badge}</span>}
        </span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function StepActions({
  onBack,
  onNext,
  submit = false,
  nextLabel,
  disabled = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  submit?: boolean;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
      {onBack ? (
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button type={submit ? "submit" : "button"} onClick={submit ? undefined : onNext} disabled={disabled}>
        {nextLabel}
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    </div>
  );
}

function FinishActions({
  onBack,
  label,
  onFinish,
  disabled,
  error,
  describedBy,
}: {
  onBack?: () => void;
  label: string;
  onFinish: () => void;
  disabled: boolean;
  error: string | null;
  describedBy?: string;
}) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" onClick={onFinish} disabled={disabled} aria-describedby={describedBy}>
          {label}
        </Button>
      </div>
    </div>
  );
}
