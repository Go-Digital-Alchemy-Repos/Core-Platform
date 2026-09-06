import { createHash } from "node:crypto";
import { databasePoolConfig } from "../config/database";
import { validateClientStackEnvironment } from "../config/client-stack";

export type DeploymentProfile = "normal" | "recovery";
/** A deliberately restricted TOML profile, not a general-purpose TOML parser. */
export function checkDeploymentPreflight(
  config: string,
  profile: DeploymentProfile,
  env?: NodeJS.ProcessEnv,
  newClient = false,
) {
  const errors: string[] = [];
  const values = new Map<string, unknown>();
  const sections = new Set<string>();
  let section = "";
  try {
    if (Buffer.byteLength(config) > 16384) throw new Error();
    for (const raw of config.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (/^\[(build|deploy)\]$/.test(line)) {
        section = line.slice(1, -1);
        if (sections.has(section)) throw new Error();
        sections.add(section);
        continue;
      }
      const match = /^([A-Za-z]+)\s*=\s*("[^"\\]*"|[0-9]+)\s*(?:#.*)?$/.exec(line);
      if (!section || !match) throw new Error();
      const key = `${section}.${match[1]}`;
      if (values.has(key)) throw new Error();
      values.set(key, JSON.parse(match[2]));
    }
    const expected = {
      "build.buildCommand": "npm run build",
      "deploy.startCommand": `env NODE_ENV=production node dist/${profile === "normal" ? "index" : "rollback-maintenance"}.cjs`,
      "deploy.drainingSeconds": 45,
      "deploy.healthcheckPath": profile === "normal" ? "/api/health/ready" : "/ready",
      "deploy.healthcheckTimeout": 30,
      "deploy.restartPolicyType": "on_failure",
      "deploy.restartPolicyMaxRetries": 5,
    };
    if ([...values.keys()].some((key) => !(key in expected)))
      errors.push("railway_unsupported_field");
    for (const [key, value] of Object.entries(expected))
      if (values.get(key) !== value) errors.push(`railway_invalid_${key.replace(".", "_")}`);
  } catch {
    errors.push("railway_invalid_or_unsupported_syntax");
  }
  if (env) {
    // Validate the future normal process even when inspecting a recovery artifact.
    for (const key of ["SESSION_SECRET", "DATABASE_URL", "SETUP_TOKEN"])
      if (!env[key]?.trim()) errors.push(`required_${key}`);
    if (env.SESSION_SECRET === "dev-secret-change-me") errors.push("default_SESSION_SECRET");
    try {
      databasePoolConfig({ ...env, NODE_ENV: "production" });
    } catch {
      errors.push("database_configuration_invalid");
    }
    if (newClient && validateClientStackEnvironment(env).errors.length)
      errors.push("client_stack_configuration_invalid");
  } else if (newClient) errors.push("client_stack_requires_runtime_environment");
  return {
    schemaVersion: 1,
    profile,
    configurationSha256: createHash("sha256").update(config).digest("hex"),
    runtimeEnvironmentChecked: Boolean(env),
    newClientChecked: Boolean(env && newClient),
    configurationAccepted: errors.length === 0,
    normalStartupProven: false,
    errors,
  };
}
