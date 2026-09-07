// Persistence foundation only: no label purchase, dispatch, or provider operation is enabled.
import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  check,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core";
import {
  ecommerceOrders,
  ecommerceOrderItems,
  ecommerceFulfillmentLocations,
  ecommerceFulfillments,
} from "./ecommerce";
import { ecommerceShippingQuoteAttempts } from "./ecommerce-shipping-quotes";

export type LabelDomesticAddress = {
  name?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: "US";
};
export type LabelPurchaseSnapshot = {
  version: 1;
  quoteVersion: "1.0.0";
  orderId: string;
  quoteAttemptId: string;
  locationId: string;
  currency: "USD";
  items: { orderItemId: string; quantity: number }[];
  fromAddress: LabelDomesticAddress;
  toAddress: LabelDomesticAddress;
  parcel: { weight: number; length?: number; width?: number; height?: number };
};
export type LabelVerifiedRate = {
  providerRateId: string;
  providerShipmentId: string;
  carrierAccountId: string;
  mode: "test";
  carrier: string;
  service: string;
  amount: number;
  currency: "USD";
};
// usdDecimal: canonical signed decimal, up to10 integer and12 fractional digits; no exponent, coercion or rounding.
export type LabelExactFee = {
  type: string;
  usdDecimal: string;
  charged: boolean;
  refunded: boolean;
};
export type LabelReviewCode =
  | "selected_rate_missing"
  | "selected_rate_invalid"
  | "selection_mismatch"
  | "input_mismatch"
  | "input_unverifiable"
  | "price_mismatch"
  | "fees_unverifiable"
  | "tracking_unavailable"
  | "label_metadata_unavailable";
// Application writes MUST strictly validate the fixed JSON shapes/bounds in the shipping-label transport contract; SQL bounds alone are not a deep JSON validator.

