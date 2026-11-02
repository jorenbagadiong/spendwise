import { describe, expect, it } from "vitest";

import {
  createProfile,
  formatGreeting,
  fullNameSchema,
  getTimeOfDayInManila,
  parseProfile,
  PROFILE_SCHEMA_VERSION,
  type LocalProfile,
} from "@/lib/profile/profile";

const valid: LocalProfile = {
  profileSchemaVersion: PROFILE_SCHEMA_VERSION,
  fullName: "Juan dela Cruz",
  workspaceMode: "personal",
  privacyAcknowledgedAt: "2026-11-02T01:00:00.000Z",
  onboardingCompletedAt: "2026-11-02T01:00:05.000Z",
};

const nameError = (value: string) => fullNameSchema.safeParse(value).error?.issues[0].message;

describe("full name", () => {
  it("trims leading and trailing whitespace", () => {
    expect(fullNameSchema.parse("  Maria Clara  ")).toBe("Maria Clara");
  });

  it("is required and rejects whitespace-only values", () => {
    expect(nameError("")).toBe("Enter your name.");
    expect(nameError("     ")).toBe("Enter your name.");
  });

  it("accepts Unicode names in any script", () => {
    for (const name of ["José Rizal", "Ñora Peñafiel", "Nguyễn Thị Minh", "李小龍", "Zoë O'Brien-Smith", "Ana 🌸"]) {
      expect(fullNameSchema.parse(name)).toBe(name);
    }
  });

  it("allows up to 80 characters, counting each Unicode character once", () => {
    expect(fullNameSchema.parse("a".repeat(80))).toHaveLength(80);
    expect(nameError("a".repeat(81))).toBe("Use 80 characters or fewer.");
    // 80 emoji are 160 UTF-16 code units but 80 characters.
    expect(fullNameSchema.safeParse("🌸".repeat(80)).success).toBe(true);
    expect(fullNameSchema.safeParse("🌸".repeat(81)).success).toBe(false);
  });

  it("rejects control characters such as line breaks", () => {
    expect(nameError("Juan\nCruz")).toBe("Use letters, spaces, and punctuation only.");
    expect(nameError("Juan\u0000")).toBe("Use letters, spaces, and punctuation only.");
  });
});

describe("parseProfile", () => {
  it("reports a missing profile", () => {
    expect(parseProfile(null)).toEqual({ kind: "missing" });
  });

  it("reads a valid profile", () => {
    expect(parseProfile(JSON.stringify(valid))).toEqual({ kind: "valid", profile: valid });
  });

  it("rejects invalid JSON, other versions, unknown fields, and unclean names without repairing them", () => {
    expect(parseProfile("{nope").kind).toBe("invalid");
    expect(parseProfile(JSON.stringify({ ...valid, profileSchemaVersion: 2 })).kind).toBe("invalid");
    expect(parseProfile(JSON.stringify({ ...valid, email: "x@example.com" })).kind).toBe("invalid");
    expect(parseProfile(JSON.stringify({ ...valid, fullName: "  padded " })).kind).toBe("invalid");
    expect(parseProfile(JSON.stringify({ ...valid, fullName: "" })).kind).toBe("invalid");
    expect(parseProfile(JSON.stringify({ ...valid, workspaceMode: "guest" })).kind).toBe("invalid");
    expect(parseProfile(JSON.stringify({ ...valid, privacyAcknowledgedAt: "yesterday" })).kind).toBe("invalid");
  });
});

describe("createProfile", () => {
  it("stores the trimmed name, mode, acknowledgement, and completion time", () => {
    const profile = createProfile({
      fullName: "  Ana Reyes ",
      workspaceMode: "demo",
      privacyAcknowledgedAt: "2026-11-02T01:00:00.000Z",
      now: new Date("2026-11-02T01:00:05.000Z"),
    });
    expect(profile).toEqual({
      profileSchemaVersion: 1,
      fullName: "Ana Reyes",
      workspaceMode: "demo",
      privacyAcknowledgedAt: "2026-11-02T01:00:00.000Z",
      onboardingCompletedAt: "2026-11-02T01:00:05.000Z",
    });
    expect(parseProfile(JSON.stringify(profile)).kind).toBe("valid");
  });
});

describe("greeting", () => {
  it("uses the time of day in Asia/Manila (UTC+8), not the machine's", () => {
    expect(getTimeOfDayInManila(new Date("2026-11-01T20:59:59Z"))).toBe("evening"); // 04:59 Manila
    expect(getTimeOfDayInManila(new Date("2026-11-01T21:00:00Z"))).toBe("morning"); // 05:00
    expect(getTimeOfDayInManila(new Date("2026-11-02T03:59:59Z"))).toBe("morning"); // 11:59
    expect(getTimeOfDayInManila(new Date("2026-11-02T04:00:00Z"))).toBe("afternoon"); // 12:00
    expect(getTimeOfDayInManila(new Date("2026-11-02T10:00:00Z"))).toBe("evening"); // 18:00
    expect(getTimeOfDayInManila(new Date("2026-11-02T16:00:00Z"))).toBe("evening"); // 00:00
  });

  it("greets by full name, or without one", () => {
    expect(formatGreeting("morning", "Alex")).toBe("Good morning, Alex!");
    expect(formatGreeting("evening", null)).toBe("Good evening!");
  });
});
