import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { ecommerceOrders } from "./ecommerce";

export const ecommerceShippingQuoteAttempts = pgTable(
  "ecommerce_shipping_quote_attempts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id),
    requestKey: varchar("request_key", { length: 36 }).notNull(),
    contractVersion: text("contract_version").notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    acceptedSnapshotHash: varchar("accepted_snapshot_hash", { length: 64 }).notNull(),
    acceptedSnapshot: jsonb("accepted_snapshot").$type<Record<string, unknown> | null>(),
    locationId: varchar("location_id").notNull(),
    items: jsonb("items").$type<{ orderItemId: string; quantity: number }[]>().notNull(),
    provider: text("provider").notNull(),
    credentialGenerationId: varchar("credential_generation_id", { length: 128 }).notNull(),
    expectedMode: text("expected_mode").notNull(),
    observedMode: text("observed_mode"),
    status: text("status").notNull().default("pending"),
    providerShipmentId: varchar("provider_shipment_id", { length: 128 }),
    rates: jsonb("rates")
      .$type<Record<string, unknown>[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    errorCode: text("error_code"),
    fencingToken: varchar("fencing_token", { length: 36 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    redactedAt: timestamp("redacted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("shipping_quote_order_request").on(t.orderId, t.requestKey),
    uniqueIndex("shipping_quote_provider_identity").on(
      t.provider,
      t.credentialGenerationId,
      t.providerShipmentId,
    ),
    index("shipping_quote_pending_deadline").on(t.status, t.deadlineAt),
    index("shipping_quote_retention").on(t.status, t.completedAt),
    check("shipping_quote_state", sql`${t.status} IN ('pending','quoted','unavailable','unknown')`),
    check(
      "shipping_quote_mode",
      sql`${t.expectedMode} = 'test' AND (${t.observedMode} IS NULL OR ${t.observedMode} = 'test')`,
    ),
    check("shipping_quote_version", sql`${t.contractVersion} = '1.0.0'`),
    check(
      "shipping_quote_lifecycle",
      sql`(
    (${t.status} IN ('pending','unknown') AND ${t.completedAt} IS NULL AND ${t.redactedAt} IS NULL)
    OR (${t.status} IN ('quoted','unavailable') AND ${t.completedAt} IS NOT NULL)
  ) AND (${t.redactedAt} IS NULL OR ${t.acceptedSnapshot} IS NULL)
    AND (${t.redactedAt} IS NOT NULL OR ${t.acceptedSnapshot} IS NOT NULL)
    AND (${t.status} <> 'quoted' OR (${t.providerShipmentId} IS NOT NULL AND ${t.observedMode} IS NOT NULL AND ${t.observedMode} = 'test' AND jsonb_array_length(${t.rates}) > 0))
    AND (${t.providerShipmentId} IS NULL OR (${t.observedMode} IS NOT NULL AND ${t.observedMode} = 'test'))`,
    ),
  ],
);
