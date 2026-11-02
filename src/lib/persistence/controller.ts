import { createStore, type StoreApi } from "zustand/vanilla";

import {
  createRevision as defaultCreateRevision,
  createSnapshot,
  parseSnapshot,
  readRevision,
  STORAGE_KEY,
  type FinancialData,
  type FinancialSnapshot,
} from "@/lib/persistence/snapshot";
import {
  readItem,
  writeItem,
  type StorageFailure,
  type StorageLike,
} from "@/lib/persistence/storage";
import type { AccountStoreApi } from "@/stores/account-store";
import type { CategoryStoreApi } from "@/stores/category-store";
import type { TransactionStoreApi } from "@/stores/transaction-store";

export type LoadError = {
  kind: "invalid-json" | "unsupported-version" | "invalid-data";
  message: string;
  problems: string[];
  /** The original stored text, kept untouched so it can be downloaded. */
  raw: string;
};

export type SaveState =
  /** Before loading finishes. */
  | { kind: "idle" }
  /** Everything on screen is in storage. */
  | { kind: "saved"; at: string }
  /** The last write failed (e.g. storage full). The next change retries. */
  | { kind: "failed"; reason: StorageFailure["reason"]; message: string }
  /** Storage can't be used at all; data lives in this tab only. */
  | { kind: "unavailable"; message: string }
  /** Another tab changed the saved data; writes stop until reloaded. */
  | { kind: "conflict"; message: string };

export type PersistenceState = {
  status: "loading" | "ready" | "load-error";
  /** Where the current data came from ("seeded" = the demo dataset was just written). */
  source: "saved" | "seeded" | "memory" | null;
  /**
   * "missing" until a workspace exists: nothing was saved yet (first visit),
   * or storage couldn't be read. Nothing is saved while it's missing; the
   * onboarding flow creates the workspace with `createWorkspace`.
   */
  workspace: "missing" | "present";
  loadError: LoadError | null;
  saveState: SaveState;
};

export type CommitResult = { ok: true } | { ok: false; message: string };

type Stores = {
  accounts: AccountStoreApi;
  categories: CategoryStoreApi;
  transactions: TransactionStoreApi;
};

type ControllerOptions = {
  stores: Stores;
  /** null when storage can't be used; `unavailableMessage` explains why. */
  storage: StorageLike | null;
  unavailableMessage?: string;
  /** The demo dataset, offered by the recovery screen ("Replace with demo data"). */
  seed: FinancialData;
  now?: () => Date;
  createRevision?: () => string;
};

const CONFLICT_MESSAGE =
  "Your data was changed in another tab or window. Changes in this tab are no longer being saved, so they can't overwrite the newer data.";

/**
 * The single persistence boundary between the Zustand stores and
 * localStorage. It:
 * - loads storage once; when nothing is saved it writes nothing and waits
 *   for onboarding to create a workspace (SW-010: no automatic demo data);
 * - saves one complete snapshot after every successful store change;
 * - never writes when storage couldn't be read, when another tab has saved
 *   newer data, or when storage is unavailable;
 * - applies restores and clears to storage first and to the stores only if
 *   the write succeeded, so they can't half-happen.
 */
