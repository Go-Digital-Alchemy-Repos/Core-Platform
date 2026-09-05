# Existing upload namespace migration

This is a dry-run planning contract, not an executable migration or deployment approval.
The pure server helper is `server/services/legacy-upload-migration-plan.ts`. It performs
no storage requests, bucket scans, copies, deletes, database changes or production access.

Existing installations may have objects at bucket-root logical keys; current Core prefixes
uploads with `clients/<public-domain>/uploads`, or the stack ID before a domain is assigned.
Changing the domain can also change that prefix. Resolve compatibility explicitly; never
add an arbitrary root lookup or cross-stack fallback to the serving path.

## Required plan evidence

Supply the stable stack ID, exact current public origin when configured, bucket name,
exact source prefix and current destination prefix, and an ownership attestation reference.
The reference is an operator assertion, **not verified ownership**. A later apply tool must
independently establish authoritative evidence that the source and destination belong to
the same stack. Historical domain prefixes require that same explicit evidence.

An empty source prefix is allowed only with an explicit dedicated-same-stack-bucket
attestation. A shared bucket's root is not an acceptable implicit source. Each approved
source key must be enumerated; do not discover work by listing the bucket. Entries record
actual content SHA256 and byte length, plus version ID and ETag when available. ETag alone
is not a content digest. Plans contain references and object metadata, never credentials
or object contents; operators must avoid embedding secrets in references or key names.

Destination keys derive from source-relative paths. The destination prefix must equal
Core's current computed stack upload prefix. Paths, ownership scope, duplicates and
source/destination overlaps are validated before a deterministic SHA256 plan ID is created.
Plan output is recursively frozen, but freezing and the digest are not authorization or
security boundaries. Revalidate serialized plans and bind a separately approved plan ID
when executing later; an attacker can recalculate a digest.

## Future apply requirements

No apply implementation is included. Before implementing or running one:

1. Default to dry-run; require an explicit apply action and the separately approved exact
   plan ID. Revalidate its serialization, current stack/bucket/prefix and ownership proof.
2. Read only the approved source keys. Bind observations to exact bucket/key identities;
   verify actual bytes against the approved digest/length and pinned version/ETag. Stop
   on changed or missing sources, even when the destination happens to match.
3. Preserve every source. Copy only to an absent destination; never overwrite differing
   content. Close the destination check/write race with supported atomic create-only
   semantics or a reviewed equivalent. A preflight HEAD followed by unconditional COPY
   is insufficient. Pin the source version or apply a source precondition when supported.
4. Read and hash the destination after copying; recheck the source identity when needed
   to detect concurrent replacement. Record verified results in a durable ledger bound
   to the plan ID and exact key pair. Resume by re-verifying matching bytes, not by trusting
   an old success marker. Different destination version IDs/ETags are expected for copies.
5. Verify application media reads, stored references and deletion targeting before cutover.
   Determine whether database references need changes; this helper changes none. Retain
   originals and a rollback path. Cleanup is a separate approved operation, never part of
   migration apply. Coordinate writers/cutover so no uploads are missed after planning.

`decideLegacyUploadCopy` returns `copy`, `already-verified`, `source-changed`, or
`destination-conflict` from supplied observations. It cannot verify that those observations
are genuine, current or race-free. It does not grant write authority or guarantee successful
copy. Application integration must enforce the requirements above and preserve cross-stack
isolation throughout.
