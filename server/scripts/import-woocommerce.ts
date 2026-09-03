import { chmod, readFile, writeFile } from "fs/promises";
import path from "path";
import { loadLocalEnv } from "../load-env";
import {
  assertWooCommercePlanCanApply,
  buildWooCommerceCatalogPlan,
  type WooImportPlan,
} from "../services/woocommerce-import.service";

interface CliOptions {
  bundleFile?: string;
  categoryFile?: string;
  productFile?: string;
  customerFile?: string;
  orderFile?: string;
  reportFile?: string;
  redirectInventoryFile?: string;
  currencyDecimals: number;
  apply: boolean;
  offline: boolean;
  confirmTarget?: string;
}

let databasePool: { end(): Promise<void> } | undefined;

class ImportCliError extends Error {
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

function parseOptions(): CliOptions {
  const currencyDecimals = Number(valueAfter("--currency-decimals") ?? "2");
  const options: CliOptions = {
    bundleFile: valueAfter("--file"),
    categoryFile: valueAfter("--categories-file"),
    productFile: valueAfter("--products-file"),
    customerFile: valueAfter("--customers-file"),
    orderFile: valueAfter("--orders-file"),
    reportFile: valueAfter("--report"),
    redirectInventoryFile: valueAfter("--redirect-inventory"),
    currencyDecimals,
    apply: process.argv.includes("--apply"),
    offline: process.argv.includes("--offline"),
    confirmTarget: valueAfter("--confirm-target"),
  };
  if (
    !options.bundleFile &&
    !options.categoryFile &&
    !options.productFile &&
    !options.customerFile &&
    !options.orderFile
  ) {
    throw new ImportCliError(
      "missing_input",
      "Provide --file <bundle.json> or one or more WooCommerce entity JSON files.",
    );
  }
  if (options.apply && options.offline) {
    throw new ImportCliError("invalid_mode", "--apply cannot be combined with --offline");
  }
  return options;
}

async function readJson(filePath: string) {
  let contents: string;
  try {
    contents = await readFile(path.resolve(filePath), "utf8");
  } catch {
    throw new ImportCliError("input_read_failed", "An input file could not be read.");
  }
  try {
    return JSON.parse(contents) as unknown;
  } catch {
    throw new ImportCliError("invalid_json", "An input file does not contain valid JSON.");
  }
}

async function loadBundle(options: CliOptions) {
  const base = options.bundleFile ? await readJson(options.bundleFile) : {};
  if (!base || typeof base !== "object" || Array.isArray(base)) {
    throw new ImportCliError("invalid_bundle", "The bundle file must contain a JSON object");
  }
  const bundle = { ...(base as Record<string, unknown>) };
  const entityFiles: Array<[keyof typeof bundle, string | undefined]> = [
    ["categories", options.categoryFile],
    ["products", options.productFile],
    ["customers", options.customerFile],
    ["orders", options.orderFile],
  ];
  for (const [entity, filePath] of entityFiles) {
    if (!filePath) continue;
    const value = await readJson(filePath);
    if (!Array.isArray(value)) {
      throw new ImportCliError("invalid_entity_file", `${entity} file must contain a JSON array`);
    }
    bundle[entity] = value;
  }
  return bundle;
}

function expectedTarget(plan: WooImportPlan) {
  return {
    categories: plan.categories.length,
    products: plan.products.length,
    productPriceTotal: plan.products.reduce((total, product) => total + product.price, 0),
    media: plan.products.reduce((total, product) => total + product.media.length, 0),
    categoryAssignments: plan.products.reduce(
      (total, product) => total + product.categoryIds.length,
      0,
    ),
  };
}

async function emitReport(report: Record<string, unknown>, reportFile?: string) {
  const output = `${JSON.stringify(report, null, 2)}\n`;
  process.stdout.write(output);
  if (reportFile) {
    const resolvedReportFile = path.resolve(reportFile);
    await writeFile(resolvedReportFile, output, { mode: 0o600 });
    await chmod(resolvedReportFile, 0o600);
  }
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function writeRedirectInventory(plan: WooImportPlan, filePath?: string) {
  if (!filePath) return;
  const rows = ["old_url,new_path,source_ref"];
  for (const product of plan.products) {
    if (!product.sourcePermalink) continue;
    rows.push(
      [product.sourcePermalink, `/products/${product.urlSlug}`, `product:${product.targetId}`]
        .map(csvCell)
        .join(","),
    );
  }
  const resolvedFilePath = path.resolve(filePath);
  await writeFile(resolvedFilePath, `${rows.join("\n")}\n`, { mode: 0o600 });
  await chmod(resolvedFilePath, 0o600);
}

function assertApplyConfirmation(options: CliOptions) {
  if (!options.apply) return;
  const expectedTargetLabel = process.env.WOOCOMMERCE_IMPORT_TARGET?.trim();
  if (!expectedTargetLabel) {
    throw new ImportCliError(
      "missing_target_confirmation",
      "WOOCOMMERCE_IMPORT_TARGET must name the isolated target stack before apply",
    );
  }
  if (options.confirmTarget !== expectedTargetLabel) {
    throw new ImportCliError(
      "target_confirmation_mismatch",
      "--confirm-target must exactly match WOOCOMMERCE_IMPORT_TARGET",
    );
  }
}

async function main() {
  loadLocalEnv();
  const options = parseOptions();
  assertApplyConfirmation(options);
  const bundle = await loadBundle(options);
  const plan = buildWooCommerceCatalogPlan(bundle, {
    currencyDecimals: options.currencyDecimals,
  });
  const expected = expectedTarget(plan);
  await writeRedirectInventory(plan, options.redirectInventoryFile);

  if (options.offline) {
    await emitReport(
      {
        mode: "dry-run-offline",
        status: plan.issues.some((issue) => issue.severity === "error") ? "blocked" : "ready",
        source: plan.source,
        fingerprint: plan.fingerprint,
        reconciliation: plan.reconciliation,
        expectedTarget: expected,
        issues: plan.issues,
      },
      options.reportFile,
    );
    if (plan.issues.some((issue) => issue.severity === "error")) process.exitCode = 2;
    return;
  }

  const {
    applyWooCommerceCatalogPlan,
    inspectWooCommerceTargetConflicts,
    reconcileWooCommerceCatalogPlan,
  } = await import("../services/woocommerce-import.db");
  databasePool = (await import("../db")).pool;
  plan.issues.push(...(await inspectWooCommerceTargetConflicts(plan)));
  const before = await reconcileWooCommerceCatalogPlan(plan);

  if (!options.apply) {
    await emitReport(
      {
        mode: "dry-run",
        status: plan.issues.some((issue) => issue.severity === "error") ? "blocked" : "ready",
        source: plan.source,
        fingerprint: plan.fingerprint,
        reconciliation: plan.reconciliation,
        expectedTarget: expected,
        targetBefore: before,
        issues: plan.issues,
      },
      options.reportFile,
    );
    if (plan.issues.some((issue) => issue.severity === "error")) process.exitCode = 2;
    return;
  }

  if (plan.issues.some((issue) => issue.severity === "error")) {
    await emitReport(
      {
        mode: "apply",
        status: "blocked",
        source: plan.source,
        target: process.env.WOOCOMMERCE_IMPORT_TARGET,
        fingerprint: plan.fingerprint,
        reconciliation: plan.reconciliation,
        expectedTarget: expected,
        targetBefore: before,
        issues: plan.issues,
      },
      options.reportFile,
    );
    process.exitCode = 2;
    return;
  }

  assertWooCommercePlanCanApply(plan);
  await applyWooCommerceCatalogPlan(plan);
  const after = await reconcileWooCommerceCatalogPlan(plan);
  const reconciled = Object.entries(expected).every(
    ([key, value]) => after[key as keyof typeof after] === value,
  );
  await emitReport(
    {
      mode: "apply",
      status: reconciled ? "reconciled" : "reconciliation_failed",
      source: plan.source,
      target: process.env.WOOCOMMERCE_IMPORT_TARGET,
      fingerprint: plan.fingerprint,
      reconciliation: plan.reconciliation,
      expectedTarget: expected,
      targetBefore: before,
      targetAfter: after,
      issues: plan.issues,
    },
    options.reportFile,
  );
  if (!reconciled) process.exitCode = 3;
}

main()
  .catch((error: unknown) => {
    const safeError = {
      name: "ImportError",
      code:
        error instanceof ImportCliError
          ? error.code
          : error && typeof error === "object" && "code" in error
            ? String(error.code)
            : "unexpected_error",
      message:
        error instanceof ImportCliError
          ? error.message
          : "Import did not complete. No source record details were emitted.",
    };
    process.stderr.write(`${JSON.stringify(safeError)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await databasePool?.end().catch(() => undefined);
  });
