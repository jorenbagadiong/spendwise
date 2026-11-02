"use client";

import { useId, useState } from "react";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterXIcon,
  ReceiptTextIcon,
  SearchIcon,
  SearchXIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateLabel, formatMonthLabel, getSelectableMonths } from "@/lib/finance/months";
import {
  ALL,
  areFiltersEqual,
  DEFAULT_SORT,
  filterTransactions,
  formatTransactionAmount,
  getDefaultFilters,
  paginate,
  sortTransactions,
  type TransactionFilters,
  type TransactionSort,
} from "@/lib/finance/transactions";
import { cn } from "@/lib/utils";
import type { Account, Category, IsoDate, Transaction } from "@/types/finance";

const PAGE_SIZE = 10;

const typeLabels: Record<Transaction["type"], string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

const typeStyles: Record<Transaction["type"], { badge: string; amount: string }> = {
  income: { badge: "bg-income/10 text-income", amount: "text-income" },
  expense: { badge: "bg-expense/10 text-expense", amount: "text-expense" },
  transfer: { badge: "bg-muted text-muted-foreground", amount: "text-muted-foreground" },
};

const sortOptions: { value: TransactionSort; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Highest amount" },
  { value: "amount-asc", label: "Lowest amount" },
];

type Option = { value: string; label: string };

type TransactionsViewProps = {
  accounts: readonly Account[];
  categories: readonly Category[];
  transactions: readonly Transaction[];
  /** Today in Asia/Manila, computed on the server so both renders agree. */
  today: IsoDate;
};

