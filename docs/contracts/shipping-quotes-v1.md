# Shipping quotes v1 — approved implementation contract

Orchestrator decision, 2026-09-07. This contract starts the unfinished shipping
workflow; it is not an operational carrier or production acceptance claim.
The frozen f488 application candidate remains unchanged.

## Request ownership

Use shared/ecommerce-shipping-quote.ts for the strict version 1.0.0 request.
POST /api/admin/ecommerce/orders/:orderId/shipping-quotes takes Idempotency-Key
(UUID), locationId, unique item/quantity selections and exactly one parcel.
The service resolves the order destination snapshot and active fulfillment
location origin. Validate paid, uncancelled shipping order, item ownership,
remaining unfulfilled quantities and existing fraud clearance under order lock.
Quote requests do not reserve inventory, fulfill goods, notify customers or
change checkout prices. Independent quotes may overlap selections.

The first transport supports EasyPost test quotes for US states/DC domestic
addresses and USD only; reject territories, military/customs-required destinations
and unsupported currency explicitly. Use the existing USD order/payment contract (ecommerce-order.service.ts); do not
invent a configurable store currency authority or order currency column. No production call
is authorized by this contract. Missing approved test credentials leaves external
acceptance pending and must not block synthetic implementation/testing.

Inputs use explicit oz/lb/g/kg and in/cm/mm. Dimensions are all-or-none. Positive
finite input bounds are structural safety limits, not carrier eligibility.
The service must additionally reject values that round to zero or exceed provider
bounds after normalization. Show one-decimal inches/ounces before submission.
USD rate strings are converted to integer cents exactly; excess precision,
negative values and database integer overflow reject without rounding.

## Durable model and lifecycle

Implement an additive ecommerce_shipping_quote_attempts table, one row per
(order_id, request_key), with unique provider shipment identity scoped by provider
and credential-generation identity. Fields include contract_version, request_hash,
accepted input snapshot, order/location/item identity, expected and observed mode,
provider, credential_generation_id, status, provider_shipment_id, normalized rates,
created_at, updated_at, expires_at, sanitized error code, and attempt fencing token.
Allocate the next migration number only after rechecking the migration inventory.
No existing shipment/fulfillment rows are repurposed.

States: pending -> quoted | unavailable | unknown. A pending operation exceeding
the bounded request deadline becomes unknown, never automatically retried.
GET and maintenance perform a compare-and-set of expired pending rows after a
restart without redispatch. Unavailable means a definitive normalized provider
rejection or valid no-rate response. Timeout, connection loss, interrupted process,
or malformed/mismatched/oversize response after dispatch means unknown because
provider object creation cannot be excluded. Retain a recovered shipment ID only
when its identity and mode have been verified.
The first owner claims under a short database transaction then performs external
I/O outside database locks. Same key and canonical request returns the existing
result/status; a different body is 409. requestHash is derived solely from parsed client inputs with items sorted by ID
and the request contract version. Look up a same-key replay and compare this hash
before resolving current eligibility, settings or addresses. Separately compute
acceptedSnapshotHash over the resolved server input snapshot/version. A replay
after a location edit returns the original attempt, not a misleading conflict.
A fenced completion may update only its own pending/unknown attempt; late results
can resolve unknown but must never overwrite another completed result.

A deliberate new key creates a new quote, not a retry of an uncertain attempt.
Expose unknown honestly. A recovered provider shipment ID may support later
read-only reconciliation; reference is not provider uniqueness/idempotency.
Local quoted freshness is 15 minutes, clearly a Core policy, not a provider price
guarantee. Retrieval marks stale based on time and current order/location inputs;
retain original result for audit. No quote purchase endpoint exists in this slice.

Persist only normalized necessary address/parcel/rate data; exclude raw responses,
keys and authorization headers. Keep private attempt snapshots for 30 days after
terminal completion, then redact address/contact snapshots while retaining hashes,
provider identity, cost and status for audit. Pending/unknown records require
resolution before pruning. Implement the retention operation before enabling the
workflow; ordinary privileged backup retention continues to apply independently.

## Credentials, transport and readiness

Credentials remain in existing encrypted settings. Existing settings keys are
globally unique, so raw setup field names such as apiKey cannot safely identify
multiple providers. Use provider-namespaced persistence keys with explicit mapping
to setup fields. Preserve legacy values only in their recorded category; never
copy an ambiguous key to another provider. Include compatibility migration and
cross-provider isolation tests before enabling quotes. Add an opaque random credential
generation token on successful key replacement; do not derive public identity
from the secret or use general provider updatedAt. Credential save, generation
change and clearing the previous test-key approval must be atomic. Resolve key,
generation and approved test mode from one uncached database read at first claim;
serialize the claim against credential rotation and provider deactivation. No
new claim may use a superseded generation. An already-claimed request may finish
with its captured generation within the request deadline; rotation cannot undo
I/O already dispatched. Recheck generation before dispatch to suppress known
rotations, but do not claim that a check eliminates the subsequent I/O race.
Retain the attempt identity and mark its result ineligible for future consumption
after rotation. Persist neither the captured secret nor raw address logs.
Older generations stay identifiable for recovery. Cross-process cache invalidation
is not a substitute for uncached claim-time authorization.

Fixed HTTPS api.easypost.com transport, no redirects, bounded timeout/body size,
strict response mode/shipment/rate/currency identity, no arbitrary URL fetching.
The provider call requires a specifically approved test-key configuration, not
merely the existing testMode checkbox. Returned test mode is checked additionally.
Return operation-specific capability states: implemented, configured, testVerified;
labels/tracking/customs do not become ready because rates are implemented.

## Required remaining implementation and proof

This branch initially contains request validation and exact money conversion only.
Persistence, migration, credential generation, orchestration, bounded transport,
admin routes and accessible comparison UI are outstanding. Reuse existing admin
and ecommerce feature gates. GET returns a sanitized status and retained rates;
POST returns 202 pending/unknown, 201 new completed result or 200 replay.

Before acceptance: mounted authorization/feature-gate tests, real PostgreSQL
same-key races, changed-body conflicts, stale claims and late responses; transport
malformed/error/timeout/redirect/oversize/mode tests without provider access; UI
comparison, retained drafts, retries and reload; populated migration/recovery and
retention tests. Synthetic transport acceptance must be labelled synthetic.
Real test-account acceptance remains separate. Subsequent label purchase requires
unique claims, unknown-outcome retrieval of the same shipment, no blind re-buy,
and separation of purchased labels from actual dispatch.
