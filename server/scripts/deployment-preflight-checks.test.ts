import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { checkDeploymentPreflight } from "./deployment-preflight-checks";

const config = readFileSync("railway.toml", "utf8");
const env = {
  SESSION_SECRET: "synthetic-session-secret-32-characters",
  SETUP_TOKEN: "synthetic-setup-token",
  DATABASE_URL: "postgres://synthetic:synthetic@database.example.test/test",
};
describe("deployment preflight", () => {
  it("keeps config-only evidence distinct from runtime/startup proof", () => {
    expect(checkDeploymentPreflight(config, "normal")).toMatchObject({
      configurationAccepted: true,
      runtimeEnvironmentChecked: false,
      normalStartupProven: false,
    });
  });
  it("checks the production environment regardless of supplied NODE_ENV", () => {
    expect(
      checkDeploymentPreflight(config, "normal", {
        ...env,
        NODE_ENV: "development",
        SETUP_TOKEN: "",
      }).errors,
    ).toContain("required_SETUP_TOKEN");
  });
  it("rejects the actual quoted-drain deployment failure", () => {
    expect(
      checkDeploymentPreflight(
        config.replace("drainingSeconds = 45", 'drainingSeconds = "45"'),
        "normal",
      ).errors,
    ).toContain("railway_invalid_deploy_drainingSeconds");
  });
  it.each(["SESSION_SECRET", "DATABASE_URL", "SETUP_TOKEN"])(
    "requires %s, including on existing-admin maintenance",
    (key) => {
      expect(checkDeploymentPreflight(config, "normal", { ...env, [key]: " " }).errors).toContain(
        `required_${key}`,
      );
    },
  );
  it("rejects development secret and invalid production TLS", () => {
    const result = checkDeploymentPreflight(config, "normal", {
      ...env,
      SESSION_SECRET: "dev-secret-change-me",
      DATABASE_URL: "postgres://x:x@localhost/test",
      DATABASE_TLS_MODE: "local",
    });
    expect(result.errors).toContain("default_SESSION_SECRET");
    expect(result.errors).toContain("database_configuration_invalid");
  });
  it("accepts valid runtime configuration without claiming connectivity", () => {
    expect(checkDeploymentPreflight(config, "normal", env)).toMatchObject({
      configurationAccepted: true,
      runtimeEnvironmentChecked: true,
      normalStartupProven: false,
    });
  });
  it("cannot substitute recovery health/start for normal", () => {
    const recovery = config
      .replace("dist/index.cjs", "dist/rollback-maintenance.cjs")
      .replace("/api/health/ready", "/ready");
    expect(checkDeploymentPreflight(recovery, "normal", env).configurationAccepted).toBe(false);
    expect(checkDeploymentPreflight(recovery, "recovery", env).configurationAccepted).toBe(true);
    expect(
      checkDeploymentPreflight(recovery, "recovery", { ...env, SETUP_TOKEN: "" })
        .configurationAccepted,
    ).toBe(false);
  });
  it.each([
    "\n[deploy]\n",
    "\n[environments.production.deploy]\n",
    "\n[extra]\n",
    "\n[[deploy]]\n",
    "\nunknown = true\n",
    '\n"hidden" = "x"\n',
  ])("rejects unsupported/duplicate syntax %s", (extra) => {
    expect(checkDeploymentPreflight(config + extra, "normal").configurationAccepted).toBe(false);
  });
  it("rejects duplicate keys and unexpected properties", () => {
    expect(
      checkDeploymentPreflight(config + '\nstartCommand = "x"', "normal").configurationAccepted,
    ).toBe(false);
    expect(checkDeploymentPreflight(config + '\nother = "x"', "normal").errors).toContain(
      "railway_unsupported_field",
    );
  });
  it("reuses optional client validation without exposing environment values", () => {
    const result = checkDeploymentPreflight(
      config,
      "normal",
      { ...env, APP_URL: "https://sensitive.example.test/path" },
      true,
    );
    expect(result.errors).toContain("client_stack_configuration_invalid");
    expect(JSON.stringify(result)).not.toContain("sensitive");
    expect(JSON.stringify(result)).not.toContain("synthetic");
  });
  it("bounds input and requires env for new-client mode", () => {
    expect(checkDeploymentPreflight("#".repeat(16385), "normal").configurationAccepted).toBe(false);
    expect(checkDeploymentPreflight(config, "normal", undefined, true).configurationAccepted).toBe(
      false,
    );
  });
  it("CLI rejects symlinks/oversized input with sanitized output and no env fallback", () => {
    const dir = mkdtempSync(join(tmpdir(), "core-preflight-test-"));
    try {
      const target = join(dir, "config.toml");
      writeFileSync(target, config);
      const link = join(dir, "link.toml");
      symlinkSync(target, link);
      const run = (path: string, extra: string[] = []) =>
        spawnSync(
          process.execPath,
          [
            "--import",
            "tsx",
            "server/scripts/check-deployment-preflight.ts",
            "--config",
            path,
            "--profile",
            "normal",
            ...extra,
          ],
          {
            encoding: "utf8",
            env: {
              PATH: process.env.PATH,
              SESSION_SECRET: "DO-NOT-PRINT",
              DATABASE_URL: "secret-invalid-url",
            },
            timeout: 10000,
          },
        );
      expect(run(link).status).toBe(2);
      const runtime = run(target, ["--runtime-env"]);
      expect(runtime.status).toBe(1);
      expect(runtime.stdout).toContain("required_SETUP_TOKEN");
      expect(runtime.stdout + runtime.stderr).not.toMatch(/DO-NOT-PRINT|secret-invalid-url/);
      expect(run(target).status).toBe(0);
      writeFileSync(target, "x".repeat(16385));
      expect(run(target).status).toBe(2);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
