import { describe, expect, it } from "vitest";

import { getStorageGuidance } from "@/lib/persistence/controller";

describe("getStorageGuidance", () => {
  it("has no guidance when everything is saved", () => {
    expect(getStorageGuidance({ kind: "saved", at: "2026-11-02T00:00:00.000Z" })).toBeNull();
    expect(getStorageGuidance({ kind: "idle" })).toBeNull();
  });

  it("recommends a backup in every failure state", () => {
    for (const state of [
      { kind: "failed", reason: "quota", message: "" },
      { kind: "failed", reason: "denied", message: "" },
      { kind: "unavailable", message: "" },
    ] as const) {
      expect(getStorageGuidance(state)).toMatch(/backup/);
    }
    expect(getStorageGuidance({ kind: "failed", reason: "quota", message: "" })).toMatch(/free up space/);
    expect(getStorageGuidance({ kind: "conflict", message: "" })).toMatch(/Load latest data/);
  });
});
