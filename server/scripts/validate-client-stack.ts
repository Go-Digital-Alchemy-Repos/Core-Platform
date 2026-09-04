import { readFile } from "node:fs/promises";
import { validateClientStackEnvironment } from "../config/client-stack";
import {
  evaluateClientReleaseReadiness,
  validateClientReleaseManifest,
} from "../../shared/client-release-manifest";

const arguments_ = process.argv.slice(2);
const allowedFlags = new Set([
  "--require-ecommerce",
  "--require-email",
  "--require-backups",
  "--require-observability",
  "--require-client-form-proxy",
  "--require-separate-origins",
  "--release-manifest",
]);
const flags = new Set<string>();
let releaseManifestPath: string | undefined;
const argumentErrors: string[] = [];

for (let index = 0; index < arguments_.length; index += 1) {
  const argument = arguments_[index];
  if (argument === "--release-manifest") {
    const candidate = arguments_[index + 1];
    if (!candidate || candidate.startsWith("--")) {
      argumentErrors.push("--release-manifest requires a file path");
    } else if (releaseManifestPath) {
      argumentErrors.push("--release-manifest may be provided only once");
    } else {
      releaseManifestPath = candidate;
      index += 1;
    }
    continue;
  }
  if (allowedFlags.has(argument)) flags.add(argument);
  else argumentErrors.push(`Unknown option: ${argument}`);
}

if (argumentErrors.length > 0) {
  for (const error of argumentErrors) console.error(error);
  process.exitCode = 2;
} else {
  const result = validateClientStackEnvironment(process.env, {
    ecommerce: flags.has("--require-ecommerce"),
    email: flags.has("--require-email"),
    backups: flags.has("--require-backups"),
    observability: flags.has("--require-observability"),
    clientFormProxy: flags.has("--require-client-form-proxy"),
    separatePublicAndAdminOrigins: flags.has("--require-separate-origins"),
  });

  if (releaseManifestPath) {
    try {
      const input: unknown = JSON.parse(await readFile(releaseManifestPath, "utf8"));
      const manifest = validateClientReleaseManifest(input);
      if (!manifest.success) {
        result.errors.push("Release manifest could not be validated");
      } else {
        if (result.stackId && manifest.data.clientStackId !== result.stackId) {
          result.errors.push("Release manifest clientStackId must match CLIENT_STACK_ID");
        }
        const readiness = evaluateClientReleaseReadiness(manifest.data);
        if (!readiness.ready) {
          result.errors.push(`Release manifest is not ready: ${readiness.blockers.join(", ")}`);
        }
      }
    } catch {
      result.errors.push("Release manifest could not be read");
    }
  }

  if (result.errors.length > 0) {
    console.error("Client-stack deployment preflight failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Client-stack deployment preflight passed for ${result.stackId}.`);
    console.log(`Current Core Platform origin: ${result.corePlatformOrigin}`);
  }
}
