# EasyPost test quote transport

This isolated service performs one shipment quote request. It is not wired to an
admin route, settings, persistence, a worker or a capability registry. No external
provider call was used to validate it. Default fetch is available only for later
authorized orchestration; tests inject synthetic fetch implementations.

## Caller boundary

`fetchEasyPostTestQuotes(credentials, shipment, { fetch? })` requires a server-owned
snapshot with provider `easypost`, mode `test`, API key, credentialGenerationId and
matching approvedCredentialGenerationId UUIDs. This checks explicit approval
binding, not a guessed key prefix or actual provider account ownership. The caller
must perform the uncached claim-time authorization, rotation/deactivation locking
and pre-dispatch recheck defined in shipping-quotes-v1.md. Never expose this
credential snapshot to the browser or store its secret in the attempt.

The strict shipment input contains from_address, to_address and one parcel.
Addresses accept the 50 US states/DC, US country, ZIP or ZIP+4, name or company, street/city and
optional street2 (no phone/email). Territories and military state codes reject.
The caller still owns authoritative address resolution and domestic eligibility.
Parcel weight is already in ounces; optional dimensions are all-or-none inches.
Values must be positive, finite, at most one decimal and at most 1,000,000,000. This
last ceiling is a Core structural bound, not a claim about carrier eligibility;
carrier-specific restrictions belong to preparation. No conversion or rounding
occurs in this transport. Invalid approval/input throws only the fixed safe
`Shipping quote preflight rejected` message, before fetch.

## Provider boundary

The fixed endpoint is https://api.easypost.com/v2/shipments. A single JSON POST uses
Basic authentication with the key as username and an empty password. Redirects
are not followed. There is no endpoint override, automatic retry or label buy.

A 15-second deadline spans fetch and streamed body consumption. Actual fetch
receives an AbortSignal; cancellation also cancels the response reader. A bounded
race prevents a deliberately uncooperative injected promise from stalling the
caller; it is not a claim that an arbitrary injected implementation can be killed.
The event-loop deadline can be delayed by synchronous work. The body is capped at
256 KiB and decoded as strict UTF-8; malformed content length/media type/JSON and
oversized or stalled bodies produce unknown. Stream cancellation is requested
without waiting indefinitely for a broken injected cancellation promise.

Success requires a Shipment object, test mode, valid shp* identity, at most 100
Rate objects, unique rate* identities, each rate's matching shipment*id/test mode
and USD currency. Every consumed field is validated; other provider fields are
stripped rather than persisted. Rates contain only ID, carrier/service labels,
integer cents, nullable estimated days and nullable guarantee. Each rate retains
its verified shipment/test-mode and nonnull ca* carrier-account identity. Unconsumed
delivery dates are omitted. Missing estimates
remain null. All rates must validate; there is no partial acceptance or truncation.
The shared exact USD parser rejects precision loss and PostgreSQL integer overflow.

Valid empty rates return unavailable/no_rates with verified shipment identity.
HTTP 400/401/403/422 with a valid error envelope return unavailable/provider_rejected.
Their raw code/message/field errors are not returned. Other non-success statuses,
including 429/5xx, redirects, transport failures, mismatched or malformed responses
return unknown/provider_outcome_unknown. Unknown never means no provider object
was created. No provider messages, keys, authorization headers or raw addresses
are logged or returned. Recovered identities on unknown outcomes are not exposed
by this minimal transport; future read-only reconciliation is separate.

## Documentation and synthetic proof

Primary EasyPost documentation checked on 2026-09-07:

- [Authentication](https://docs.easypost.com/docs/authentication): Basic key username, no password; test and production credentials are separate.
- [Shipment](https://docs.easypost.com/docs/shipments): creating a shipment from addresses/parcel populates rates, separately from purchasing a label.
- [Parcel](https://docs.easypost.com/docs/parcels): one-decimal ounces/inches, weight required, dimensions all-or-none.
- [Rate](https://docs.easypost.com/docs/shipments/rates): shipment/mode identity, USD decimal strings and delivery estimate/guarantee fields.
- [Errors](https://docs.easypost.com/docs/errors): JSON errors with code/message and optional field errors.

Focused tests cover the exact outbound endpoint/body/auth, approval failure before
fetch, no prefix inference, company-only addresses, malformed identities/currency/money/estimates, duplicate
and excessive rates, empty rates, definitive rejection, 429/5xx uncertainty,
redirect rejection, actual and declared body size, fetch/reader stalls, abort and
cancellation, and sanitized results/errors. This is synthetic acceptance only;
credentials, real-account acceptance, persistence/retention and comparison UI remain
separate work. Dependencies are linked to the existing frozen checkout; this slice
does not claim a fresh locked dependency install.

Rate output names match the durable quote boundary: providerRateId, providerShipmentId,
carrierAccountId, carrier, service, amount (integer cents), currency, mode,
estimatedDays and deliveryGuaranteed. Carrier-account identity is required by the
[CarrierAccount documentation](https://docs.easypost.com/docs/carrier-accounts);
a missing/null/malformed account ID yields unknown, never an invented account.
