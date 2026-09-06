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

Authenticated Cloudflare inspection resolved the completed-object lifecycle
question as recorded in `legacy-upload-durable-ledger.md`. The application token
was not expanded. A separately authorized audit-only persistence probe is being
prepared; it must expose no media-copy operation and allow independent GET-only
verification. Actual upload freeze, refreshed copy approval and writer barrier
remain prerequisites for media migration, not for this audit-only probe.

CRM custom-field API work was accepted independently on its isolated branch at
`64b98ef`; it is not part of this maintenance candidate. Definition UI and atomic
manual creation/conversion remain in progress under separate ownership.