export function createPersistenceController({
  stores,
  storage,
  unavailableMessage = "Local storage isn't available, so changes only last until this tab is closed.",
  seed,
  now = () => new Date(),
  createRevision = defaultCreateRevision,
}: ControllerOptions) {
  const state: StoreApi<PersistenceState> = createStore<PersistenceState>()(() => ({
    status: "loading",
    source: null,
    workspace: "missing",
    loadError: null,
    saveState: { kind: "idle" },
  }));

  let initialized = false;
  /** Revision this tab last read or wrote; another value in storage means another tab wrote. */
  let lastRevision: string | null = null;
  /** True while the controller itself replaces store data (no save needed). */
  let applying = false;

  const setStatus = (patch: Partial<PersistenceState>) => state.setState(patch);

  function getCurrentData(): FinancialData {
    return {
      accounts: stores.accounts.getState().accounts,
      categories: stores.categories.getState().categories,
      transactions: stores.transactions.getState().transactions,
    };
  }

  function applyData(data: FinancialData) {
    applying = true;
    try {
      stores.accounts.setState({ accounts: [...data.accounts] });
      stores.categories.setState({ categories: [...data.categories] });
      stores.transactions.setState({ transactions: [...data.transactions] });
    } finally {
      applying = false;
    }
  }

  /** Writes `data` as a new revision. Unless `force`, refuses if another tab wrote since our last read. */
  function write(data: FinancialData, { force = false } = {}): CommitResult {
    if (!storage) return { ok: false, message: unavailableMessage };

    if (!force) {
      const current = readItem(storage, STORAGE_KEY);
      if (!current.ok) {
        setStatus({ saveState: { kind: "failed", reason: current.reason, message: current.message } });
        return { ok: false, message: current.message };
      }
      if (readRevision(current.value) !== lastRevision) {
        setStatus({ saveState: { kind: "conflict", message: CONFLICT_MESSAGE } });
        return { ok: false, message: CONFLICT_MESSAGE };
      }
    }

    const snapshot = createSnapshot(data, { revision: createRevision(), now: now() });
    const result = writeItem(storage, STORAGE_KEY, JSON.stringify(snapshot));
    if (!result.ok) {
      setStatus({ saveState: { kind: "failed", reason: result.reason, message: result.message } });
      return { ok: false, message: result.message };
    }
    lastRevision = snapshot.revision;
    setStatus({ saveState: { kind: "saved", at: snapshot.updatedAt } });
    return { ok: true };
  }

  /** Called after any store change made by the app (not by the controller). */
  function persistCurrent() {
    const { status, saveState, workspace } = state.getState();
    if (status !== "ready" || workspace === "missing") return;
    // Writes stay blocked until the person reloads or storage becomes usable.
    if (saveState.kind === "conflict" || saveState.kind === "unavailable") return;
    write(getCurrentData());
  }

  const EMPTY: FinancialData = { accounts: [], categories: [], transactions: [] };

  /**
   * Replaces the whole workspace (restore, clear, clear demo data). Storage
   * is written first, with the same other-tab check as every save; the
   * stores change only if that succeeds, so a failure leaves everything as
   * it was.
   */
  function replaceWorkspace(data: FinancialData): CommitResult {
    if (state.getState().status !== "ready") return { ok: false, message: "Data isn't loaded." };
    const result = write(data);
    if (result.ok) {
      applyData(data);
      setStatus({ workspace: "present", source: "saved" });
    }
    return result;
  }

  /** Reads storage and loads it. Never writes: a missing workspace stays missing. */
  function load() {
    if (!storage) {
      applyData(EMPTY);
      setStatus({
        status: "ready",
        source: "memory",
        workspace: "missing",
        loadError: null,
        saveState: { kind: "unavailable", message: unavailableMessage },
      });
      return;
    }

    const read = readItem(storage, STORAGE_KEY);
    if (!read.ok) {
      applyData(EMPTY);
      setStatus({
        status: "ready",
        source: "memory",
        workspace: "missing",
        loadError: null,
        saveState: { kind: "unavailable", message: `${read.message} Changes only last until this tab is closed.` },
      });
      return;
    }

    if (read.value === null) {
      // Nothing saved yet (first visit, or site data was cleared). Nothing is
      // written until onboarding creates a workspace.
      applyData(EMPTY);
      lastRevision = null;
      setStatus({ status: "ready", source: null, workspace: "missing", loadError: null, saveState: { kind: "idle" } });
      return;
    }

    const parsed = parseSnapshot(read.value);
    if (parsed.kind !== "valid") {
      // Keep the stored value untouched and show the recovery screen.
      applyData({ accounts: [], categories: [], transactions: [] });
      setStatus({
        status: "load-error",
        source: null,
        workspace: "present",
        loadError: {
          kind: parsed.kind,
          message: parsed.message,
          problems: parsed.kind === "invalid-data" ? parsed.problems : [],
          raw: read.value,
        },
        saveState: { kind: "idle" },
      });
      return;
    }

    applyData(parsed.snapshot.data);
    lastRevision = parsed.snapshot.revision;
    setStatus({
      status: "ready",
      source: "saved",
      workspace: "present",
      loadError: null,
      saveState: { kind: "saved", at: parsed.snapshot.updatedAt },
    });
  }

  return {
    state,

    /** Loads storage once. Safe to call again (e.g. React Strict Mode). */
    initialize() {
      if (initialized) return;
      initialized = true;
      load();
    },

    /** Starts saving after store changes. Returns a function that stops it. */
    connect() {
      const unsubscribers = [
        stores.accounts.subscribe((next, prev) => {
          if (!applying && next.accounts !== prev.accounts) persistCurrent();
        }),
        stores.categories.subscribe((next, prev) => {
          if (!applying && next.categories !== prev.categories) persistCurrent();
        }),
        stores.transactions.subscribe((next, prev) => {
          if (!applying && next.transactions !== prev.transactions) persistCurrent();
        }),
      ];
      return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    },

    /** Re-reads storage, replacing this tab's data. Resolves conflicts and retries failed loads. */
    reload() {
      load();
    },

    /** Another tab wrote the key (from the window "storage" event). */
    handleExternalChange(newValue: string | null) {
      const { status, workspace } = state.getState();
      if (status !== "ready" || !storage) return;
      if (readRevision(newValue) === lastRevision) return;
      // This tab has no workspace yet (e.g. still onboarding), so there's
      // nothing to lose: adopt what the other tab saved.
      if (workspace === "missing") {
        load();
        return;
      }
      setStatus({ saveState: { kind: "conflict", message: CONFLICT_MESSAGE } });
    },

    getCurrentData,

    /** A complete snapshot of what this tab currently shows (for backups). */
    exportSnapshot(): FinancialSnapshot {
      return createSnapshot(getCurrentData(), { revision: lastRevision ?? createRevision(), now: now() });
    },

    /**
     * Creates the first workspace (end of onboarding): empty, starter
     * categories, or demo data. Refuses if a workspace already exists, or if
     * another tab saved data in the meantime, so it can never overwrite
     * saved records. Without usable storage the data lives in this tab only.
     */
    createWorkspace(data: FinancialData, { demo = false }: { demo?: boolean } = {}): CommitResult {
      const { status, workspace, saveState } = state.getState();
      if (status !== "ready") return { ok: false, message: "Data isn't loaded." };
      if (workspace === "present") return { ok: false, message: "A workspace already exists in this browser." };
      if (!storage || saveState.kind === "unavailable") {
        applyData(data);
        setStatus({ workspace: "present", source: "memory" });
        return { ok: true };
      }
      const result = write(data);
      if (result.ok) {
        applyData(data);
        setStatus({ workspace: "present", source: demo ? "seeded" : "saved" });
      }
      return result;
    },

    replaceWorkspace,

    /** Replaces all data with a validated backup (see replaceWorkspace). */
    restore(snapshot: FinancialSnapshot): CommitResult {
      return replaceWorkspace(snapshot.data);
    },

    /** Saves an empty dataset (which stays empty: demo data is never re-added). */
    clearAll(): CommitResult {
      return replaceWorkspace(EMPTY);
    },

    /**
     * From the recovery screen only: overwrite unreadable saved data with
     * demo or empty data. The person has been told to download it first.
     */
    replaceUnreadableData(kind: "demo" | "empty"): CommitResult {
      if (state.getState().status !== "load-error") return { ok: false, message: "Saved data isn't in an error state." };
      const data: FinancialData = kind === "demo" ? seed : EMPTY;
      const result = write(data, { force: true });
      if (result.ok) {
        applyData(data);
        setStatus({ status: "ready", source: kind === "demo" ? "seeded" : "saved", workspace: "present", loadError: null });
      }
      return result;
    },
  };
}

export type PersistenceController = ReturnType<typeof createPersistenceController>;

/** What the person can do about the current save state (shown in Settings). */
export function getStorageGuidance(saveState: SaveState): string | null {
  switch (saveState.kind) {
    case "idle":
    case "saved":
      return null;
    case "failed":
      return saveState.reason === "quota"
        ? "Export a backup now. Then free up space by clearing other sites' data in your browser settings, or clear this app's data and restore the backup."
        : "Export a backup now. Check that this site is allowed to store data (it may be blocked by privacy settings or an extension), then make any change to try saving again.";
    case "unavailable":
      return "Export a backup before closing this tab. To save data between visits, allow this site to store data or leave private browsing, then reload.";
    case "conflict":
      return "Download this tab's data if you want to keep its changes, then use “Load latest data” in the message at the top of the page.";
  }
}