export function TransactionsView({
  accounts,
  categories,
  transactions,
  today,
}: TransactionsViewProps) {
  const searchId = useId();
  const defaultFilters = getDefaultFilters(today);
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [sort, setSort] = useState<TransactionSort>(DEFAULT_SORT);
  const [page, setPage] = useState(1);

  // Filtering, sorting, and paging are pure functions in lib/finance.
  const matching = filterTransactions(transactions, filters, categories);
  const sorted = sortTransactions(matching, sort);
  const pageData = paginate(sorted, page, PAGE_SIZE);

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const isDefault = areFiltersEqual(filters, defaultFilters);

  const monthOptions: Option[] = [
    { value: ALL, label: "All months" },
    ...getSelectableMonths(
      [...accounts.map((a) => a.openingDate), ...transactions.map((t) => t.date)],
      today,
    ).map((value) => ({ value, label: formatMonthLabel(value) })),
  ];
  const typeOptions: Option[] = [
    { value: ALL, label: "All types" },
    ...(["income", "expense", "transfer"] as const).map((value) => ({
      value,
      label: typeLabels[value],
    })),
  ];
  const accountOptions: Option[] = [
    { value: ALL, label: "All accounts" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];
  const categoryGroups = (["income", "expense"] as const).map((type) => ({
    label: type === "income" ? "Income" : "Expense",
    options: categories
      .filter((c) => c.type === type)
      .map((c) => ({ value: c.id, label: c.name })),
  }));

  function updateFilters(patch: Partial<TransactionFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(defaultFilters);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="sr-only">Filters</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={searchId} className="text-sm font-medium">
            Search
          </label>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={searchId}
              type="search"
              placeholder="Description or category"
              value={filters.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
              className="pl-8"
            />
          </div>
        </div>
        <FilterSelect
          label="Month"
          value={filters.month}
          options={monthOptions}
          onChange={(month) => updateFilters({ month })}
        />
        <FilterSelect
          label="Type"
          value={filters.type}
          options={typeOptions}
          onChange={(type) => updateFilters({ type: type as TransactionFilters["type"] })}
        />
        <FilterSelect
          label="Account"
          value={filters.accountId}
          options={accountOptions}
          onChange={(accountId) => updateFilters({ accountId })}
        />
        <FilterSelect
          label="Category"
          value={filters.categoryId}
          options={[{ value: ALL, label: "All categories" }]}
          groups={categoryGroups}
          onChange={(categoryId) => updateFilters({ categoryId })}
        />
        <FilterSelect
          label="Sort by"
          value={sort}
          options={sortOptions}
          onChange={(value) => {
            setSort(value as TransactionSort);
            setPage(1);
          }}
        />
      </div>

      <h2 className="sr-only">Results</h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {pageData.total === 1 ? "1 transaction" : `${pageData.total} transactions`}
          {filters.month !== ALL && ` in ${formatMonthLabel(filters.month)}`}
        </p>
        <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isDefault}>
          <FilterXIcon data-icon="inline-start" aria-hidden="true" />
          Clear filters
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
        {pageData.total === 0 ? (
          <EmptyResults
            transactions={transactions}
            filters={filters}
            defaultFilters={defaultFilters}
            onShowAllMonths={() => updateFilters({ month: ALL })}
            onClearFilters={clearFilters}
          />
        ) : (
          <>
            {/* Desktop and tablet: full table */}
            <Table className="hidden md:table">
              <TableCaption className="sr-only">
                Transactions, sorted by {sortOptions.find((o) => o.value === sort)?.label.toLowerCase()}.
                Showing {pageData.start} to {pageData.end} of {pageData.total}.
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="pr-4 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-4 text-muted-foreground tabular-nums">
                      <time dateTime={t.date}>{formatDateLabel(t.date)}</time>
                    </TableCell>
                    {/* Text columns wrap so the table fits narrow screens. */}
                    <TableCell className="min-w-40 font-medium whitespace-normal">
                      {t.description}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <CategoryName transaction={t} names={categoryNames} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <AccountNames transaction={t} names={accountNames} />
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={t.type} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "pr-4 text-right font-medium tabular-nums",
                        typeStyles[t.type].amount,
                      )}
                    >
                      {formatTransactionAmount(t)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Mobile: stacked list with the same information */}
            <ul aria-label="Transactions" className="divide-y divide-border md:hidden">
              {pageData.items.map((t) => (
                <li key={t.id} className="flex flex-col gap-1.5 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium [overflow-wrap:anywhere]">
                      {t.description}
                    </p>
                    <p
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        typeStyles[t.type].amount,
                      )}
                    >
                      {formatTransactionAmount(t)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <TypeBadge type={t.type} />
                    <time dateTime={t.date}>{formatDateLabel(t.date)}</time>
                    <span aria-hidden="true">·</span>
                    <CategoryName transaction={t} names={categoryNames} />
                    <span aria-hidden="true">·</span>
                    <AccountNames transaction={t} names={accountNames} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {pageData.total > 0 && (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <p className="text-sm text-muted-foreground">
            Showing {pageData.start}–{pageData.end} of {pageData.total}
          </p>
          {pageData.pageCount > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(pageData.page - 1)}
                disabled={pageData.page === 1}
                aria-label="Previous page"
              >
                <ChevronLeftIcon aria-hidden="true" />
              </Button>
              <span className="text-sm tabular-nums">
                Page {pageData.page} of {pageData.pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(pageData.page + 1)}
                disabled={pageData.page === pageData.pageCount}
                aria-label="Next page"
              >
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  groups = [],
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  groups?: { label: string; options: Option[] }[];
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const items = [...options, ...groups.flatMap((g) => g.options)];

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          // Only values from the option list are accepted.
          if (next !== null && items.some((item) => item.value === next)) onChange(next);
        }}
      >
        <SelectTrigger aria-labelledby={labelId} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          {groups.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TypeBadge({ type }: { type: Transaction["type"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium",
        typeStyles[type].badge,
      )}
    >
      {typeLabels[type]}
    </span>
  );
}

function CategoryName({
  transaction,
  names,
}: {
  transaction: Transaction;
  names: Map<string, string>;
}) {
  if (!transaction.categoryId) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">No category</span>
      </span>
    );
  }
  return <span>{names.get(transaction.categoryId) ?? "Unknown category"}</span>;
}

function AccountNames({
  transaction,
  names,
}: {
  transaction: Transaction;
  names: Map<string, string>;
}) {
  const source = names.get(transaction.accountId) ?? "Unknown account";
  if (transaction.type !== "transfer") return <span>{source}</span>;

  const destination = names.get(transaction.destinationAccountId) ?? "Unknown account";
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span>{source}</span>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">to</span>
      <span>{destination}</span>
    </span>
  );
}

function EmptyResults({
  transactions,
  filters,
  defaultFilters,
  onShowAllMonths,
  onClearFilters,
}: {
  transactions: readonly Transaction[];
  filters: TransactionFilters;
  defaultFilters: TransactionFilters;
  onShowAllMonths: () => void;
  onClearFilters: () => void;
}) {
  const search = filters.search.trim();
  const onlyMonthFiltered =
    !search &&
    filters.type === ALL &&
    filters.accountId === ALL &&
    filters.categoryId === ALL &&
    filters.month !== ALL;

  let icon: LucideIcon = FilterXIcon;
  let title = "No transactions match these filters";
  let description = "Try changing or clearing the filters.";
  let action: { label: string; onClick: () => void } | null = {
    label: "Clear filters",
    onClick: onClearFilters,
  };

  if (transactions.length === 0) {
    icon = ReceiptTextIcon;
    title = "No transactions yet";
    description = "Recorded income, expenses, and transfers will appear here.";
    action = null;
  } else if (onlyMonthFiltered) {
    icon = ReceiptTextIcon;
    title = `No transactions in ${formatMonthLabel(filters.month)}`;
    description = "Choose another month, or view transactions from all months.";
    action = { label: "Show all months", onClick: onShowAllMonths };
  } else if (search) {
    icon = SearchXIcon;
    title = `No results for “${search}”`;
    description = "Search matches transaction descriptions and category names.";
  }

  // Clearing would change nothing if the filters are already the defaults.
  if (action?.label === "Clear filters" && areFiltersEqual(filters, defaultFilters)) {
    action = null;
  }

  const Icon = icon;
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
