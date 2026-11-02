import { z } from "zod";

import { REPORTING_TIME_ZONE } from "@/lib/finance/months";

// The local profile (SW-010): a name to personalize the app, the privacy
// acknowledgement, and which kind of workspace the financial data is. It's
// stored only in this browser, under its own key, separate from the
// financial snapshot. It's not an identity or a login: nothing verifies it,
// and nothing else references it, so it has no id.

export const PROFILE_STORAGE_KEY = "spendwise:profile:v1";
export const PROFILE_SCHEMA_VERSION = 1;
export const FULL_NAME_MAX_LENGTH = 80;

/**
 * "personal": the person's own records (also used for data of unknown
 * origin, e.g. saved before SW-010). "demo": the sample dataset was chosen.
 */
export type WorkspaceMode = "personal" | "demo";

export type LocalProfile = {
  profileSchemaVersion: typeof PROFILE_SCHEMA_VERSION;
  fullName: string;
  workspaceMode: WorkspaceMode;
  /** When the person ticked the local-storage acknowledgement (ISO timestamp). */
  privacyAcknowledgedAt: string;
  /** When onboarding finished (ISO timestamp). */
  onboardingCompletedAt: string;
};

// Unicode control characters (newlines, tabs, NUL…) don't belong in a name.
const CONTROL_CHARACTERS = /\p{Cc}/u;

/**
 * Full-name rules: trimmed, not blank, at most 80 characters (counted as
 * Unicode code points, so "Ñ" or "李" count as one), no control
 * characters. Any script is allowed.
 */
export const fullNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Enter your name.")
      .refine((value) => Array.from(value).length <= FULL_NAME_MAX_LENGTH, {
        message: `Use ${FULL_NAME_MAX_LENGTH} characters or fewer.`,
      })
      .refine((value) => !CONTROL_CHARACTERS.test(value), {
        message: "Use letters, spaces, and punctuation only.",
      }),
  );

/** Form schema for entering or editing the name. */
export const profileNameFormSchema = z.object({ fullName: fullNameSchema });
export type ProfileNameFormValues = z.input<typeof profileNameFormSchema>;

const storedProfileSchema = z.strictObject({
  profileSchemaVersion: z.literal(PROFILE_SCHEMA_VERSION),
  // Stored names must already be clean: nothing is trimmed or repaired on load.
  fullName: z.string().refine((value) => fullNameSchema.safeParse(value).data === value),
  workspaceMode: z.enum(["personal", "demo"]),
  privacyAcknowledgedAt: z.iso.datetime(),
  onboardingCompletedAt: z.iso.datetime(),
});

export type ProfileParseResult =
  | { kind: "valid"; profile: LocalProfile }
  | { kind: "missing" }
  | { kind: "invalid"; message: string };

/** Parses the stored profile. Never repairs anything. */
export function parseProfile(text: string | null): ProfileParseResult {
  if (text === null) return { kind: "missing" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { kind: "invalid", message: "The saved profile isn't valid JSON." };
  }
  const parsed = storedProfileSchema.safeParse(value);
  if (!parsed.success) {
    return { kind: "invalid", message: "The saved profile isn't in a format this version can read." };
  }
  return { kind: "valid", profile: parsed.data };
}

export function createProfile(input: {
  fullName: string;
  workspaceMode: WorkspaceMode;
  privacyAcknowledgedAt: string;
  now: Date;
}): LocalProfile {
  return {
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    fullName: fullNameSchema.parse(input.fullName),
    workspaceMode: input.workspaceMode,
    privacyAcknowledgedAt: input.privacyAcknowledgedAt,
    onboardingCompletedAt: input.now.toISOString(),
  };
}

export type TimeOfDay = "morning" | "afternoon" | "evening";

/**
 * Time of day in Asia/Manila (the app's reporting time zone): morning
 * 5:00–11:59, afternoon 12:00–17:59, evening otherwise. Computed on the
 * server per request and passed to the page, so the greeting is the same in
 * the server HTML and the browser (no hydration mismatch).
 */
export function getTimeOfDayInManila(now: Date = new Date()): TimeOfDay {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: REPORTING_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export function formatGreeting(timeOfDay: TimeOfDay, fullName: string | null): string {
  const greeting = { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" }[timeOfDay];
  return fullName ? `${greeting}, ${fullName}!` : `${greeting}!`;
}
