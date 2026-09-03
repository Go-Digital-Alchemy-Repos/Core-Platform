import { spawnSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

describe("WooCommerce import CLI", () => {
  it("runs an offline dry-run without a database or source record details in its report", () => {
    const fixture = path.resolve(
      process.cwd(),
      "server/__tests__/fixtures/woocommerce-catalog.json",
    );
    const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "woo-import-test-"));
    const redirectFile = path.join(temporaryDirectory, "redirects.csv");
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "server/scripts/import-woocommerce.ts",
        "--file",
        fixture,
        "--offline",
        "--redirect-inventory",
        redirectFile,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, DATABASE_URL: "" },
      },
    );

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(report).toMatchObject({
      mode: "dry-run-offline",
      status: "ready",
      source: "woocommerce",
      expectedTarget: {
        categories: 1,
        products: 1,
        productPriceTotal: 1500,
        media: 1,
        categoryAssignments: 1,
      },
      issues: [],
    });
    expect(result.stdout).not.toContain("Migration-safe mug");
    expect(result.stdout).not.toContain("MUG-101");
    expect(readFileSync(redirectFile, "utf8")).toContain(
      '"https://store.example.test/product/migration-safe-mug/","/products/migration-safe-mug"',
    );
    expect(statSync(redirectFile).mode & 0o777).toBe(0o600);
    rmSync(temporaryDirectory, { recursive: true });
  });
});
