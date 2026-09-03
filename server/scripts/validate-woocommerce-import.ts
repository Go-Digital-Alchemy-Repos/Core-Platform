import { chmod, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildWooCommerceCatalogPlan,
  buildWooCommerceDryRunReport,
} from "../services/woocommerce-import.service";

class WooImportValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function valueAfter(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath || inputPath.startsWith("--")) {
    throw new WooImportValidationError(
      "missing_input",
      "Usage: npm run migration:woocommerce:validate -- <envelope.json> [--report <report.json>]",
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(await readFile(path.resolve(inputPath), "utf8")) as unknown;
  } catch {
    throw new WooImportValidationError(
      "invalid_input",
      "The WooCommerce import envelope could not be read as JSON.",
    );
  }

  const report = buildWooCommerceDryRunReport(buildWooCommerceCatalogPlan(input));
  const output = `${JSON.stringify(report, null, 2)}\n`;
  process.stdout.write(output);

  const reportPath = valueAfter("--report");
  if (reportPath) {
    const absoluteReportPath = path.resolve(reportPath);
    await writeFile(absoluteReportPath, output, { mode: 0o600 });
    await chmod(absoluteReportPath, 0o600);
  }
  if (report.status === "blocked") process.exitCode = 2;
}

main().catch((error: unknown) => {
  const safeError = {
    name: "WooImportValidationError",
    code: error instanceof WooImportValidationError ? error.code : "unexpected_error",
    message:
      error instanceof WooImportValidationError
        ? error.message
        : "Validation failed without exposing source record details.",
  };
  process.stderr.write(`${JSON.stringify(safeError)}\n`);
  process.exitCode = 1;
});
