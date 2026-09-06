import { build } from "esbuild";
export async function buildUploadLedgerProbe() {
  await build({
    entryPoints: ["server/scripts/probe-upload-ledger.ts"],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    packages: "external",
    outfile: "dist/operations/probe-upload-ledger.mjs",
  });
}
