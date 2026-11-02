import { describe, expect, it } from "vitest";

import { nextSequentialId } from "@/lib/ids";

describe("nextSequentialId", () => {
  it("starts at 001 and continues after the highest number", () => {
    expect(nextSequentialId("acct", [])).toBe("acct-001");
    expect(nextSequentialId("acct", ["acct-001", "acct-007"])).toBe("acct-008");
  });

  it("ignores ids with other prefixes or formats", () => {
    expect(nextSequentialId("acct", ["bpi-savings", "txn-050", "acct-x"])).toBe("acct-001");
  });

  it("handles numbers past 999", () => {
    expect(nextSequentialId("txn", ["txn-999"])).toBe("txn-1000");
  });
});
