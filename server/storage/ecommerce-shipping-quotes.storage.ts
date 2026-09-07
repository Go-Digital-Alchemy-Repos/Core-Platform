import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { US_STATES } from "@shared/ecommerce-shipping-settings";
import { db } from "../db";
import { ecommerceShippingQuoteAttempts as attempts } from "@shared/schema";
import {
  shippingQuoteRequestSchema,
  SHIPPING_QUOTE_CONTRACT_VERSION,
} from "@shared/ecommerce-shipping-quote";

export type ShippingQuoteTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const id = z.string().trim().min(1).max(128);
const text = z
  .string()
  .refine(
    (value) =>
      !Array.from(value).some((char) => {
        const code = char.charCodeAt(0);
        return code < 32 || (code >= 127 && code <= 159);
      }),
  )
  .pipe(z.string().trim().min(1).max(200));
const compareId = (a: { orderItemId: string }, b: { orderItemId: string }) =>
  a.orderItemId < b.orderItemId ? -1 : a.orderItemId > b.orderItemId ? 1 : 0;
const measurement = z
  .number()
  .finite()
  .positive()
  .max(1_000_000_000)
  .refine((n) => Math.abs(n * 10 - Math.round(n * 10)) < 0.000001);
const address = z
  .object({
    name: text.optional(),
    company: text.optional(),
    street1: text,
    street2: text.optional(),
    city: text,
    state: z.string().refine((value) => US_STATES.some(([code]) => code === value)),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    country: z.literal("US"),
  })
  .strict()
  .refine((value) => Boolean(value.name || value.company));
export const shippingQuoteAcceptedSnapshotSchema = z
  .object({
    version: z.literal(SHIPPING_QUOTE_CONTRACT_VERSION),
    orderId: id,
    locationId: id,
    currency: z.literal("USD"),
    items: shippingQuoteRequestSchema.innerType().shape.items,
    fromAddress: address,
    toAddress: address,
    parcel: z
      .object({
        weight: measurement,
        length: measurement.optional(),
        width: measurement.optional(),
        height: measurement.optional(),
      })
      .strict()
      .refine((p) => [p.length, p.width, p.height].filter((n) => n !== undefined).length % 3 === 0),
  })
  .strict();
export type ShippingQuoteAcceptedSnapshot = z.infer<typeof shippingQuoteAcceptedSnapshotSchema>;
const rateSchema = z
  .object({
    providerRateId: z
      .string()
      .regex(/^rate_[A-Za-z0-9]+$/)
      .max(128),
    providerShipmentId: z
      .string()
      .regex(/^shp_[A-Za-z0-9]+$/)
      .max(128),
    carrierAccountId: z.string().regex(/^ca_[A-Za-z0-9]{1,100}$/),
    carrier: text,
    service: text,
    amount: z.number().int().min(0).max(2147483647),
    currency: z.literal("USD"),
    mode: z.literal("test"),
    estimatedDays: z.number().int().min(0).max(365).nullable(),
    deliveryGuaranteed: z.boolean().nullable(),
  })
  .strict();
const verifiedIdentity = z
  .object({
    providerShipmentId: z
      .string()
      .regex(/^shp_[A-Za-z0-9]+$/)
      .max(128),
    observedMode: z.literal("test"),
  })
  .strict();
const completionSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("quoted"),
      identity: verifiedIdentity,
      rates: z.array(rateSchema).min(1).max(200),
    })
    .strict(),
  z
    .object({
      status: z.literal("unavailable"),
      identity: verifiedIdentity.optional(),
      errorCode: z.enum(["provider_rejected", "no_rates", "configuration_changed"]),
    })
    .strict(),
  z
    .object({
      status: z.literal("unknown"),
      identity: verifiedIdentity.optional(),
      errorCode: z.enum(["request_timeout", "transport_error", "invalid_response", "interrupted"]),
    })
    .strict(),
]);
const conflict = () =>
  Object.assign(new Error("shipping_quote_request_conflict"), { statusCode: 409 });
const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function shippingQuoteRequestHash(input: unknown) {
  const parsed = shippingQuoteRequestSchema.parse(input);
  return sha({
    ...parsed,
    items: [...parsed.items].sort(compareId),
  });
}
function date(value: Date) {
  return z.date().parse(value);
}

/** Caller owns credential/order locking and commit; never dispatch while this transaction is open. */
export class EcommerceShippingQuotesStorage {
  async replay(
    tx: ShippingQuoteTransaction,
    orderId: string,
    requestKey: string,
    request: unknown,
  ) {
    id.parse(orderId);
    z.string().uuid().parse(requestKey);
    const hash = shippingQuoteRequestHash(request);
    const [row] = await tx
      .select()
      .from(attempts)
      .where(and(eq(attempts.orderId, orderId), eq(attempts.requestKey, requestKey)));
    if (row && row.requestHash !== hash) throw conflict();
    return row ?? null;
  }

