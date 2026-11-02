"use client";

import { useId, useMemo } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  accountTypeLabels,
  createAccountFormSchema,
  createAccountUpdateSchema,
  getEmptyAccountFormValues,
  type AccountFormValues,
} from "@/lib/finance/accounts";
import { formatCentavosForInput, formatCurrency } from "@/lib/finance/money";
import { formatDateLabel } from "@/lib/finance/months";
import { cn } from "@/lib/utils";
import { useAccountStore } from "@/stores/account-store-provider";
import type { Account, AccountInput, AccountType, AccountUpdate, IsoDate } from "@/types/finance";

type AccountFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account to edit, or null to add a new one. */
  account: Account | null;
  today: IsoDate;
  onSaved: (account: Account, action: "added" | "updated") => void;
};

export function AccountFormDialog({ open, onOpenChange, account, today, onSaved }: AccountFormDialogProps) {
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "Add account"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Rename the account or change its type."
              : "Add a bank account, e-wallet, or cash wallet you want to track."}
          </DialogDescription>
        </DialogHeader>
        {/* The popup unmounts when closed, so each open starts a fresh form. */}
        {account ? (
          <EditAccountForm account={account} onSaved={onSaved} onDone={close} />
        ) : (
          <AddAccountForm today={today} onSaved={onSaved} onDone={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddAccountForm({
  today,
  onSaved,
  onDone,
}: {
  today: IsoDate;
  onSaved: AccountFormDialogProps["onSaved"];
  onDone: () => void;
}) {
  const accounts = useAccountStore((state) => state.accounts);
  const addAccount = useAccountStore((state) => state.addAccount);
  const ids = { balance: useId(), date: useId() };
  const schema = useMemo(() => createAccountFormSchema(accounts), [accounts]);
  const { register, handleSubmit, formState, setError } = useForm<AccountFormValues, unknown, AccountInput>({
    resolver: zodResolver(schema),
    defaultValues: getEmptyAccountFormValues(today),
  });

  function onSubmit(input: AccountInput) {
    const result = addAccount(input);
    if (!result.ok) {
      setError("name", { message: result.error });
      return;
    }
    onSaved(result.account, "added");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FieldGroup>
        <NameAndTypeFields register={register} errors={formState.errors} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!formState.errors.openingBalance}>
            <FieldLabel htmlFor={ids.balance}>Opening balance (₱)</FieldLabel>
            <Input
              id={ids.balance}
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={!!formState.errors.openingBalance}
              aria-describedby={`${ids.balance}-error ${ids.balance}-hint`}
              {...register("openingBalance")}
            />
            <p id={`${ids.balance}-hint`} className="text-xs text-muted-foreground">
              Not counted as income.
            </p>
            <FieldError id={`${ids.balance}-error`} errors={[formState.errors.openingBalance]} />
          </Field>
          <Field data-invalid={!!formState.errors.openingDate}>
            <FieldLabel htmlFor={ids.date}>Opening date</FieldLabel>
            <Input
              id={ids.date}
              type="date"
              aria-invalid={!!formState.errors.openingDate}
              aria-describedby={`${ids.date}-error`}
              {...register("openingDate")}
            />
            <FieldError id={`${ids.date}-error`} errors={[formState.errors.openingDate]} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          The opening balance and date can&apos;t be changed later, because they
          affect every historical balance.
        </p>
      </FieldGroup>
      <FormActions onCancel={onDone} submitLabel="Add account" />
    </form>
  );
}

function EditAccountForm({
  account,
  onSaved,
  onDone,
}: {
  account: Account;
  onSaved: AccountFormDialogProps["onSaved"];
  onDone: () => void;
}) {
  const accounts = useAccountStore((state) => state.accounts);
  const updateAccount = useAccountStore((state) => state.updateAccount);
  const schema = useMemo(() => createAccountUpdateSchema(accounts, account.id), [accounts, account.id]);
  const { register, handleSubmit, formState, setError } = useForm<AccountFormValues, unknown, AccountUpdate>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account.name,
      type: account.type,
      openingBalance: formatCentavosForInput(account.openingBalance),
      openingDate: account.openingDate,
    },
  });

  function onSubmit(update: AccountUpdate) {
    const result = updateAccount(account.id, update);
    if (!result.ok) {
      setError(result.error.includes("no longer exists") ? "root" : "name", { message: result.error });
      return;
    }
    onSaved(result.account, "updated");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FieldGroup>
        <NameAndTypeFields register={register} errors={formState.errors} />
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Opening balance</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(account.openingBalance)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Opening date</dt>
            <dd className="font-medium">{formatDateLabel(account.openingDate)}</dd>
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            These can&apos;t be changed because they affect historical balances.
          </p>
        </dl>
      </FieldGroup>
      {formState.errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {formState.errors.root.message}
        </p>
      )}
      <FormActions onCancel={onDone} submitLabel="Save changes" />
    </form>
  );
}

function NameAndTypeFields({
  register,
  errors,
}: {
  register: UseFormRegister<AccountFormValues>;
  errors: FieldErrors<AccountFormValues>;
}) {
  const nameId = useId();
  return (
    <>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor={nameId}>Account name</FieldLabel>
        <Input
          id={nameId}
          autoComplete="off"
          placeholder="e.g. BDO Savings"
          aria-invalid={!!errors.name}
          aria-describedby={`${nameId}-error`}
          {...register("name")}
        />
        <FieldError id={`${nameId}-error`} errors={[errors.name]} />
      </Field>
      <FieldSet>
        <FieldLegend variant="label">Type</FieldLegend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {(Object.keys(accountTypeLabels) as AccountType[]).map((value) => (
            <label
              key={value}
              className={cn(
                "relative flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                "has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              )}
            >
              <input type="radio" value={value} className="sr-only" {...register("type")} />
              {accountTypeLabels[value]}
            </label>
          ))}
        </div>
      </FieldSet>
    </>
  );
}

function FormActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </DialogFooter>
  );
}
