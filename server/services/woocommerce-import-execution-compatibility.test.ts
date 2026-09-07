import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { WOO_IMPORT_RUN_MODES, WOO_IMPORT_RUN_STATUSES } from "@shared/schema/woocommerce-import";
import { validateBeginWooImportRun } from "./woocommerce-import-lifecycle.service";

const baseline = "f4853306e0d4dc086f5ab06352019858453a65b1";
const oldSource = (path: string) =>
  execFileSync("git", ["show", `${baseline}:${path}`], { encoding: "utf8" });
const compile = (source: string) =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const input = {
  contractVersion: "1.0.0",
  sourceStoreId: "synthetic",
  targetStackId: "synthetic",
  sourceFingerprint: "a".repeat(64),
  highWaterMark: "synthetic",
  mode: "rehearsal" as const,
  enabledPhases: [1],
  operatorReference: "synthetic",
};

describe("execution compatibility with the pinned old supported resume reader", () => {
  it("rejects a new legacy-version begin", () => {
    expect(() => validateBeginWooImportRun(input)).toThrow(
      "Unsupported WooCommerce import contract",
    );
  });
  it.each(["1.0.0", "1.1.0"])(
    "old resume rejects a 1.1 run with request %s before any state write",
    async (contractVersion) => {
      const legacy: Record<string, unknown> = {};
      runInNewContext(
        compile(oldSource("server/services/woocommerce-import-lifecycle.service.ts")),
        {
          exports: legacy,
          require: (id: string) =>
            id === "node:crypto"
              ? { createHash }
              : { WOO_IMPORT_RUN_MODES, WOO_IMPORT_RUN_STATUSES },
        },
      );
      const source = oldSource("server/services/woocommerce-import-drizzle.repository.ts");
      const ast = ts.createSourceFile("old.ts", source, ts.ScriptTarget.Latest, true);
      const declaration = ast.statements.find(
        (node) => ts.isClassDeclaration(node) && node.name?.text === "DrizzleWooImportRepository",
      ) as ts.ClassDeclaration;
      const method = declaration.members.find(
        (node) => ts.isMethodDeclaration(node) && node.name.getText(ast) === "resumeRun",
      )!;
      const update = vi.fn(() => {
        throw new Error("Unexpected legacy state write");
      });
      const row = {
        ...input,
        contractVersion: "1.1.0",
        id: "new-run",
        status: "failed",
        dispositionFingerprint: null,
        dispositionApprovalReference: null,
      };
      const chain = { from: () => chain, where: () => chain, for: async () => [row] };
      const tx = { select: () => chain, update };
      const exported: Record<string, unknown> = {};
      runInNewContext(
        compile(
          `class OldRepository { ${method.getText(ast)} }; exports.OldRepository = OldRepository;`,
        ),
        {
          exports: exported,
          db: { transaction: (callback: (tx: unknown) => unknown) => callback(tx) },
          wooImportRuns: { id: "id" },
          eq: () => true,
          validateBeginWooImportRun: legacy.validateBeginWooImportRun,
          assertWooImportRunTransition: legacy.assertWooImportRunTransition,
          assertRunStatus: () => {},
        },
      );
      const OldRepository = exported.OldRepository as new () => {
        resumeRun(id: string, request: typeof input): Promise<unknown>;
      };
      await expect(
        new OldRepository().resumeRun("new-run", { ...input, contractVersion }),
      ).rejects.toThrow(
        contractVersion === "1.0.0"
          ? "does not match the original run identity"
          : "Unsupported WooCommerce import contract",
      );
      expect(update).not.toHaveBeenCalled();
      expect(row.status).toBe("failed");
    },
  );
});
