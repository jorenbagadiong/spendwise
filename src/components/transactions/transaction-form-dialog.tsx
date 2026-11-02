"use client";

import { useId, useMemo } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTransactionFormSchema,
  getEmptyFormValues,
  getFormValuesFromTransaction,
  type TransactionFormValues,
} from "@/lib/finance/transaction-form";
import { getAccountLabel, getSelectableAccounts } from "@/lib/finance/accounts";
import { cn } from "@/lib/utils";
import { useTransactionStore } from "@/stores/transaction-store-provider";
import type {
  Account,
  Category,
  IsoDate,
  Transaction,
  TransactionInput,
} from "@/types/finance";

type TransactionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The transaction to edit, or null to add a new one. */
  transaction: Transaction | null;
  accounts: readonly Account[];
  categories: readonly Category[];
  today: IsoDate;
  onSaved: (transaction: Transaction, action: "added" | "updated") => void;
};

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  ...formProps
}: TransactionFormDialogProps) {
  const isEditing = transaction !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details below. Totals and balances recalculate when you save."
              : "Record income, an expense, or a transfer between your accounts."}
          </DialogDescription>
        </DialogHeader>
        {/* The popup unmounts when closed, so each open starts a fresh form. */}
        <TransactionForm
          transaction={transaction}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          {...formProps}
        />
      </DialogContent>
    </Dialog>
  );
}

const typeOptions = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

function TransactionForm({
  transaction,
  accounts,
  categories,
  today,
  onSaved,
  onDone,
  onCancel,
}: Omit<TransactionFormDialogProps, "open" | "onOpenChange"> & {
  onDone: () => void;
  onCancel: () => void;
}) {
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const ids = {
    date: useId(),
    amount: useId(),
    description: useId(),
  };

  const schema = useMemo(
    () => createTransactionFormSchema(accounts, categories, { original: transaction }),
    [accounts, categories, transaction],
  );
  const form = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(schema),
    defaultValues: transaction
      ? getFormValuesFromTransaction(transaction)
      : getEmptyFormValues(today),
  });
  const { control, formState, register, handleSubmit, setValue, getValues, clearErrors, setError } = form;
  const type = useWatch({ control, name: "type" });

  // Active accounts, plus any archived account this transaction already uses.
  const activeAccounts = getSelectableAccounts(accounts, transaction).map((a) => ({
    value: a.id,
    label: getAccountLabel(a),
  }));
  const categoryOptions = categories
    .filter((c) => c.type === type)
    .map((c) => ({ value: c.id, label: c.name }));

  function handleTypeChange(next: Transaction["type"]) {
    // Clear selections that don't apply to the new type.
    const category = categories.find((c) => c.id === getValues("categoryId"));
    if (category && category.type !== next) setValue("categoryId", "");
    if (next !== "transfer") setValue("destinationAccountId", "");
    clearErrors(["categoryId", "destinationAccountId", "accountId"]);
  }

  function onSubmit(input: TransactionInput) {
    if (transaction) {
      const updated = updateTransaction(transaction.id, input);
      if (!updated) {
        setError("root", {
          message: "This transaction no longer exists. It may have been deleted.",
        });
        return;
      }
      onSaved(updated, "updated");
    } else {
      onSaved(addTransaction(input), "added");
    }
    onDone();
  }

  const accountLabel =
    type === "income" ? "Received in" : type === "expense" ? "Paid from" : "From account";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FieldGroup>
        <FieldSet>
          <FieldLegend variant="label">Type</FieldLegend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {typeOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                  "has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm",
                  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                )}
              >
                <input
                  type="radio"
                  value={option.value}
                  className="sr-only"
                  {...register("type", {
                    onChange: (event) => handleTypeChange(event.target.value),
                  })}
                />
                {option.label}
              </label>
            ))}
          </div>
        </FieldSet>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!formState.errors.date}>
            <FieldLabel htmlFor={ids.date}>Date</FieldLabel>
            <Input
              id={ids.date}
              type="date"
              aria-invalid={!!formState.errors.date}
              aria-describedby={`${ids.date}-error`}
              {...register("date")}
            />
            <FieldError id={`${ids.date}-error`} errors={[formState.errors.date]} />
          </Field>

          <Field data-invalid={!!formState.errors.amount}>
            <FieldLabel htmlFor={ids.amount}>Amount (₱)</FieldLabel>
            <Input
              id={ids.amount}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              aria-invalid={!!formState.errors.amount}
              aria-describedby={`${ids.amount}-error`}
              {...register("amount")}
            />
            <FieldError id={`${ids.amount}-error`} errors={[formState.errors.amount]} />
          </Field>
        </div>

        <Field data-invalid={!!formState.errors.description}>
          <FieldLabel htmlFor={ids.description}>Description</FieldLabel>
          <Input
            id={ids.description}
            autoComplete="off"
            placeholder="e.g. Groceries at SM"
            aria-invalid={!!formState.errors.description}
            aria-describedby={`${ids.description}-error`}
            {...register("description")}
          />
          <FieldError id={`${ids.description}-error`} errors={[formState.errors.description]} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            control={control}
            name="accountId"
            label={accountLabel}
            placeholder="Choose an account"
            options={activeAccounts}
          />
          {type === "transfer" ? (
            <SelectField
              control={control}
              name="destinationAccountId"
              label="To account"
              placeholder="Choose an account"
              options={activeAccounts}
            />
          ) : (
            <SelectField
              control={control}
              name="categoryId"
              label="Category"
              placeholder="Choose a category"
              options={categoryOptions}
            />
          )}
        </div>
      </FieldGroup>

      {formState.errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {formState.errors.root.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{transaction ? "Save changes" : "Add transaction"}</Button>
      </DialogFooter>
    </form>
  );
}

function SelectField({
  control,
  name,
  label,
  placeholder,
  options,
}: {
  control: Control<TransactionFormValues, unknown, TransactionInput>;
  name: "accountId" | "destinationAccountId" | "categoryId";
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const triggerId = useId();
  const labelId = useId();
  const errorId = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel id={labelId} htmlFor={triggerId}>
            {label}
          </FieldLabel>
          <Select
            items={options}
            value={field.value || null}
            onValueChange={(value) => field.onChange(value ?? "")}
          >
            <SelectTrigger
              id={triggerId}
              ref={field.ref}
              onBlur={field.onBlur}
              aria-labelledby={labelId}
              aria-invalid={fieldState.invalid}
              aria-describedby={errorId}
              className="w-full"
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError id={errorId} errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