  async claim(
    tx: ShippingQuoteTransaction,
    input: {
      orderId: string;
      requestKey: string;
      request: unknown;
      snapshot: unknown;
      credentialGenerationId: string;
      now: Date;
      deadlineAt: Date;
    },
  ) {
    // Replay must precede even snapshot validation: current addresses/settings are irrelevant to replay.
    const replay = await this.replay(tx, input.orderId, input.requestKey, input.request);
    if (replay) return { attempt: replay, replayed: true };
    const now = date(input.now),
      deadline = date(input.deadlineAt);
    if (deadline <= now || deadline.getTime() - now.getTime() > 60_000)
      throw new Error("shipping_quote_invalid_deadline");
    const request = shippingQuoteRequestSchema.parse(input.request);
    const snapshot = shippingQuoteAcceptedSnapshotSchema.parse(input.snapshot);
    snapshot.items.sort(compareId);
    if (
      snapshot.orderId !== input.orderId ||
      snapshot.locationId !== request.locationId ||
      JSON.stringify(snapshot.items) !== JSON.stringify([...request.items].sort(compareId))
    )
      throw new Error("shipping_quote_snapshot_mismatch");
    const [row] = await tx
      .insert(attempts)
      .values({
        orderId: input.orderId,
        requestKey: input.requestKey,
        contractVersion: SHIPPING_QUOTE_CONTRACT_VERSION,
        requestHash: shippingQuoteRequestHash(request),
        acceptedSnapshotHash: sha(snapshot),
        acceptedSnapshot: snapshot,
        locationId: snapshot.locationId,
        items: snapshot.items,
        provider: "easypost",
        credentialGenerationId: id.parse(input.credentialGenerationId),
        expectedMode: "test",
        status: "pending",
        fencingToken: randomUUID(),
        createdAt: now,
        updatedAt: now,
        deadlineAt: deadline,
        expiresAt: new Date(now.getTime() + 15 * 60_000),
      })
      .onConflictDoNothing({ target: [attempts.orderId, attempts.requestKey] })
      .returning();
    if (row) return { attempt: row, replayed: false };
    const winner = await this.replay(tx, input.orderId, input.requestKey, input.request);
    if (!winner) throw new Error("shipping_quote_claim_unavailable");
    return { attempt: winner, replayed: true };
  }

  async complete(
    tx: ShippingQuoteTransaction,
    attemptId: string,
    fencingToken: string,
    result: unknown,
    now: Date,
  ) {
    id.parse(attemptId);
    z.string().uuid().parse(fencingToken);
    date(now);
    const parsed = completionSchema.parse(result);
    const rates = parsed.status === "quoted" ? parsed.rates : [];
    if (
      parsed.status === "quoted" &&
      (new Set(rates.map((r) => r.providerRateId)).size !== rates.length ||
        rates.some((r) => r.providerShipmentId !== parsed.identity.providerShipmentId))
    )
      throw new Error("shipping_quote_rate_identity_mismatch");
    const [row] = await tx
      .update(attempts)
      .set({
        status: parsed.status,
        rates,
        ...(parsed.identity ? parsed.identity : {}),
        errorCode: parsed.status === "quoted" ? null : parsed.errorCode,
        completedAt: parsed.status === "unknown" ? null : now,
        updatedAt: now,
      })
      .where(
        and(
          eq(attempts.id, attemptId),
          eq(attempts.fencingToken, fencingToken),
          inArray(attempts.status, ["pending", "unknown"]),
          parsed.identity
            ? or(
                isNull(attempts.providerShipmentId),
                and(
                  eq(attempts.providerShipmentId, parsed.identity.providerShipmentId),
                  eq(attempts.observedMode, parsed.identity.observedMode),
                ),
              )
            : undefined,
        ),
      )
      .returning();
    return row ?? null;
  }

  /** Expiry does not rotate the token: only the original owner can resolve a late response. */
  async expirePending(
    tx: ShippingQuoteTransaction,
    now: Date,
    attemptId?: string,
    orderId?: string,
  ) {
    date(now);
    return tx
      .update(attempts)
      .set({ status: "unknown", errorCode: "request_timeout", updatedAt: now })
      .where(
        and(
          eq(attempts.status, "pending"),
          lte(attempts.deadlineAt, now),
          attemptId ? eq(attempts.id, id.parse(attemptId)) : undefined,
          orderId ? eq(attempts.orderId, id.parse(orderId)) : undefined,
        ),
      )
      .returning();
  }

  async get(tx: ShippingQuoteTransaction, orderId: string, attemptId: string, now: Date) {
    id.parse(orderId);
    id.parse(attemptId);
    date(now);
    await this.expirePending(tx, now, attemptId, orderId);
    const [row] = await tx
      .select()
      .from(attempts)
      .where(and(eq(attempts.id, attemptId), eq(attempts.orderId, orderId)));
    return row ? { ...row, stale: row.expiresAt <= now } : null;
  }

  /** Current order/location/generation staleness is a service responsibility, not inferred here. */
  async redactTerminalSnapshots(tx: ShippingQuoteTransaction, now: Date) {
    date(now);
    return tx
      .update(attempts)
      .set({ acceptedSnapshot: null, redactedAt: now, updatedAt: now })
      .where(
        and(
          inArray(attempts.status, ["quoted", "unavailable"]),
          isNull(attempts.redactedAt),
          lte(attempts.completedAt, new Date(now.getTime() - 30 * 24 * 60 * 60_000)),
        ),
      )
      .returning({ id: attempts.id });
  }
}
