/** The part of the Web Storage API we use; tests pass an in-memory fake. */
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type StorageFailure = {
  reason: "unavailable" | "denied" | "quota" | "unknown";
  message: string;
};

export type ReadResult = { ok: true; value: string | null } | ({ ok: false } & StorageFailure);
export type WriteResult = { ok: true } | ({ ok: false } & StorageFailure);

/**
 * Turns a thrown storage error into a reason the UI can explain. Browsers
 * throw SecurityError when storage is blocked (e.g. some private modes or
 * site settings) and QuotaExceededError when it's full.
 */
export function classifyStorageError(error: unknown): StorageFailure {
  const name = error instanceof Error || (typeof DOMException !== "undefined" && error instanceof DOMException)
    ? (error as { name: string }).name
    : "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return { reason: "quota", message: "Browser storage is full, so changes can't be saved." };
  }
  if (name === "SecurityError") {
    return { reason: "denied", message: "The browser blocked access to local storage, so changes can't be saved." };
  }
  return { reason: "unknown", message: "Saving to browser storage failed." };
}

/**
 * Returns window.localStorage, or a failure if it doesn't exist or merely
 * touching it throws (some browsers throw on property access when blocked).
 */
export function getBrowserStorage(): { ok: true; storage: StorageLike } | ({ ok: false } & StorageFailure) {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { ok: false, reason: "unavailable", message: "Local storage isn't available in this browser." };
    }
    return { ok: true, storage: window.localStorage };
  } catch (error) {
    const failure = classifyStorageError(error);
    return { ok: false, ...failure, reason: failure.reason === "unknown" ? "unavailable" : failure.reason };
  }
}

export function readItem(storage: StorageLike, key: string): ReadResult {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch (error) {
    return { ok: false, ...classifyStorageError(error) };
  }
}

export function writeItem(storage: StorageLike, key: string, value: string): WriteResult {
  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    return { ok: false, ...classifyStorageError(error) };
  }
}
