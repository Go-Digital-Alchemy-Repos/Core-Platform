# Quality Gates

This document describes the quality checks available in the Core Platform codebase and how to use them.

## Available Scripts

| Script           | Command              | Purpose                                          |
| ---------------- | -------------------- | ------------------------------------------------ |
| Type-check       | `npm run check`      | Runs `tsc` to validate TypeScript types           |
| Lint             | `npm run lint`       | Runs ESLint across client, server, and shared code |
| Format (check)   | `npm run format`     | Runs Prettier in check mode (reports issues only)  |
| Test             | `npm test`           | Runs Vitest unit tests                            |

## Running Checks Locally

Before pushing code, run the full quality suite:

```bash
npm run check
npm run lint
npm run format
npm test
```

All four commands must pass cleanly before a pull request will be merged.

## Lint

ESLint is configured in `eslint.config.js` using the flat config format with:

- ESLint recommended rules
- TypeScript-ESLint recommended rules
- Unused variable warnings (with `_` prefix exceptions)
- Explicit `any` warnings (not errors)

To auto-fix lint issues:

```bash
npx eslint --fix client/src server shared
```

## Format

Prettier is configured in `.prettierrc` and runs in **check-only mode** by default (no auto-rewriting). Files in `node_modules`, `dist`, `build`, and `migrations` are excluded via `.prettierignore`.

To auto-format files:

```bash
npx prettier --write client/src server shared
```

## Tests

Tests use [Vitest](https://vitest.dev/) and are co-located with the source files they test (e.g., `server/utils/logger.test.ts`).

Test files are included in type validation via `tsconfig.test.json`, which extends the main `tsconfig.json` but adds `**/*.test.ts` to its include list.

### Adding New Tests

1. Create a file named `*.test.ts` next to the module you want to test.
2. Import `describe`, `it`, `expect` (and `vi` for mocks) from `vitest`.
3. Keep tests pure and fast — no database or network calls in unit tests.
4. Run `npm test` to verify your tests pass.

### Running Tests in Watch Mode

```bash
npx vitest --watch
```

## CI Workflow

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on every push to `main` and on every pull request targeting `main`. It executes:

1. `npm ci` — clean install of dependencies
2. `npm run check` — type-checking
3. `npm run lint` — linting
4. `npm run format` — formatting check (non-blocking, see note below)
5. `npm test` — unit tests

All steps must pass for the CI run to be green.

**Note:** The format check runs with `continue-on-error: true` in CI because the existing codebase has not yet been mass-formatted. It reports formatting issues without blocking the pipeline. Once a baseline format pass is applied, the `continue-on-error` flag can be removed to enforce formatting strictly.

## Conventions

- **Do not disable lint rules** without a comment explaining why.
- **Prefer `warn` over `error`** for rules that are aspirational rather than critical.
- **Test file naming**: `<module>.test.ts` co-located with the source file.
- **No mocked/stubbed database tests** in unit test files — those belong in integration tests (out of scope for now).
