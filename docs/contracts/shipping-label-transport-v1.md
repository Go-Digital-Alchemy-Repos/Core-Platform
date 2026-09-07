# Shipping label transport v1 — approved implementation direction

Orchestrator approved this direction on 2026-09-07: layered positive purchase evidence, exact sub-cent fee bounds, fixed resource limits, no initial transport rejected result, and disabled label assets. Runtime remains unwired; no transport or provider operation is implemented by this document. Concrete persistence/transport integration remains subject to review.

Basis: label foundation `3e30e09f3598be790b474ba14fcaae2c5b369c19`, approved `docs/contracts/shipping-labels-v1.md`, and primary EasyPost docs reviewed 2026-09-07. No implementation or provider operation is implied. This is an internal transport contract; public responses, durable purchase state and database authorization remain separate.

## Confirmed source/provider distinctions

Core's current quote transport validates approved test credentials, normalized US shipment input, fixed HTTPS endpoint, strict IDs/modes/currency, unique rates, 15-second fetch/body deadline and 256-KiB response limit. Its 400/401/403/422-to-unavailable mapping is quote-specific and must NOT be inherited for buy. It exposes no label receipt, selected-rate evidence, fees or exact-shipment GET parser.

EasyPost documents selected*rate as nullable both before purchase and when purchase used another mechanism. PostageLabel has a pl* ID; selected Rate carries shipment/account/mode identity. Buy selects a rate on an existing shipment; retrieval observes the same shipment. Therefore a null selected_rate is not proof of non-purchase. The documented buy arguments provide no atomic maximum-cost condition. [Shipment API](https://docs.easypost.com/docs/shipments)

Fee.amount is a USD decimal with sub-cent precision; charged/refunded are separate booleans. Feeding fee amounts into Core's integer-cent quote parser would reject valid values or encourage rounding. [Fee API](https://docs.easypost.com/docs/fees)

Already-purchased, purchase-in-progress, no-response and timeout are distinct documented errors. None grants Core permission to automatically repeat buy; general provider retry guidance does not settle an unknown charged outcome. [Errors guide](https://docs.easypost.com/guides/errors-guide)

The following are the approved Core constraints and internal transport direction, subject to concrete implementation review.

## Exact proposed inputs

```ts
type UsdCents = number; // validated integer 0..2147483647, no coercion

type ExpectedLabelShipment = {
  provider: "easypost";
  mode: "test";
  providerShipmentId: string; // ^shp_[A-Za-z0-9]{1,100}$
  providerRateId: string; // ^rate_[A-Za-z0-9]{1,100}$
  carrierAccountId: string; // ^ca_[A-Za-z0-9]{1,100}$
  confirmedRateAmount: UsdCents;
  currency: "USD";
  // Exact accepted quote snapshot; same validated shape as quote storage:
  fromAddress: NormalizedDomesticAddress;
  toAddress: NormalizedDomesticAddress;
  parcel: NormalizedOuncesInchesParcel;
};
type LabelPurchaseCredentials = {
  capability: "label_purchase";
  provider: "easypost";
  mode: "test";
  apiKey: string;
  credentialGenerationId: string;
  approvedLabelGenerationId: string; // must equal generation, NOT quote approval
};
type LabelReadCredentials =
  | LabelPurchaseCredentials
  | {
      capability: "label_reconciliation";
      provider: "easypost";
      mode: "test";
      apiKey: string;
      credentialGenerationId: string;
      originalPurchaseGenerationId: string;
      recoveryBindingId: string;
    };

type ShipmentReadInput = {
  credentials: LabelReadCredentials;
  expected: ExpectedLabelShipment;
};
type ShipmentBuyInput = {
  credentials: LabelPurchaseCredentials;
  expected: ExpectedLabelShipment;
};
```

All input objects strict; IDs/generation/binding validated; secret bounds/control/colon restrictions reuse the quote credential policy without prefix guessing. These are in-memory caller assertions, not cryptographic proof of authorization. The orchestrator must obtain them from the real uncached locked authorization/recovery-binding services, perform current eligibility checks, and commit the original fenced dispatch intent before calling buy. A recovery capability never type-checks or validates as purchase authorization. Do not pass database fences as a purported provider idempotency key.

`readEasyPostLabelShipment(input, {fetch?})` performs one GET to the literal `https://api.easypost.com/v2/shipments/<validated shipment ID>`. `buyEasyPostLabel(input, {fetch?})` performs one POST to that exact shipment's `/buy` with only `{rate:{id:expected.providerRateId}}`. No create, insurance, options, alternate endpoint, lookup-by-reference, rate refresh or asset fetch. Preflight is an invocation of the read transport plus the pure assessment described below; it is never hidden inside an automatic buy/retry loop.

## Exact proposed normalized observations

```ts
type VerifiedRate = {
  providerRateId: string;
  providerShipmentId: string;
  carrierAccountId: string;
  mode: "test";
  carrier: string;
  service: string;
  amount: UsdCents;
  currency: "USD";
};
type ExactFee = {
  type: string; // ASCII label 1..100, no controls
  usdDecimal: string;
  charged: boolean;
  refunded: boolean;
};
type FinancialEvidence = {
  selectedPostage: VerifiedRate | null;
  fees: ExactFee[] | null; // null means missing/invalid, never equivalent to []
  finalTotalKnown: false; // never sum rate plus PostageFee or promise final cost
};
type PurchaseEvidence = {
  providerShipmentId: string;
  mode: "test";
  evidence: "postage_label" | "selected_rate" | "both";
  postageLabelId: string | null;
  trackingCode: string | null;
  asset: "missing" | "disabled_pending_origin_policy";
  finances: FinancialEvidence;
  selection: "matches" | "mismatch" | "unverifiable";
  inputs: "matches" | "mismatch" | "unverifiable";
  price: "matches" | "mismatch" | "unverifiable";
  reviewCodes: Array<
    | "selected_rate_missing"
    | "selected_rate_invalid"
    | "selection_mismatch"
    | "input_mismatch"
    | "input_unverifiable"
    | "price_mismatch"
    | "fees_unverifiable"
    | "tracking_unavailable"
    | "label_metadata_unavailable"
  >; // unique, fixed vocabulary, bounded count
};
type ReadObservation =
  | { kind: "purchase_observed"; purchase: PurchaseEvidence }
  | {
      kind: "no_purchase_evidence";
      providerShipmentId: string;
      mode: "test";
      candidateRate: VerifiedRate | null;
      inputs: "matches" | "mismatch" | "unverifiable";
      rate: "matches" | "missing" | "mismatch" | "unverifiable";
    }
  | { kind: "unresolved"; reason: SafeReason };
type BuyObservation =
  | { kind: "purchase_observed"; purchase: PurchaseEvidence }
  | { kind: "unresolved"; reason: SafeReason };
type SafeReason =
  | "transport_timeout"
  | "transport_failure"
  | "invalid_response"
  | "identity_mismatch"
  | "purchase_in_progress"
  | "already_purchased"
  | "access_unavailable"
  | "not_found"
  | "provider_error";
```

All outputs normalized and explicitly projected, not raw passthrough. Missing fields are null/unverifiable, not guessed zeros or false guarantees. Buy deliberately has no `rejected` or `not_purchased` result in the initial transport: there is not yet an approved provider-code evidence policy proving final non-purchase. Shared lifecycle support for rejected does not require a transport to guess it. Local argument rejection throws one fixed safe pre-dispatch validation error before fetch; it is distinct from every post-call outcome.

## Positive purchase and partial evidence algorithm

1. Before trusting any nested evidence, require an authenticated fixed-endpoint response with object Shipment, exact expected shp\_ ID and test mode. A different identity/mode returns unresolved without carrying foreign IDs, amounts, addresses or label metadata into the purchase result.
2. Parse the postage and selected-rate evidence independently. A valid PostageLabel object/pl\_ ID is positive purchase evidence even when its URL is absent or selected_rate is null. A fully valid selected Rate with matching parent shipment/test mode is also positive purchase evidence even if postage metadata/asset is missing. Tracking code alone, status strings and arbitrary truthy objects are not sufficient evidence.
3. Preserve the positive signal if sibling rate/address/fee/asset data are absent, inconsistent or invalid: return purchase_observed with review flags. Never turn a known purchase into “safe to retry.” This requires layered parsers, not one all-or-nothing schema for the whole Shipment. A different selected rate/account on the same verified shipment produces selection mismatch; do not rewrite the accepted selection. A selected_rate nested shipment/mode mismatch is unusable evidence; independent valid postage can still retain the observed purchase with selected_rate_invalid.
4. The orchestrator may persist positive observed purchase plus review restrictions; it must block automatic dispatch whenever required identity/selection/input/price evidence is not matched. Operational conflict and asset usability are separate from the fact that a label was purchased. If both positive signals are unusable, preserve unknown. Parser failure must never leak raw Zod errors/response strings to logs or public endpoints.
5. A successful GET with no positive signals yields no_purchase_evidence, not an authorization to rebuy. If either postage or selected-rate fields have an invalid non-null shape, use unresolved/invalid_response rather than implying a clean negative observation. Missing/null negative fields may be observed but never prove terminal non-purchase after prior dispatch intent.

## Preflight versus recovery

Proposed pure assessment: first require a durable claim with no prior dispatch intent, intact allocation and current authorization. A no_purchase_evidence GET with complete matching input and candidate-rate evidence can pass first-buy preflight. Then recheck eligibility/generation/fence and persist intent. A positive purchase observation resolves/flags the existing operation instead of buying. When that observation precedes any Core dispatch intent, persist `observationSource: preflight` and transition the same fenced claimed record to purchased without fabricating intent, retaining its allocation. Buy/reconciliation completion of dispatching/unknown records requires the corresponding explicit observation source and existing intent. Terminal states are not reopened. Every mismatch, unavailable access, malformed response or unresolved observation blocks first dispatch. A no_purchase_evidence GET for any operation with current or historical dispatch intent remains unknown: no retry, no replacement shipment and no allocation release. Reconciliation repeats only exact GET under its own bounded claim/backoff.

Input comparison proposal: reject C0/C1; compare accepted versus provider name/company/street1/street2/city after trim, collapse runs of ASCII spaces, and ASCII case folding only. Null/empty optional fields mean absent; country and state compare canonical accepted codes. ZIP comparison remains exact (no automatic five-digit/ZIP+4 equivalence), with no punctuation stripping, abbreviation expansion, Unicode compatibility folding, address correction or fuzzy matching. Compare normalized one-decimal ounces/inches exactly; returned finer precision is not silently rounded. Omitted dimensions match null/absent, not a newly inferred package. This deliberately conservative policy may need review for benign provider normalization; it fails to manual review instead of accepting a changed destination. It must be tested against real approved test-account observations before operational activation.

A changed candidate rate/amount during preflight blocks buy and requires a fresh quote plus explicit confirmation. A different price discovered after purchase is retained as purchased with price_mismatch and an operational review restriction. No automatic refund, extra charge, replacement quote or dispatch. There is no provider-side max-price guarantee in this contract.

Fees use a separate exact decimal parser: proposed bounded signed USD decimal grammar `^-?(0|[1-9][0-9]{0,9})(\.[0-9]{1,12})?$`, no exponent/coercion/rounding; normalize trailing fractional zeros and negative zero without changing value. Twelve fractional places is a proposed structural limit, not a claimed provider maximum. Preserve each bounded valid fee type and charged/refunded flag; cap 100 entries. If any entry is invalid, fees=null plus fees_unverifiable; preserve positive purchase and selected postage. Do not add quote amount to a PostageFee and double-count postage. No integer-cent database column may silently absorb sub-cent values; storage design must choose exact decimal text/numeric with reviewed bounds or explicitly omit this evidence as unavailable.

## Error and resource policy

- One request per function, no library/transport retries. Fixed Basic key username, empty password; forbid redirects including credential forwarding. Explicitly injected fetch is for synthetic tests; no global fetch replacement. Neither transport performs database or asset operations.
- Retain the existing 15-second total asynchronous request/body deadline and 256-KiB streamed byte cap for the first slice; cap rates at100, fees100 and all strings. Abort fetch and cancel/release the reader; bound delayed body reads, declared/actual-size mismatch, malformed UTF-8/JSON and cancellation cleanup. An outer owner deadline must exceed each bounded call plus database work; GET and buy deadlines are separate, not an implicit30-second single lease. Timeout cannot prove the provider stopped; synchronous decoding can delay a JavaScript timer.
- Treat any non-2xx buy response as unresolved, even with a valid error envelope. Map only bounded allowlisted codes to safe diagnostic categories: POSTAGE.EXISTS→already_purchased, PURCHASE.IN_PROGRESS→purchase_in_progress, explicit provider timeouts/no-response→transport_timeout. These recommend exact GET, never buy. HTTP401/403→access_unavailable and404→not_found may be diagnostic but never evidence of no charge. Other errors remain provider_error; no raw code/message/suggestions are exposed. GET uses the same access/format uncertainty boundary.
- A syntactically valid error envelope cannot downgrade positively observed purchase from an earlier observation. Reconciliation I/O failure leaves prior evidence intact. A database write/commit acknowledgement failure after transport is orchestration uncertainty, not transport failure; read the durable fenced result and never repeat buy.
- No URLs are returned in this first interface. A valid postage label gives an ID and asset=disabled_pending_origin_policy; no valid label gives asset=missing. Download implementation remains disabled until exact HTTPS asset origins and private delivery policy are approved. Absence of an asset URL never permits repurchase.

## Minimum proof before integration

Synthetic table-driven tests should cover postage-only, selected-rate-only, both, neither, null selected_rate with valid postage, invalid sibling data, wrong parent/shipment/mode, selected account/rate mismatch, post-buy price difference, normalized-address differences, missing assets/tracking, sub-cent fees, no double counting, malformed fee preservation and forbidden secret/reflected values. Transport tests cover method/body/endpoint, redirects, 401/403/404/429/5xx, in-progress/already-purchased, stalls/timeout/oversize/malformed bytes and exactly one fetch. Reconciliation tests must prove that negative or failed GET never dispatches buy. All internal malformed-data errors are fixed safe values. Then real database orchestration/fencing and mounted admin projection tests establish persistence/security; a separately approved actual test-account exercise establishes provider compatibility. None is claimed by this design review.
