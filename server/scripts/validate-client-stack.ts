import { validateClientStackEnvironment } from "../config/client-stack";

const flags = new Set(process.argv.slice(2));
const allowedFlags = new Set([
  "--require-ecommerce",
  "--require-email",
  "--require-backups",
  "--require-observability",
  "--require-client-form-proxy",
  "--require-separate-origins",
]);
const unknownFlags = [...flags].filter((flag) => !allowedFlags.has(flag));

if (unknownFlags.length > 0) {
  console.error(`Unknown option(s): ${unknownFlags.join(", ")}`);
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

  if (result.errors.length > 0) {
    console.error("Client-stack deployment preflight failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Client-stack deployment preflight passed for ${result.stackId}.`);
    console.log(`Current Core Platform origin: ${result.corePlatformOrigin}`);
  }
}
