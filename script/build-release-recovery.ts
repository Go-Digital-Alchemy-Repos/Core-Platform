import { build } from "esbuild";
// Separate operator build only: never modifies the normal application artifact.
await build({
  entryPoints: ["server/scripts/release-recovery.ts"],
  platform: "node",
  target: "node20",
  bundle: true,
  format: "esm",
  packages: "external",
  outfile: "dist/operations/release-recovery.mjs",
  metafile: true,
}).then(async (result) => {
  const forbidden = Object.keys(result.metafile!.inputs).filter((name) =>
    /server\/(index|db)\.ts$|backup-storage\.service|system-backup\.service/.test(name),
  );
  if (forbidden.length) throw new Error("Unexpected application module in operator bundle");
});
