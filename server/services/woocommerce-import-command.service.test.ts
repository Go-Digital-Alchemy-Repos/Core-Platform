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
});
