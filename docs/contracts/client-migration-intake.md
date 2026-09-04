# Client Migration Intake Contract

The intake is the secret-free decision record required before a draft client migration can become an
approved pilot. Its canonical Zod schema and validator are in
[`shared/client-migration-intake.ts`](../../shared/client-migration-intake.ts).

It records the approved pilot routes and exclusions, non-secret source-access reference, data-entity
dispositions, recovery objectives, named operational roles, and release blockers. It does not store an
export, endpoint credentials, database URLs, API keys, or registrar credentials.

An intake may stay `draft` while decisions are outstanding. It cannot validate as `approved` until it has
protected source access, an approved scope and migration policy, numeric RPO/RTO objectives, an approved
release state, no remaining release blockers, and business, technical, and operations approver roles.

Validate an intake from the repository root:

```sh
npm run migration:intake:validate -- docs/pilots/better-farms/client-migration-intake.example.json
```

The [Better Farms draft](../pilots/better-farms/client-migration-intake.example.json) deliberately remains
blocked. It documents the specific inputs still required without treating placeholders as approval or
authorizing a source import, DNS change, or deployment.
