import { beforeEach, describe, expect, it } from "vitest";

import type { StorageLike } from "@/lib/persistence/storage";
import { createProfileController } from "@/lib/profile/controller";
import { PROFILE_STORAGE_KEY, type LocalProfile } from "@/lib/profile/profile";

class FakeStorage implements StorageLike {
  values = new Map<string, string>();
  failGet: Error | null = null;
  failSet: Error | null = null;
  getItem(key: string) {
    if (this.failGet) throw this.failGet;
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failSet) throw this.failSet;
    this.values.set(key, value);
  }
}

const profile: LocalProfile = {
  profileSchemaVersion: 1,
  fullName: "Juan dela Cruz",
  workspaceMode: "demo",
  privacyAcknowledgedAt: "2026-11-02T01:00:00.000Z",
  onboardingCompletedAt: "2026-11-02T01:00:05.000Z",
};

let storage: FakeStorage;
beforeEach(() => {
  storage = new FakeStorage();
});

const stored = () => JSON.parse(storage.values.get(PROFILE_STORAGE_KEY) ?? "null");

describe("profile controller", () => {
  it("starts loading, then reports a missing profile without writing", () => {
    const controller = createProfileController({ storage });
    expect(controller.state.getState().status).toBe("loading");
    controller.initialize();
    expect(controller.state.getState()).toMatchObject({ status: "ready", profile: null, unreadable: false });
    expect(storage.values.size).toBe(0);
  });

  it("loads a saved profile once, even if initialized again", () => {
    storage.values.set(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    const controller = createProfileController({ storage });
    controller.initialize();
    storage.values.delete(PROFILE_STORAGE_KEY);
    controller.initialize();
    expect(controller.state.getState().profile).toEqual(profile);
  });

  it("flags an unreadable profile instead of using it", () => {
    storage.values.set(PROFILE_STORAGE_KEY, "{broken");
    const controller = createProfileController({ storage });
    controller.initialize();
    expect(controller.state.getState()).toMatchObject({ profile: null, unreadable: true });
    expect(storage.values.get(PROFILE_STORAGE_KEY)).toBe("{broken"); // untouched until onboarding saves
  });

  it("saves to storage first and only then updates state", () => {
    const controller = createProfileController({ storage });
    controller.initialize();
    expect(controller.save(profile)).toEqual({ ok: true });
    expect(stored()).toEqual(profile);
    expect(controller.state.getState().profile).toEqual(profile);
  });

  it("leaves state unchanged when a save fails", () => {
    const controller = createProfileController({ storage });
    controller.initialize();
    controller.save(profile);
    storage.failSet = new DOMException("full", "QuotaExceededError");
    expect(controller.updateName("Someone Else")).toEqual({ ok: false, message: "Browser storage is full, so changes can't be saved." });
    expect(controller.state.getState().profile?.fullName).toBe("Juan dela Cruz");
    expect(stored().fullName).toBe("Juan dela Cruz");
  });

  it("edits the name with the same validation as onboarding", () => {
    const controller = createProfileController({ storage });
    controller.initialize();
    controller.save(profile);
    expect(controller.updateName("   ")).toEqual({ ok: false, message: "Enter your name." });
    expect(controller.updateName("  Ñoño Santos ")).toEqual({ ok: true });
    expect(stored().fullName).toBe("Ñoño Santos");
    expect(stored().privacyAcknowledgedAt).toBe(profile.privacyAcknowledgedAt); // everything else kept
  });

  it("switches workspace mode and refuses changes without a profile", () => {
    const controller = createProfileController({ storage });
    controller.initialize();
    expect(controller.setWorkspaceMode("personal").ok).toBe(false);
    controller.save(profile);
    expect(controller.setWorkspaceMode("personal")).toEqual({ ok: true });
    expect(stored().workspaceMode).toBe("personal");
  });

  it("works in memory when storage is unavailable (decided on initialize, so server and browser renders match)", () => {
    const controller = createProfileController({ storage: null });
    expect(controller.state.getState().memoryOnly).toBe(false);
    controller.initialize();
    expect(controller.state.getState()).toMatchObject({ status: "ready", memoryOnly: true });
    expect(controller.save(profile)).toEqual({ ok: true });
    expect(controller.state.getState().profile).toEqual(profile);
  });

  it("treats a read failure as memory-only", () => {
    storage.failGet = new DOMException("blocked", "SecurityError");
    const controller = createProfileController({ storage });
    controller.initialize();
    expect(controller.state.getState()).toMatchObject({ status: "ready", profile: null, memoryOnly: true });
  });

  it("follows changes made in another tab", () => {
    const controller = createProfileController({ storage });
    controller.initialize();
    controller.handleExternalChange(JSON.stringify({ ...profile, fullName: "From Another Tab" }));
    expect(controller.state.getState().profile?.fullName).toBe("From Another Tab");
    controller.handleExternalChange(null);
    expect(controller.state.getState().profile).toBeNull();
  });
});
