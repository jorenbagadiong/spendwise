/**
 * Next id in a "<prefix>-001" sequence: one more than the highest existing
 * number with that prefix, skipping any id already taken. Deterministic, so
 * tests and server/client renders always agree. Ids that don't follow the
 * pattern (e.g. "bpi-savings") are kept but don't affect numbering.
 */
export function nextSequentialId(prefix: string, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds);
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let next = 1;
  for (const id of taken) {
    const match = pattern.exec(id);
    if (match) next = Math.max(next, Number(match[1]) + 1);
  }

  const format = (n: number) => `${prefix}-${String(n).padStart(3, "0")}`;
  while (taken.has(format(next))) next += 1;
  return format(next);
}
