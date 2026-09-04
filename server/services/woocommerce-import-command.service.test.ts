import { describe, expect, it } from "vitest";
import {
  WooImportCommandError,
  parseWooImportApplyCommand,
} from "./woocommerce-import-command.service";

const fingerprint = "a".repeat(64);

function validArgs() {
  return [
    "fixture.json",
    "--target-stack",
    "isolated-rehearsal",
    "--operator",
    "synthetic-operator",
    "--mode",
    "rehearsal",
    "--confirm-fingerprint",
    fingerprint,
    "--apply",
  ];
}

describe("WooCommerce durable apply command", () => {
  it("requires explicit rehearsal confirmation and returns bounded options", () => {
    expect(parseWooImportApplyCommand([...validArgs(), "--batch-size", "25"])).toEqual({
      inputPath: "fixture.json",
      targetStackId: "isolated-rehearsal",
      operatorReference: "synthetic-operator",
      confirmedFingerprint: fingerprint,
      batchSize: 25,
      resumeRunId: undefined,
      dispositionPath: undefined,
    });
  });

  it("fails closed without the apply flag or a rehearsal mode", () => {
    expect(() =>
      parseWooImportApplyCommand(validArgs().filter((arg) => arg !== "--apply")),
    ).toThrow(WooImportCommandError);
    const cutover = validArgs();
    cutover[cutover.indexOf("rehearsal")] = "cutover";
    expect(() => parseWooImportApplyCommand(cutover)).toThrow(/Only isolated rehearsal mode/);
  });

  it("rejects an unsafe fingerprint confirmation and batch size", () => {
    const invalidFingerprint = validArgs();
    invalidFingerprint[invalidFingerprint.indexOf(fingerprint)] = "not-a-digest";
    expect(() => parseWooImportApplyCommand(invalidFingerprint)).toThrow(/SHA-256/);
    expect(() => parseWooImportApplyCommand([...validArgs(), "--batch-size", "1001"])).toThrow(
      /between 1 and 1000/,
    );
  });

  it("accepts an explicit failed-run identifier only alongside the normal rehearsal guards", () => {
    expect(
      parseWooImportApplyCommand([...validArgs(), "--resume-run", "run-failed-1"]),
    ).toMatchObject({
      resumeRunId: "run-failed-1",
      targetStackId: "isolated-rehearsal",
      confirmedFingerprint: fingerprint,
    });
  });

  it("accepts a disposition schedule only as an explicit file argument", () => {
    expect(
      parseWooImportApplyCommand([...validArgs(), "--dispositions", "schedule.json"]),
    ).toMatchObject({ dispositionPath: "schedule.json" });
    expect(() => parseWooImportApplyCommand([...validArgs(), "--dispositions"])).toThrow(
      /requires a value/,
    );
  });

  it("rejects an empty or oversized resume-run identifier", () => {
    expect(() => parseWooImportApplyCommand([...validArgs(), "--resume-run", "   "])).toThrow(
      /non-empty value/,
    );
    expect(() =>
      parseWooImportApplyCommand([...validArgs(), "--resume-run", "a".repeat(201)]),
    ).toThrow(/at most 200 characters/);
  });

  it("rejects unknown, duplicate, and misplaced command arguments", () => {
    expect(() => parseWooImportApplyCommand([...validArgs(), "--typo"])).toThrow(
      /Unsupported command argument/,
    );
    expect(() => parseWooImportApplyCommand([...validArgs(), "--mode", "cutover"])).toThrow(
      /may be supplied only once/,
    );
    expect(() => parseWooImportApplyCommand([...validArgs(), "unexpected.json"])).toThrow(
      /Unsupported command argument/,
    );
  });
});
