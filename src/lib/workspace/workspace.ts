import { defaultCategories } from "@/data/default-categories";
import { mockAccounts, mockCategories, mockTransactions } from "@/data/mock-finance";
import type { PersistenceController, PersistenceState } from "@/lib/persistence/controller";
import type { FinancialData } from "@/lib/persistence/snapshot";
import type { ProfileController, ProfileState } from "@/lib/profile/controller";
import { createProfile, type WorkspaceMode } from "@/lib/profile/profile";

// Onboarding and workspace changes (SW-010). These coordinate the two
// controllers: financial data (one storage key) and the profile (another).
// Two keys can't be written atomically, so every step is ordered and safe
// to retry: the workspace is created first, then the profile is saved, and
// a retry skips whatever already succeeded.

/** A new personal workspace: starter categories, no accounts, no transactions. */
export function personalStarterData(): FinancialData {
  return { accounts: [], categories: [...defaultCategories], transactions: [] };
}

export function demoData(): FinancialData {
  return { accounts: [...mockAccounts], categories: [...mockCategories], transactions: [...mockTransactions] };
}

/**
 * Which onboarding (if any) to show:
 * - "loading": wait (no flash of onboarding for returning users).
 * - "none": onboarding is done and a workspace exists.
 * - "new-user": nothing saved → welcome, name, workspace choice, privacy.
 * - "existing-data": financial records are saved but there's no profile
 *   (saved before SW-010, or the profile was removed) → name, a choice to
 *   keep the saved data (default) or explicitly start fresh, and privacy.
 *   Kept records are untouched and treated as the person's own.
 * - "missing-workspace": the profile exists but no financial data is saved
 *   (e.g. that storage key was removed) → choose a workspace again.
 * Corrupt or unsupported financial data never reaches onboarding: the
 * recovery screen handles it ("blocked").
 */
export type OnboardingPlan = "loading" | "blocked" | "none" | "new-user" | "existing-data" | "missing-workspace";

export function getOnboardingPlan(finance: Pick<PersistenceState, "status" | "workspace">, profile: Pick<ProfileState, "status" | "profile">): OnboardingPlan {
  if (finance.status === "loading" || profile.status === "loading") return "loading";
  if (finance.status === "load-error") return "blocked";
  if (!profile.profile) return finance.workspace === "present" ? "existing-data" : "new-user";
  return finance.workspace === "present" ? "none" : "missing-workspace";
}

export type OnboardingChoices = {
  fullName: string;
  /** For a new workspace. Ignored when records are already saved. */
  workspaceMode: WorkspaceMode;
  privacyAcknowledged: boolean;
  /**
   * When records are already saved: "keep" (default) leaves them untouched;
   * "start-fresh" replaces them with a personal starter workspace. The UI
   * only sends "start-fresh" after an explicit confirmation.
   */
  existingData?: "keep" | "start-fresh";
};

export type StepResult = { ok: true } | { ok: false; message: string };

type Controllers = { finance: PersistenceController; profile: ProfileController; now?: () => Date };

/**
 * Finishes onboarding: creates the chosen workspace if none exists, then
 * saves the profile. Existing financial data is never replaced. Safe to
 * call again after a failure.
 */
export function completeOnboarding({ finance, profile, now = () => new Date() }: Controllers, choices: OnboardingChoices): StepResult {
  if (!choices.privacyAcknowledged) {
    return { ok: false, message: "Confirm that you understand how your data is stored." };
  }
  const financeState = finance.state.getState();
  if (financeState.status !== "ready") return { ok: false, message: "Your data isn't loaded yet." };

  let workspaceMode = choices.workspaceMode;
  if (financeState.workspace === "missing") {
    const data = workspaceMode === "demo" ? demoData() : personalStarterData();
    const created = finance.createWorkspace(data, { demo: workspaceMode === "demo" });
    if (!created.ok) return created;
  } else if (!profile.state.getState().profile) {
    if (choices.existingData === "start-fresh") {
      // Explicitly confirmed: replace everything (atomic, conflict-checked).
      // Safe to retry: replacing a starter workspace with another is a no-op.
      const replaced = finance.replaceWorkspace(personalStarterData());
      if (!replaced.ok) return { ok: false, message: `Nothing was changed. ${replaced.message}` };
      workspaceMode = "personal";
    } else {
      // Keep the data. It's the person's own unless it was the demo dataset
      // written moments ago by the recovery screen.
      workspaceMode = financeState.source === "seeded" ? "demo" : "personal";
    }
  }

  const existing = profile.state.getState().profile;
  const at = now();
  const next = existing
    ? { ...existing, workspaceMode }
    : createProfile({ fullName: choices.fullName, workspaceMode, privacyAcknowledgedAt: at.toISOString(), now: at });
  const saved = profile.save(next);
  if (!saved.ok) {
    return { ok: false, message: `Your workspace is ready, but your profile couldn't be saved: ${saved.message}` };
  }
  return { ok: true };
}

/**
 * "Clear demo data & start fresh": replaces the whole workspace (including
 * anything added or edited while exploring; records can't be told apart
 * reliably) with a personal starter workspace, then switches the profile
 * to personal. The name, acknowledgement, and theme are kept. The demo
 * data is never re-added afterwards.
 */
export function clearDemoData({ finance, profile }: Controllers): StepResult {
  const replaced = finance.replaceWorkspace(personalStarterData());
  if (!replaced.ok) return { ok: false, message: `Nothing was changed. ${replaced.message}` };
  return markPersonal(profile, "The demo data was removed, but switching to personal mode couldn't be saved");
}

/**
 * After any whole-workspace replacement with the person's own data (restore
 * or clear all), the workspace is no longer the demo.
 */
export function markPersonal(profile: ProfileController, failurePrefix = "The data was replaced, but the workspace mode couldn't be saved"): StepResult {
  if (!profile.state.getState().profile) return { ok: true };
  const result = profile.setWorkspaceMode("personal");
  return result.ok ? result : { ok: false, message: `${failurePrefix}: ${result.message}` };
}
