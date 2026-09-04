export class WooImportCommandError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "WooImportCommandError";
  }
}

export interface WooImportApplyCommand {
  inputPath: string;
  targetStackId: string;
  operatorReference: string;
  confirmedFingerprint: string;
  batchSize: number;
  resumeRunId?: string;
  dispositionPath?: string;
}

function valueAfter(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new WooImportCommandError("missing_flag_value", `${flag} requires a value`);
  }
  return value;
}

function requiredValue(args: string[], flag: string) {
  const value = valueAfter(args, flag)?.trim();
  if (!value) throw new WooImportCommandError("missing_flag_value", `${flag} is required`);
  return value;
}

function optionalIdentifier(args: string[], flag: string) {
  const raw = valueAfter(args, flag);
  if (raw === undefined) return undefined;
  const value = raw.trim();
  if (!value || value.length > 200) {
    throw new WooImportCommandError(
      "invalid_flag_value",
      `${flag} must be a non-empty value of at most 200 characters`,
    );
  }
  return value;
}

/** Parse the deliberately narrow, rehearsal-only durable apply command. */
export function parseWooImportApplyCommand(args: string[]): WooImportApplyCommand {
  const inputPath = args[0];
  if (!inputPath || inputPath.startsWith("--")) {
    throw new WooImportCommandError(
      "missing_input",
      "Usage: migration:woocommerce:apply <envelope.json> --target-stack <id> --operator <ref> --mode rehearsal --confirm-fingerprint <sha256> --apply",
    );
  }
  if (!args.includes("--apply")) {
    throw new WooImportCommandError(
      "apply_not_confirmed",
      "--apply is required for durable import",
    );
  }
  const mode = requiredValue(args, "--mode");
  if (mode !== "rehearsal") {
    throw new WooImportCommandError(
      "unsupported_mode",
      "Only isolated rehearsal mode is enabled for WooCommerce durable apply",
    );
  }
  const confirmedFingerprint = requiredValue(args, "--confirm-fingerprint").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(confirmedFingerprint)) {
    throw new WooImportCommandError(
      "invalid_fingerprint",
      "--confirm-fingerprint must be a SHA-256 hex digest",
    );
  }
  const rawBatchSize = valueAfter(args, "--batch-size");
  const batchSize = rawBatchSize === undefined ? 100 : Number(rawBatchSize);
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new WooImportCommandError(
      "invalid_batch_size",
      "--batch-size must be an integer between 1 and 1000",
    );
  }
  return {
    inputPath,
    targetStackId: requiredValue(args, "--target-stack"),
    operatorReference: requiredValue(args, "--operator"),
    confirmedFingerprint,
    batchSize,
    resumeRunId: optionalIdentifier(args, "--resume-run"),
    dispositionPath: valueAfter(args, "--dispositions"),
  };
}
