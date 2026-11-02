import { createStore, type StoreApi } from "zustand/vanilla";

import { readItem, writeItem, type StorageLike } from "@/lib/persistence/storage";
import {
  fullNameSchema,
  parseProfile,
  PROFILE_STORAGE_KEY,
  type LocalProfile,
  type WorkspaceMode,
} from "@/lib/profile/profile";

export type ProfileState = {
  status: "loading" | "ready";
  /** null until onboarding completes (or when the saved profile can't be read). */
  profile: LocalProfile | null;
  /** True when a saved profile existed but couldn't be read; onboarding replaces it. */
  unreadable: boolean;
  /** True when there's no usable storage: the profile lasts only for this tab. */
  memoryOnly: boolean;
};

export type ProfileResult = { ok: true } | { ok: false; message: string };

/**
 * Loads and saves the local profile under its own storage key. Every change
 * is written to storage first and applied to state only if the write
 * succeeded, so the UI never reports a save that didn't happen. (Without
 * usable storage, changes apply in memory and `memoryOnly` says so.)
 *
 * Kept separate from the financial persistence controller: the profile is
 * small, changes rarely, and isn't part of financial backups, so it doesn't
 * need revisions or conflict handling. The last write wins, and other tabs
 * pick it up from the storage event.
 */
export function createProfileController({ storage }: { storage: StorageLike | null }) {
  const state: StoreApi<ProfileState> = createStore<ProfileState>()(() => ({
    status: "loading",
    profile: null,
    unreadable: false,
    // Decided in initialize(), which runs in the browser after hydration.
    // Deciding it here would differ between the server (no storage) and the
    // browser, and cause a hydration mismatch.
    memoryOnly: false,
  }));
  let initialized = false;

  function apply(text: string | null) {
    const parsed = parseProfile(text);
    state.setState({
      status: "ready",
      profile: parsed.kind === "valid" ? parsed.profile : null,
      unreadable: parsed.kind === "invalid",
    });
  }

  function save(profile: LocalProfile): ProfileResult {
    if (storage) {
      const result = writeItem(storage, PROFILE_STORAGE_KEY, JSON.stringify(profile));
      if (!result.ok) return { ok: false, message: result.message };
    }
    state.setState({ profile, unreadable: false });
    return { ok: true };
  }

  function change(patch: (profile: LocalProfile) => LocalProfile): ProfileResult {
    const current = state.getState().profile;
    if (!current) return { ok: false, message: "There's no profile yet." };
    return save(patch(current));
  }

  return {
    state,

    /** Reads the saved profile once. Safe to call repeatedly. */
    initialize() {
      if (initialized) return;
      initialized = true;
      if (!storage) {
        state.setState({ status: "ready", profile: null, unreadable: false, memoryOnly: true });
        return;
      }
      const read = readItem(storage, PROFILE_STORAGE_KEY);
      if (!read.ok) {
        state.setState({ status: "ready", profile: null, unreadable: false, memoryOnly: true });
        return;
      }
      apply(read.value);
    },

    /** Saves a complete profile (end of onboarding). */
    save,

    /** Changes the name. Invalid names are rejected, never trimmed silently into something else. */
    updateName(fullName: string): ProfileResult {
      const parsed = fullNameSchema.safeParse(fullName);
      if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
      return change((profile) => ({ ...profile, fullName: parsed.data }));
    },

    setWorkspaceMode(workspaceMode: WorkspaceMode): ProfileResult {
      return change((profile) => (profile.workspaceMode === workspaceMode ? profile : { ...profile, workspaceMode }));
    },

    /** Another tab changed (or removed) the profile. */
    handleExternalChange(newValue: string | null) {
      if (state.getState().status !== "ready" || state.getState().memoryOnly) return;
      apply(newValue);
    },
  };
}

export type ProfileController = ReturnType<typeof createProfileController>;