export const ecommerceShippingLabelPurchases = pgTable(
  "ecommerce_shipping_label_purchases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id").notNull(),
    quoteAttemptId: varchar("quote_attempt_id").notNull(),
    locationId: varchar("location_id").notNull(),
    requestKey: varchar("request_key", { length: 36 }).notNull(),
    contractVersion: integer("contract_version")
      .notNull()
      .default(sql`1`),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    acceptedQuoteHash: varchar("accepted_quote_hash", { length: 64 }).notNull(),
    acceptedSnapshotHash: varchar("accepted_snapshot_hash", { length: 64 }).notNull(),
    acceptedSnapshot: jsonb("accepted_snapshot").$type<LabelPurchaseSnapshot | null>(),
    provider: text("provider")
      .notNull()
      .default(sql`'easypost'`),
    expectedMode: text("expected_mode")
      .notNull()
      .default(sql`'test'`),
    observedMode: text("observed_mode"),
    observationSource: text("observation_source"),
    providerShipmentId: varchar("provider_shipment_id", { length: 128 }).notNull(),
    selectedRateId: varchar("selected_rate_id", { length: 128 }).notNull(),
    carrierAccountId: varchar("carrier_account_id", { length: 128 }).notNull(),
    credentialGenerationId: varchar("credential_generation_id", { length: 36 }).notNull(),
    confirmedRateAmount: integer("confirmed_rate_amount").notNull(),
    currency: text("currency")
      .notNull()
      .default(sql`'USD'`),
    state: text("state")
      .notNull()
      .default(sql`'claimed'`),
    claimFence: varchar("claim_fence", { length: 36 }).notNull(),
    claimDeadlineAt: timestamp("claim_deadline_at", { withTimezone: true }).notNull(),
    dispatchIntentAt: timestamp("dispatch_intent_at", { withTimezone: true }),
    observedPostageLabelId: varchar("observed_postage_label_id", { length: 128 }),
    observedSelectedRate: jsonb("observed_selected_rate").$type<LabelVerifiedRate | null>(),
    fees: jsonb("fees").$type<LabelExactFee[] | null>(),
    feesComplete: boolean("fees_complete")
      .notNull()
      .default(sql`false`),
    finalTotalKnown: boolean("final_total_known")
      .notNull()
      .default(sql`false`),
    trackingCode: text("tracking_code"),
    selectionAssessment: text("selection_assessment")
      .notNull()
      .default(sql`'unverifiable'`),
    inputAssessment: text("input_assessment")
      .notNull()
      .default(sql`'unverifiable'`),
    priceAssessment: text("price_assessment")
      .notNull()
      .default(sql`'unverifiable'`),
    reviewCodes: jsonb("review_codes")
      .$type<LabelReviewCode[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    assetStatus: text("asset_status")
      .notNull()
      .default(sql`'disabled_pending_origin_policy'`),
    fulfillmentId: varchar("fulfillment_id"),
    initiatingActorId: varchar("initiating_actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    purchaseCompletedAt: timestamp("purchase_completed_at", { withTimezone: true }),
    operationalResolvedAt: timestamp("operational_resolved_at", { withTimezone: true }),
    redactedAt: timestamp("redacted_at", { withTimezone: true }),
  },
  (t) => [
    index("shipping_label_retention").on(t.operationalResolvedAt, t.redactedAt),
    index("shipping_label_pending_deadline").on(t.state, t.claimDeadlineAt),
    check("shipping_label_version", sql`contract_version=1`),
    check(
      "shipping_label_modes",
      sql`provider='easypost' AND expected_mode='test' AND (observed_mode IS NULL OR observed_mode='test') AND currency='USD'`,
    ),
    check(
      "shipping_label_identifiers",
      sql`request_key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND claim_fence ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND credential_generation_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND request_hash ~ '^[0-9a-f]{64}$' AND accepted_quote_hash ~ '^[0-9a-f]{64}$' AND accepted_snapshot_hash ~ '^[0-9a-f]{64}$' AND provider_shipment_id ~ '^shp_[A-Za-z0-9]{1,100}$' AND selected_rate_id ~ '^rate_[A-Za-z0-9]{1,100}$' AND carrier_account_id ~ '^ca_[A-Za-z0-9]{1,100}$' AND (observed_postage_label_id IS NULL OR observed_postage_label_id ~ '^pl_[A-Za-z0-9]{1,100}$')`,
    ),
    check(
      "shipping_label_state",
      sql`state IN ('claimed','dispatching','purchased','unknown','rejected','cancelled_before_dispatch')`,
    ),
    check(
      "shipping_label_intent",
      sql`(state IN ('claimed','cancelled_before_dispatch') AND dispatch_intent_at IS NULL) OR (state IN ('dispatching','unknown','rejected') AND dispatch_intent_at IS NOT NULL) OR (state='purchased' AND observation_source IS NOT NULL AND ((observation_source='preflight' AND dispatch_intent_at IS NULL) OR (observation_source IN ('buy','reconciliation') AND dispatch_intent_at IS NOT NULL)))`,
    ),
    check(
      "shipping_label_clock",
      sql`claim_deadline_at>created_at AND updated_at>=created_at AND (dispatch_intent_at IS NULL OR dispatch_intent_at>=created_at) AND (purchase_completed_at IS NULL OR purchase_completed_at>=created_at) AND (operational_resolved_at IS NULL OR operational_resolved_at>=created_at)`,
    ),
    check(
      "shipping_label_terminal",
      sql`(state IN ('claimed','dispatching','unknown') AND purchase_completed_at IS NULL AND operational_resolved_at IS NULL AND redacted_at IS NULL) OR (state IN ('purchased','rejected','cancelled_before_dispatch') AND purchase_completed_at IS NOT NULL)`,
    ),
    check(
      "shipping_label_purchase_evidence",
      sql`state<>'purchased' OR (observed_mode IS NOT NULL AND observed_mode='test' AND (observed_postage_label_id IS NOT NULL OR observed_selected_rate IS NOT NULL))`,
    ),
    check(
      "shipping_label_observation_source",
      sql`(state='purchased' AND observation_source IS NOT NULL AND observation_source IN ('preflight','buy','reconciliation')) OR (state<>'purchased' AND observation_source IS NULL)`,
    ),
    check(
      "shipping_label_fees",
      sql`final_total_known=false AND ((fees_complete=false AND fees IS NULL) OR (fees_complete=true AND fees IS NOT NULL AND jsonb_typeof(fees)='array' AND jsonb_array_length(fees)<=100 AND octet_length(fees::text)<=65536))`,
    ),
    check(
      "shipping_label_operational_resolution",
      sql`operational_resolved_at IS NULL OR state IN ('rejected','cancelled_before_dispatch') OR (state='purchased' AND fulfillment_id IS NOT NULL)`,
    ),
    check("shipping_label_money", sql`confirmed_rate_amount>=0`),
    check(
      "shipping_label_assessments",
      sql`selection_assessment IN ('matches','mismatch','unverifiable') AND input_assessment IN ('matches','mismatch','unverifiable') AND price_assessment IN ('matches','mismatch','unverifiable')`,
    ),
    check(
      "shipping_label_asset",
      sql`asset_status IN ('missing','disabled_pending_origin_policy') AND (tracking_code IS NULL OR (length(tracking_code) BETWEEN 1 AND 200 AND tracking_code !~ '[[:cntrl:]]'))`,
    ),
    check(
      "shipping_label_review_codes",
      sql`jsonb_typeof(review_codes)='array' AND jsonb_array_length(review_codes)<=9 AND review_codes <@ '["selected_rate_missing","selected_rate_invalid","selection_mismatch","input_mismatch","input_unverifiable","price_mismatch","fees_unverifiable","tracking_unavailable","label_metadata_unavailable"]'::jsonb`,
    ),
    check(
      "shipping_label_snapshot",
      sql`((redacted_at IS NULL AND accepted_snapshot IS NOT NULL AND jsonb_typeof(accepted_snapshot)='object' AND octet_length(accepted_snapshot::text)<=65536) OR (redacted_at IS NOT NULL AND accepted_snapshot IS NULL AND operational_resolved_at IS NOT NULL AND redacted_at>=operational_resolved_at+interval '30 days'))`,
    ),
    check(
      "shipping_label_observed_rate",
      sql`observed_selected_rate IS NULL OR (jsonb_typeof(observed_selected_rate)='object' AND octet_length(observed_selected_rate::text)<=4096)`,
    ),
    check(
      "shipping_label_dispatch_link",
      sql`fulfillment_id IS NULL OR (state='purchased' AND selection_assessment='matches' AND input_assessment='matches' AND price_assessment='matches' AND review_codes='[]'::jsonb AND operational_resolved_at IS NOT NULL)`,
    ),
    foreignKey({
      name: "shipping_label_order_fk",
      columns: [t.orderId],
      foreignColumns: [ecommerceOrders.id],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    foreignKey({
      name: "shipping_label_quote_order_fk",
      columns: [t.quoteAttemptId, t.orderId],
      foreignColumns: [ecommerceShippingQuoteAttempts.id, ecommerceShippingQuoteAttempts.orderId],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    foreignKey({
      name: "shipping_label_location_fk",
      columns: [t.locationId],
      foreignColumns: [ecommerceFulfillmentLocations.id],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    foreignKey({
      name: "shipping_label_fulfillment_order_fk",
      columns: [t.fulfillmentId, t.orderId],
      foreignColumns: [ecommerceFulfillments.id, ecommerceFulfillments.orderId],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    uniqueIndex("shipping_label_purchase_order_identity").on(t.id, t.orderId),
    uniqueIndex("shipping_label_purchase_request").on(t.orderId, t.requestKey),
    uniqueIndex("shipping_label_shipment_identity").on(
      t.provider,
      t.expectedMode,
      t.providerShipmentId,
    ),
    uniqueIndex("shipping_label_fulfillment_once").on(t.fulfillmentId),
  ],
);
export type EcommerceShippingLabelPurchases = typeof ecommerceShippingLabelPurchases.$inferSelect;

export const ecommerceShippingLabelAllocations = pgTable(
  "ecommerce_shipping_label_allocations",
  {
    purchaseId: varchar("purchase_id").notNull(),
    orderId: varchar("order_id").notNull(),
    orderItemId: varchar("order_item_id").notNull(),
    quantity: integer("quantity").notNull(),
    state: text("state")
      .notNull()
      .default(sql`'held'`),
    fulfillmentId: varchar("fulfillment_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    transitionedAt: timestamp("transitioned_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("shipping_label_allocation_capacity").on(t.orderId, t.state, t.orderItemId),
    primaryKey({ columns: [t.purchaseId, t.orderItemId] }),
    check("shipping_label_allocation_quantity", sql`quantity BETWEEN 1 AND 1000000`),
    check("shipping_label_allocation_state", sql`state IN ('held','consumed','released')`),
    check(
      "shipping_label_allocation_consumption",
      sql`(state='consumed' AND fulfillment_id IS NOT NULL) OR (state IN ('held','released') AND fulfillment_id IS NULL)`,
    ),
    check("shipping_label_allocation_clock", sql`transitioned_at>=created_at`),
    foreignKey({
      name: "shipping_label_allocation_purchase_fk",
      columns: [t.purchaseId, t.orderId],
      foreignColumns: [ecommerceShippingLabelPurchases.id, ecommerceShippingLabelPurchases.orderId],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    foreignKey({
      name: "shipping_label_allocation_item_fk",
      columns: [t.orderItemId, t.orderId],
      foreignColumns: [ecommerceOrderItems.id, ecommerceOrderItems.orderId],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    foreignKey({
      name: "shipping_label_allocation_fulfillment_fk",
      columns: [t.fulfillmentId, t.orderId],
      foreignColumns: [ecommerceFulfillments.id, ecommerceFulfillments.orderId],
    })
      .onDelete("no action")
      .onUpdate("no action"),
  ],
);
export type EcommerceShippingLabelAllocations =
  typeof ecommerceShippingLabelAllocations.$inferSelect;

export const ecommerceShippingLabelOperations = pgTable(
  "ecommerce_shipping_label_operations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    purchaseId: varchar("purchase_id").notNull(),
    orderId: varchar("order_id").notNull(),
    operationKey: varchar("operation_key", { length: 36 }).notNull(),
    kind: text("kind").notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    fencingToken: varchar("fencing_token", { length: 36 }).notNull(),
    leaseDeadlineAt: timestamp("lease_deadline_at", { withTimezone: true }).notNull(),
    status: text("status")
      .notNull()
      .default(sql`'claimed'`),
    actorId: varchar("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("shipping_label_operation_expiry").on(t.status, t.leaseDeadlineAt),
    uniqueIndex("shipping_label_operation_single_claim")
      .on(t.purchaseId, t.kind)
      .where(sql`status='claimed'`),
    check("shipping_label_operation_kind", sql`kind IN ('reconcile','rebind','dispatch')`),
    check(
      "shipping_label_operation_identifiers",
      sql`operation_key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND fencing_token ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND request_hash ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "shipping_label_operation_clock",
      sql`lease_deadline_at>created_at AND (completed_at IS NULL OR completed_at>=created_at)`,
    ),
    check(
      "shipping_label_operation_status",
      sql`(status IN ('claimed','unknown') AND completed_at IS NULL) OR (status='completed' AND completed_at IS NOT NULL)`,
    ),
    foreignKey({
      name: "shipping_label_operation_purchase_fk",
      columns: [t.purchaseId, t.orderId],
      foreignColumns: [ecommerceShippingLabelPurchases.id, ecommerceShippingLabelPurchases.orderId],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    uniqueIndex("shipping_label_operation_request").on(t.purchaseId, t.kind, t.operationKey),
    uniqueIndex("shipping_label_operation_identity").on(t.id, t.purchaseId, t.orderId),
  ],
);
export type EcommerceShippingLabelOperations = typeof ecommerceShippingLabelOperations.$inferSelect;

export const ecommerceShippingLabelEvents = pgTable(
  "ecommerce_shipping_label_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    purchaseId: varchar("purchase_id").notNull(),
    orderId: varchar("order_id").notNull(),
    operationId: varchar("operation_id"),
    eventKey: varchar("event_key", { length: 36 }).notNull(),
    action: text("action").notNull(),
    actorId: varchar("actor_id"),
    happenedAt: timestamp("happened_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    fromState: text("from_state"),
    toState: text("to_state"),
    credentialGenerationId: varchar("credential_generation_id", { length: 36 }),
    evidenceReference: text("evidence_reference"),
  },
  (t) => [
    index("shipping_label_event_history").on(t.purchaseId, t.happenedAt, t.id),
    check(
      "shipping_label_event_action",
      sql`action IN ('confirmation','claim','dispatch_intent','purchase_observed','unknown_observed','rejection','cancelled_before_dispatch','reconciliation','credential_rebind','dispatch','asset_access','redaction')`,
    ),
    check(
      "shipping_label_event_identifiers",
      sql`event_key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' AND (credential_generation_id IS NULL OR credential_generation_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')`,
    ),
    check(
      "shipping_label_event_states",
      sql`(from_state IS NULL OR from_state IN ('claimed','dispatching','purchased','unknown','rejected','cancelled_before_dispatch')) AND (to_state IS NULL OR to_state IN ('claimed','dispatching','purchased','unknown','rejected','cancelled_before_dispatch'))`,
    ),
    check(
      "shipping_label_event_reference",
      sql`evidence_reference IS NULL OR (length(evidence_reference) BETWEEN 1 AND 256 AND evidence_reference !~ '[[:cntrl:]]')`,
    ),
    foreignKey({
      name: "shipping_label_event_purchase_fk",
      columns: [t.purchaseId, t.orderId],
      foreignColumns: [ecommerceShippingLabelPurchases.id, ecommerceShippingLabelPurchases.orderId],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    foreignKey({
      name: "shipping_label_event_operation_fk",
      columns: [t.operationId, t.purchaseId, t.orderId],
      foreignColumns: [
        ecommerceShippingLabelOperations.id,
        ecommerceShippingLabelOperations.purchaseId,
        ecommerceShippingLabelOperations.orderId,
      ],
    })
      .onDelete("no action")
      .onUpdate("no action"),
    uniqueIndex("shipping_label_event_once").on(t.purchaseId, t.eventKey),
  ],
);
export type EcommerceShippingLabelEvents = typeof ecommerceShippingLabelEvents.$inferSelect;
