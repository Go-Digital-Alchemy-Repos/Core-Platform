import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, cp, readFile } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version?: string };

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
      __APP_VERSION__: JSON.stringify(packageJson.version ?? "unknown"),
    },
    minify: true,
    packages: "bundle",
    logLevel: "info",
  });

  console.log("copying migrations...");
  await cp("migrations", "dist/migrations", { recursive: true });

  console.log("copying docs...");
  await cp("docs", "dist/docs", { recursive: true });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
