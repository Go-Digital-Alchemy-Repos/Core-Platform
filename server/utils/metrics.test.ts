import { describe, expect, it } from "vitest";
import { getMetricsSnapshot, recordDomainOutcome } from "./metrics";

describe("domain metrics", () => {
  it("records aggregate outcomes without accepting unsafe names or counts", () => {
    const before = getMetricsSnapshot().domains.checkout?.created ?? 0;

    recordDomainOutcome("checkout", "created", 2);
    recordDomainOutcome("checkout", "failed", 1);
    recordDomainOutcome("checkout", "unsafe-value", 1);
    recordDomainOutcome("checkout", "created", 0);

    expect(getMetricsSnapshot().domains.checkout).toMatchObject({
      created: before + 2,
      failed: 1,
    });
    expect(getMetricsSnapshot().domains.checkout).not.toHaveProperty("unsafe-value");
  });
});
