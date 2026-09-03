import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  parseWooImportApplyCommand,
  WooImportCommandError,
} from "../services/woocommerce-import-command.service";
import { applyWooCommercePlan } from "../services/woocommerce-import-repository.service";
import { buildWooCommerceCatalogPlan } from "../services/woocommerce-import.service";

async function main() {
  const command = parseWooImportApplyCommand(process.argv.slice(2));
  let input: unknown;
  try {
    input = JSON.parse(await readFile(path.resolve(command.inputPath), "utf8")) as unknown;
  } catch {
    throw new WooImportCommandError(
      "invalid_input",
      "The WooCommerce import envelope could not be read as JSON.",
    );
  }

  const plan = buildWooCommerceCatalogPlan(input);
  if (!plan.sourceStoreId || !plan.highWaterMark) {
    throw new WooImportCommandError(
      "invalid_plan",
      "The WooCommerce envelope does not contain a valid source identity and checkpoint.",
    );
  }
  if (plan.fingerprint !== command.confirmedFingerprint) {
    throw new WooImportCommandError(
      "fingerprint_not_confirmed",
      "The supplied confirmation does not match the planned source fingerprint.",
    );
  }

  const { createDrizzleWooImportRepository } =
    await import("../services/woocommerce-import-drizzle.repository");
  const result = await applyWooCommercePlan(createDrizzleWooImportRepository(), {
    plan,
    run: {
      contractVersion: plan.contractVersion,
      sourceStoreId: plan.sourceStoreId,
      targetStackId: command.targetStackId,
      sourceFingerprint: plan.fingerprint,
      highWaterMark: plan.highWaterMark,
      mode: "rehearsal",
      enabledPhases: [1],
      operatorReference: command.operatorReference,
    },
    batchSize: command.batchSize,
  });

  process.stdout.write(
    `${JSON.stringify({
      contract: plan.contract,
      contractVersion: plan.contractVersion,
      runId: result.runId,
      fingerprint: plan.fingerprint,
      reconciliation: result.reconciliation,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const safeError = {
    name: "WooImportApplyError",
    code: error instanceof WooImportCommandError ? error.code : "apply_failed",
    message:
      error instanceof WooImportCommandError
        ? error.message
        : "WooCommerce import failed without exposing source records.",
  };
  process.stderr.write(`${JSON.stringify(safeError)}\n`);
  process.exitCode = 1;
});
