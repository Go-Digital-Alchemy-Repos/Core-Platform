import { describe, expect, it } from "vitest";
import {
  assertWooImportCanComplete,
  assertWooImportRunTransition,
  sanitizeWooImportFailureCode,
  validateBeginWooImportRun,
  wooImportSourceRef,
} from "./woocommerce-import-lifecycle.service";

const validRun = {
  contractVersion: "1.0.0",
  sourceStoreId: "better-farms-woo",
  targetStackId: "better-farms-staging",
  sourceFingerprint: "a".repeat(64),
  highWaterMark: "2026-09-03T16:00:00Z:4001",
  mode: "rehearsal" as const,
  enabledPhases: [1, 1],
  operatorReference: "migration-operator",
};

describe("WooCommerce import lifecycle contract", () => {
  it("normalizes an authorized phase-one rehearsal", () => {
    expect(validateBeginWooImportRun(validRun)).toMatchObject({
      enabledPhases: [1],
      sourceStoreId: "better-farms-woo",
    });
  });

  it("blocks durable customer, order, delta, and unknown contract requests", () => {
    expect(() => validateBeginWooImportRun({ ...validRun, enabledPhases: [1, 3] })).toThrow(
      /phase 3 is not enabled/,
    );
    expect(() => validateBeginWooImportRun({ ...validRun, contractVersion: "2.0.0" })).toThrow(
      /Unsupported WooCommerce import contract/,
    );
  });

  it("allows only explicit resumable and rollback lifecycle transitions", () => {
    expect(() => assertWooImportRunTransition("planned", "applying")).not.toThrow();
    expect(() => assertWooImportRunTransition("failed", "applying")).not.toThrow();
    expect(() => assertWooImportRunTransition("completed", "rollback_pending")).not.toThrow();
    expect(() => assertWooImportRunTransition("completed", "applying")).toThrow(
      /Invalid WooCommerce import run transition/,
    );
    expect(() => assertWooImportRunTransition("rolled_back", "applying")).toThrow(
      /Invalid WooCommerce import run transition/,
    );
  });

  it("requires complete record and monetary reconciliation before completion", () => {
    expect(() =>
      assertWooImportCanComplete({
        source: 4,
        planned: 4,
        applied: 2,
        matched: 1,
        excludedApproved: 1,
        quarantined: 0,
        unresolvedQuarantine: 0,
        moneyDifference: 0,
      }),
    ).not.toThrow();

    expect(() =>
      assertWooImportCanComplete({
        source: 4,
        planned: 4,
        applied: 3,
        matched: 0,
        excludedApproved: 0,
        quarantined: 1,
        unresolvedQuarantine: 1,
        moneyDifference: 0,
      }),
    ).toThrow(/unresolved quarantine/);
    expect(() =>
      assertWooImportCanComplete({
        source: 4,
        planned: 3,
        applied: 3,
        matched: 0,
        excludedApproved: 0,
        quarantined: 0,
        unresolvedQuarantine: 0,
        moneyDifference: 1,
      }),
    ).toThrow(/record reconciliation/);
  });

  it("keeps operational references and failure codes free of raw record values", () => {
    const sourceRef = wooImportSourceRef("customer", "private@example.test");
    expect(sourceRef).toMatch(/^[a-f0-9]{16}$/);
    expect(sourceRef).not.toContain("private");
    const failureCode = sanitizeWooImportFailureCode("Customer private@example.test failed");
    expect(failureCode).toMatch(/^import_failed_[a-f0-9]{12}$/);
    expect(failureCode).not.toContain("private");
    expect(sanitizeWooImportFailureCode("mapping_conflict")).toBe("mapping_conflict");
  });
});
