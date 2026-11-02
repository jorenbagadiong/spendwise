import { z } from "zod";

import { ACCOUNT_NAME_MAX_LENGTH } from "@/lib/finance/accounts";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_NAME_MAX_LENGTH,
} from "@/lib/finance/categories";
import { isValidIsoDate } from "@/lib/finance/months";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/finance/transaction-form";
import { validateTransaction } from "@/lib/finance/validation";
import type { Account, Category, Transaction } from "@/types/finance";

/** One key holds the whole dataset, so a save is a single atomic write. */
export const STORAGE_KEY = "spendwise:financial-data:v1";
export const SCHEMA_VERSION = 1;

/** The records needed to rebuild the app. Nothing derived (balances, totals, counts) is stored. */
export type FinancialData = {
  accounts: readonly Account[];
  categories: readonly Category[];
  transactions: readonly Transaction[];
};

export type FinancialSnapshot = {
  schemaVersion: typeof SCHEMA_VERSION;
  /** Changes on every save; used to detect writes from other tabs. */
  revision: string;
  /** ISO timestamp of the save. */
  updatedAt: string;
  data: FinancialData;
};

export function createRevision(): string {
  // crypto.randomUUID needs a secure context (https or localhost).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSnapshot(
  data: FinancialData,
  { revision = createRevision(), now = new Date() }: { revision?: string; now?: Date } = {},
): FinancialSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision,
    updatedAt: now.toISOString(),
    data: {
      accounts: [...data.accounts],
      categories: [...data.categories],
      transactions: [...data.transactions],
    },
  };
}

// ---------------------------------------------------------------------------
// Record schemas. Strict objects reject unknown fields; nothing is coerced.

/** Non-blank text up to `max` characters. Checked as-is: nothing is trimmed or rewritten. */
const text = (max: number) =>
  z.string().max(max).refine((value) => value.trim().length > 0, "Can't be blank.");
const id = text(100);
const isoDate = z.string().refine(isValidIsoDate, "Must be a real calendar date (YYYY-MM-DD).");
const centavos = z
  .number()
  .refine(Number.isSafeInteger, "Must be a whole number of centavos.");
const positiveCentavos = centavos.refine((n) => n > 0, "Must be greater than zero.");

const accountSchema = z.strictObject({
  id,
  name: text(ACCOUNT_NAME_MAX_LENGTH),
  type: z.enum(["bank", "e_wallet", "cash"]),
  openingBalance: centavos.refine((n) => n >= 0, "Can't be negative."),
  openingDate: isoDate,
  isActive: z.boolean(),
});

const categorySchema = z.strictObject({
  id,
  name: text(CATEGORY_NAME_MAX_LENGTH),
  type: z.enum(["income", "expense"]),
  icon: z.enum(CATEGORY_ICONS),
  color: z.enum(CATEGORY_COLORS),
  isActive: z.boolean(),
});

const transactionBase = {
  id,
  amount: positiveCentavos,
  date: isoDate,
  description: text(DESCRIPTION_MAX_LENGTH),
  accountId: id,
};

const transactionSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...transactionBase, type: z.literal("income"), categoryId: id }),
  z.strictObject({ ...transactionBase, type: z.literal("expense"), categoryId: id }),
  z.strictObject({ ...transactionBase, type: z.literal("transfer"), destinationAccountId: id }),
]);

const snapshotSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  revision: z.string().min(1),
  updatedAt: z.iso.datetime(),
  data: z.strictObject({
    accounts: z.array(accountSchema),
    categories: z.array(categorySchema),
    transactions: z.array(transactionSchema),
  }),
});

// ---------------------------------------------------------------------------
// Whole-dataset rules that single records can't check.

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/**
 * Returns human-readable integrity problems: duplicate ids or names, and
 * transactions whose accounts or categories are missing, of the wrong type,
 * or dated before an account opened. Archived references are valid.
 */
export function checkDataIntegrity(data: FinancialData): string[] {
  const problems: string[] = [];

  for (const dup of findDuplicates(data.accounts.map((a) => a.id))) {
    problems.push(`Duplicate account id “${dup}”.`);
  }
  for (const dup of findDuplicates(data.categories.map((c) => c.id))) {
    problems.push(`Duplicate category id “${dup}”.`);
  }
  for (const dup of findDuplicates(data.transactions.map((t) => t.id))) {
    problems.push(`Duplicate transaction id “${dup}”.`);
  }
  for (const dup of findDuplicates(data.accounts.map((a) => a.name.trim().toLowerCase()))) {
    problems.push(`Duplicate account name “${dup}”.`);
  }
  for (const dup of findDuplicates(data.categories.map((c) => `${c.type}: ${c.name.trim().toLowerCase()}`))) {
    problems.push(`Duplicate category name “${dup}”.`);
  }

  for (const transaction of data.transactions) {
    for (const issue of validateTransaction(transaction, data.accounts, data.categories)) {
      problems.push(`Transaction “${transaction.id}”: ${issue.message}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Parsing a stored or uploaded value.

export type ParseResult =
  | { kind: "valid"; snapshot: FinancialSnapshot }
  | { kind: "invalid-json"; message: string }
  | { kind: "unsupported-version"; version: unknown; message: string }
  | { kind: "invalid-data"; message: string; problems: string[] };

const MAX_PROBLEMS = 20;

/**
 * Parses and fully validates a snapshot from text. Never repairs, drops, or
 * coerces anything: the result is either a valid snapshot or a reason why not.
 */
export function parseSnapshot(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { kind: "invalid-json", message: "The saved data isn't valid JSON." };
  }

  const version =
    typeof value === "object" && value !== null && "schemaVersion" in value
      ? (value as { schemaVersion: unknown }).schemaVersion
      : undefined;
  if (version !== SCHEMA_VERSION) {
    return {
      kind: "unsupported-version",
      version,
      message:
        version === undefined
          ? "The data has no schema version, so it isn't a Spend Wise snapshot."
          : `The data uses schema version ${JSON.stringify(version)}, but this app reads version ${SCHEMA_VERSION}.`,
    };
  }

  const parsed = snapshotSchema.safeParse(value);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .slice(0, MAX_PROBLEMS)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    return { kind: "invalid-data", message: "Some saved records are invalid.", problems };
  }

  const problems = checkDataIntegrity(parsed.data.data);
  if (problems.length > 0) {
    return {
      kind: "invalid-data",
      message: "The saved records don't fit together.",
      problems: problems.slice(0, MAX_PROBLEMS),
    };
  }

  return { kind: "valid", snapshot: parsed.data as FinancialSnapshot };
}

/** Reads just the revision of a stored value, or null if it can't be read. */
export function readRevision(text: string | null): string | null {
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && "revision" in value
      ? String((value as { revision: unknown }).revision)
      : null;
  } catch {
    return null;
  }
}
