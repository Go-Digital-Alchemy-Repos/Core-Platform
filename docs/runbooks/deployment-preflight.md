# Maintenance deployment preflight

Run this check **before freezing production writers**, against the exact candidate Railway configuration and the intended normal-production runtime environment. The September 6 maintenance encountered two preventable failures: a quoted `drainingSeconds` value rejected by Railway before build, and a missing `SETUP_TOKEN` rejected by normal startup. Existing administrator accounts do not remove the startup secret requirement.

## Static configuration gate

```sh
npx tsx server/scripts/check-deployment-preflight.ts --config railway.toml --profile normal
```

For the separately reviewed recovery candidate, use its own configuration with `--profile recovery`. Normal requires `dist/index.cjs` and `/api/health/ready`; recovery requires `dist/rollback-maintenance.cjs` and `/ready`. Both require the currently approved numeric 45-second drain, numeric 30-second health timeout, and existing build/restart settings.

This command intentionally supports only the repository's small TOML profile: `[build]`/`[deploy]`, unescaped double-quoted strings, decimal integers, blank lines and comments. Duplicate sections/keys, unknown fields, environment overrides, arrays, inline tables and unsupported syntax fail closed. It is not a complete Railway schema validator. Changes to the deployment profile require a reviewed update to this checker rather than silently accepting additional configuration. No TOML runtime dependency was added.

Exit status 0 means the requested checks accepted the configuration; 1 means a rejected check; 2 means invalid arguments or unreadable/unsafe input. JSON `runtimeEnvironmentChecked:false` explicitly identifies a static-only result. `normalStartupProven` is always false.

## Runtime environment gate

```sh
npx tsx server/scripts/check-deployment-preflight.ts --config /private/candidate-railway.toml --profile normal --runtime-env
```

Execute in the intended target environment using the reviewed deployment tooling. Do not export production secrets to a developer shell, pass secret values in command arguments, or copy a production `.env`. If the current image lacks this checker, prepare and hash-check a separately bundled read-only helper using the established temporary-helper delivery procedure; importing this entry point must not start the app. The checker itself does not invoke Railway, load dotenv, connect to a database, contact a provider, write a file, or change configuration.

Runtime checks require nonblank `SESSION_SECRET`, `DATABASE_URL`, and `SETUP_TOKEN`, reject the known development session secret, and call the application's pure database TLS configuration validator with production semantics. This catches config errors without a connection. Secret values, database URLs and arbitrary exception messages never appear in output. It does not establish secret correctness, encryption compatibility, entropy, provider activation, external access, or uniqueness. Recovery-profile runtime checking also checks these prerequisites for the later normal application; passing recovery HTTP readiness alone cannot substitute for this check.

For a new client stack, add `--new-client --runtime-env` to reuse the existing client-stack environment validator. This opt-in keeps established Core maintenance separate from future client-origin/onboarding policy. Use the existing `deploy:check` and release-manifest tools for additional feature-specific/new-client release requirements; this command does not waive those gates.

## Evidence and remaining gates

Retain the JSON result with exact candidate source/CI receipt, `railway.toml` SHA-256 (included in the result), target project/environment/service/deployment binding, observation time and artifact hash in the private operations evidence directory. The checker does not attest its own platform provenance. A runtime observation applies only to the environment observed: pending Railway variables or service overrides may differ and must be reconciled independently before freeze. No secret values belong in that receipt.

Require `configurationAccepted:true` and `runtimeEnvironmentChecked:true` from the normal-profile environment gate before freeze. A static-only pass or recovery-profile pass is insufficient. Continue the established writer inventory/drain, backup recovery, exact media migration and deployment gates. After normal deployment, independently verify migrations, normal `/api/health/ready`, compiled artifact binding, authenticated application reads, historical transaction aggregates and queue/provider reconciliation before unfreezing.

The new focused tests run under the existing Vitest discovery. Adding the static CLI to hosted CI or changing the canonical release workflow remains an Orchestrator-owned integration decision; this implementation changes neither workflow nor production state.
