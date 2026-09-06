# Maintenance operations checkpoint — 2026-09-06

The application release candidate remains immutable at
`6ea326ae620b5fcd4b5c10ef1cd1f62724e0c230`. Root rechecked hosted run
[34006542042](https://github.com/Go-Digital-Alchemy-Repos/Core-Platform/actions/runs/34006542042):
completed successfully for that exact SHA. The candidate worktree was clean.
This supersedes the pending final-head CI statement in the earlier release-gates
document; its ordered live cutover obligations still apply.

Read-only Railway project inventory showed one production environment, the Core
Platform application service and its database service, with no additional service
or cron schedule in this project. The application had one active deployment,
`b620280d-6445-4ba8-bb23-b6e9226391d9`, status SUCCESS. The database had one active
deployment, `f7f939c7-c087-4f95-a46c-083b869cbca2`, status SUCCESS. Service-level
start-command overrides were null. This inventory does not yet prove replica count,
the actual process command, termination of future replaced writers, or absence of
writers outside this Railway project. No production configuration changed.

Follow-up deployment metadata and read-only SSH inspection confirmed the running
commit is `a006f36a3c4f37566c71b278d561844b45fb3b81`. Its adopted manifest has one
replica in `us-east4-eqdc4a`, zero volume mounts, `npm start`, readiness at
`/api/health/ready`, and no configured drainingSeconds. Actual process inspection
showed PID 1 `npm start` and a child Node process running `dist/index.cjs`.
The inspected replica was `76dd0019-32c0-4bc3-9c8b-9b3cffdd5633`; upload freeze was
false. The two preceding deployments were REMOVED. This confirms the current
single-replica topology and absence of a persistent application volume; it does
not prove termination of writers created during the future freeze transition.
The new transaction activation flag was not true in the environment, but the old
binary does not implement the candidate's flag guard, so this is not evidence of
provider transaction admission being disabled in the running application.

Authenticated Cloudflare inspection resolved the completed-object lifecycle
question as recorded in `legacy-upload-durable-ledger.md`. The application token
was not expanded. A separately authorized audit-only persistence probe is being
prepared; it must expose no media-copy operation and allow independent GET-only
verification. Actual upload freeze, refreshed copy approval and writer barrier
remain prerequisites for media migration, not for this audit-only probe.

CRM custom-field API work was accepted independently on its isolated branch at
`64b98ef`; it is not part of this maintenance candidate. Definition UI and atomic
manual creation/conversion remain in progress under separate ownership.

## External audit persistence accepted

Root reviewed the isolated audit-only probe and reran 22 probe/sink tests plus the
detached compiled entrypoint checks. Artifact SHA256:
`867b7d39cc1366fb612e009cced656eb8e3c075a7e7738f09403572c6fb2c25d`.
Under the user's autonomous maintenance authorization, root prepared a fresh
probe-only approval and retained exact inputs and artifact outside Railway in an
operator-owned directory. Two separate Railway SSH invocations delivered owned
temporary files, checked artifact/input hashes, executed distinct Node processes,
and removed their temporary runtime directories in finally blocks.

The first returned exit 0, complete true and two audit-record hashes. The second
returned exit 0, complete true and `fresh-process-exact-GET`, validating both exact
records against the independently retained receipt. Attempt UUID:
`2dda8b0c-a1e9-49ed-bd2e-ca05bf7ece04`. Inputs and both receipts are retained under
`/Users/mike/Documents/Core Platform Operations/ledger-probe-2dda8b0c-a1e9-49ed-bd2e-ca05bf7ece04`.
Only the two approved audit objects were written; no media copying, database
mutation, freeze change, listing, deletion or bucket configuration change occurred.

This accepts external persistence and separate-process retrieval for the operator
ledger together with the recorded lifecycle inspection. It does not claim a
deployment-removal simulation or protection against administrative deletion.
The later media apply requires its own fresh approval, writer barrier and ledger
attempt; this probe approval cannot authorize it.

## Production change and refreshed recovery

Production changed to `67e1c7ac431db2dab6064c943375009ff5979f1c` in deployment
`0ed9d052-b870-4c72-9e2d-cdc42bac2680`, merging PR12's MapLibre/directory fixes.
The previous deployment was REMOVED. Root merged this current main into the
maintenance branch at `1e86467a36ecf6eb5c08affe33546226143d4e99`, resolving the
documentation and lockfile conflicts while preserving both sets of changes.
Type checking and five map/directory tests passed; hosted runs 34008271905 and
34008274238 remain pending at this checkpoint. The prior source-bound media plan
must be regenerated; no stale plan may authorize copying.

Read-only retrieval under the new source binding retained the latest exact backup
with SHA256 `026352c8c60640ad762a4ae70ca0b01dbd8d48e8f1cb4caa521e858abc53ba2d`.
Strict runtime decryption passed without exporting the session secret. Root's
fresh restore rehearsal against candidate `1e86467` preserved 94 tables/404 rows,
passed post-restore migrations and removed its owned fixture. See
`release-evidence/core-recovery-latest-2026-09-06.json`. The backup is retained
mode0600 in the operator-controlled recovery-backups directory outside Railway.
This replaces the older 391-row snapshot as current recovery evidence.

Recovery branch `a9d21d207320a8462e0adad4fa83c8bf86c76eb6` passed hosted run
34008130360 after selecting the read-only entrypoint and 45-second drain in its
Railway configuration. Its compiled artifact hash remains unchanged. Actual
runtime adoption, writer barrier and live namespaced media verification remain
the ordered operational work after the refreshed candidate passes its gates.
