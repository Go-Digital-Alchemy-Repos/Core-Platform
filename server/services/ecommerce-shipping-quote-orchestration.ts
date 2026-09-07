import { createHash } from "node:crypto";
import { and, eq, inArray, isNull, lte, ne } from "drizzle-orm";
import { z } from "zod";
import {
  ecommerceOrders,
  ecommerceOrderItems,
  ecommerceFulfillmentLocations,
  ecommerceFulfillments,
  ecommerceFulfillmentItems,
  ecommerceShippingQuoteAttempts,
  type EcommerceOrder,
} from "@shared/schema";
import {
  shippingQuoteRequestSchema,
  type ShippingQuoteRequest,
} from "@shared/ecommerce-shipping-quote";
import {
  shippingQuoteReadinessSchema,
  type ShippingQuoteReadiness,
} from "@shared/ecommerce-shipping-quote-readiness";
import type { db } from "../db";
import {
  EcommerceShippingQuotesStorage,
  shippingQuoteAcceptedSnapshotSchema,
  type ShippingQuoteTransaction,
} from "../storage/ecommerce-shipping-quotes.storage";
import { prepareShippingQuoteInputs } from "./ecommerce-shipping-quote-preparation";
import { projectShippingQuoteResult } from "./ecommerce-shipping-quote-result";
import type {
  ApprovedEasyPostTestCredentials,
  EasyPostQuoteShipment,
  EasyPostTestQuoteResult,
} from "./easypost-test-quote.service";

import * as credentialAuthorization from "./ecommerce-shipping-credential-authorization.service";

/** Real uncached authorization adapter; transport and database still require explicit injection. */
export const easyPostShippingQuoteAuthorization = {
  lockEasyPostCredentialAuthorization: credentialAuthorization.lockEasyPostCredentialAuthorization,
  readAuthorizedEasyPostTestCredentials:
    credentialAuthorization.readAuthorizedEasyPostTestCredentials,
  recheckEasyPostTestGeneration: credentialAuthorization.recheckEasyPostTestGeneration,
  readEasyPostQuoteAuthorizationReadiness:
    credentialAuthorization.readEasyPostQuoteAuthorizationReadiness,
  isAuthorizationDenied(error: unknown) {
    return (
      error instanceof credentialAuthorization.ShippingCredentialAuthorizationError &&
      [
        "credentials_unapproved",
        "credential_generation_changed",
        "provider_inactive",
        "provider_not_test",
        "credential_configuration_invalid",
      ].includes(error.code)
    );
  },
};

type Attempt = typeof ecommerceShippingQuoteAttempts.$inferSelect;
type Tx = ShippingQuoteTransaction;
export interface ShippingQuoteAuthorization {
  lockEasyPostCredentialAuthorization(tx: Tx): Promise<void>;
  readAuthorizedEasyPostTestCredentials(tx: Tx): Promise<ApprovedEasyPostTestCredentials>;
  recheckEasyPostTestGeneration(
    tx: Tx,
    generation: string,
  ): Promise<ApprovedEasyPostTestCredentials>;
  readEasyPostQuoteAuthorizationReadiness(tx: Tx): Promise<ShippingQuoteReadiness>;
  /** Must recognize only the concrete authorization error class's known denials, not DB failures. */
  isAuthorizationDenied(error: unknown): boolean;
}
const identifier = z.string().trim().min(1).max(128);
const fail = (message: string, statusCode: number) =>
  Object.assign(new Error(message), { statusCode });
const unavailable = () => fail("Shipping quotes are temporarily unavailable", 503);
const knownValidation = (error: unknown) =>
  error instanceof z.ZodError ||
  (error instanceof Error &&
    "statusCode" in error &&
    [400, 404, 409].includes(Number(error.statusCode)));
const snapshotHash = (value: unknown) => {
  const parsed = shippingQuoteAcceptedSnapshotSchema.parse(value);
  parsed.items.sort((a, b) =>
    a.orderItemId < b.orderItemId ? -1 : a.orderItemId > b.orderItemId ? 1 : 0,
  );
  return createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
};

/** No singleton, timers or implicit authorization/transport: mounting requires explicit dependencies. */
export function createShippingQuoteService(dependencies: {
  database: Pick<typeof db, "transaction">;
  authorization: ShippingQuoteAuthorization;
  transport: (
    credentials: ApprovedEasyPostTestCredentials,
    shipment: EasyPostQuoteShipment,
  ) => Promise<EasyPostTestQuoteResult>;
  storage?: EcommerceShippingQuotesStorage;
  now?: () => Date;
}) {
  const { database, authorization: auth, transport } = dependencies;
  const storage = dependencies.storage ?? new EcommerceShippingQuotesStorage();
  const now = dependencies.now ?? (() => new Date());
  const transact = database.transaction.bind(database);

  async function lockOrder(tx: Tx, orderId: string) {
    const [order] = await tx
      .select()
      .from(ecommerceOrders)
      .where(eq(ecommerceOrders.id, orderId))
      .for("update");
    if (!order) throw fail("Order not found", 404);
    return order;
  }
  async function prepare(tx: Tx, order: EcommerceOrder, input: ShippingQuoteRequest) {
    const [location] = await tx
      .select()
      .from(ecommerceFulfillmentLocations)
      .where(eq(ecommerceFulfillmentLocations.id, input.locationId))
      .for("update");
    const ordered = await tx
      .select()
      .from(ecommerceOrderItems)
      .where(eq(ecommerceOrderItems.orderId, order.id));
    const fulfilled = await tx
      .select({
        orderItemId: ecommerceFulfillmentItems.orderItemId,
        quantity: ecommerceFulfillmentItems.quantity,
        status: ecommerceFulfillments.status,
      })
      .from(ecommerceFulfillmentItems)
      .innerJoin(
        ecommerceFulfillments,
        eq(ecommerceFulfillmentItems.fulfillmentId, ecommerceFulfillments.id),
      )
      .where(eq(ecommerceFulfillments.orderId, order.id));
    return prepareShippingQuoteInputs({ input, order, location, ordered, fulfilled });
  }
  async function stale(tx: Tx, order: EcommerceOrder, attempt: Attempt) {
    if (attempt.expiresAt <= now() || !attempt.acceptedSnapshot) return true;
    try {
      await auth.recheckEasyPostTestGeneration(tx, attempt.credentialGenerationId);
    } catch (error) {
      if (auth.isAuthorizationDenied(error)) return true;
      throw error;
    }
    // The client parcel is immutable. Re-evaluate only current server inputs with a valid
    // placeholder parcel, then retain the accepted normalized parcel (which can exceed
    // the request's per-unit maximum after conversion). No provider request is made.
    const decoded = shippingQuoteAcceptedSnapshotSchema.safeParse(attempt.acceptedSnapshot);
    if (!decoded.success) throw unavailable();
    const accepted = decoded.data;
    try {
      const current = await prepare(tx, order, {
        version: "1.0.0",
        locationId: attempt.locationId,
        items: attempt.items,
        parcel: { weight: 1, weightUnit: "oz" },
      });
      return snapshotHash({ ...current, parcel: accepted.parcel }) !== attempt.acceptedSnapshotHash;
    } catch (error) {
      if (knownValidation(error)) return true;
      throw error;
    }
  }
  async function read(orderId: string, attemptId: string) {
    identifier.parse(orderId);
    identifier.parse(attemptId);
    try {
      return await transact(async (tx) => {
        await auth.lockEasyPostCredentialAuthorization(tx);
        const order = await lockOrder(tx, orderId);
        const found = await storage.get(tx, orderId, attemptId, now());
        if (!found) throw fail("Shipping quote not found", 404);
        return projectShippingQuoteResult(found, await stale(tx, order, found));
      });
    } catch (error) {
      if (knownValidation(error)) throw error;
      throw unavailable();
    }
  }
  async function finish(attempt: Attempt, result: unknown) {
    try {
      await transact(async (tx) => {
        await storage.complete(tx, attempt.id, attempt.fencingToken, result, now());
      });
    } catch {
      // A completion commit acknowledgement can be lost. Read the durable outcome before
      // attempting a fenced unknown transition; never repeat the provider call.
      try {
        await transact(async (tx) => {
          const [current] = await tx
            .select()
            .from(ecommerceShippingQuoteAttempts)
            .where(eq(ecommerceShippingQuoteAttempts.id, attempt.id))
            .for("update");
          if (current?.status === "pending" || current?.status === "unknown")
            await storage.complete(
              tx,
              attempt.id,
              attempt.fencingToken,
              { status: "unknown", errorCode: "interrupted" },
              now(),
            );
        });
      } catch {
        throw unavailable();
      }
    }
  }
  async function create(orderId: string, requestKey: string, rawRequest: unknown) {
    identifier.parse(orderId);
    z.string().uuid().parse(requestKey);
    const request = shippingQuoteRequestSchema.parse(rawRequest);
    let claim: {
      attempt: Attempt;
      replayed: boolean;
      credentials?: ApprovedEasyPostTestCredentials;
    };
    try {
      claim = await transact(async (tx) => {
        await auth.lockEasyPostCredentialAuthorization(tx);
        const order = await lockOrder(tx, orderId);
        const replay = await storage.replay(tx, orderId, requestKey, request);
        if (replay) return { attempt: replay, replayed: true };
        const credentials = await auth.readAuthorizedEasyPostTestCredentials(tx);
        const snapshot = await prepare(tx, order, request);
        const time = now();
        const result = await storage.claim(tx, {
          orderId,
          requestKey,
          request,
          snapshot,
          credentialGenerationId: credentials.credentialGenerationId,
          now: time,
          deadlineAt: new Date(time.getTime() + 30_000),
        });
        return { ...result, credentials };
      });
    } catch (error) {
      if (knownValidation(error)) throw error;
      if (auth.isAuthorizationDenied(error))
        throw fail("Shipping quote test authorization is required", 409);
      throw unavailable();
    }
    const { attempt } = claim;
    if (!claim.replayed) {
      let dispatch = false;
      try {
        dispatch = await transact(async (tx) => {
          await auth.lockEasyPostCredentialAuthorization(tx);
          await auth.recheckEasyPostTestGeneration(tx, attempt.credentialGenerationId);
          const current = await storage.get(tx, orderId, attempt.id, now());
          return current?.status === "pending" && current.fencingToken === attempt.fencingToken;
        });
      } catch (error) {
        if (!auth.isAuthorizationDenied(error)) throw unavailable();
        await finish(attempt, { status: "unavailable", errorCode: "configuration_changed" });
      }
      if (dispatch) {
        let result: unknown;
        try {
          const snapshot = shippingQuoteAcceptedSnapshotSchema.parse(attempt.acceptedSnapshot);
          const response = await transport(claim.credentials!, {
            from_address: snapshot.fromAddress,
            to_address: snapshot.toAddress,
            parcel: snapshot.parcel,
          });
          result =
            response.status === "quoted"
              ? {
                  status: "quoted",
                  rates: response.rates,
                  identity: {
                    providerShipmentId: response.providerShipmentId,
                    observedMode: response.mode,
                  },
                }
              : response.status === "unavailable"
                ? {
                    status: "unavailable",
                    errorCode: response.code,
                    ...(response.code === "no_rates"
                      ? {
                          identity: {
                            providerShipmentId: response.providerShipmentId,
                            observedMode: response.mode,
                          },
                        }
                      : {}),
                  }
                : { status: "unknown", errorCode: "transport_error" };
        } catch {
          result = { status: "unknown", errorCode: "transport_error" };
        }
        await finish(attempt, result);
      }
    }
    const quote = await read(orderId, attempt.id);
    return {
      quote,
      replayed: claim.replayed,
      statusCode:
        quote.status === "pending" || quote.status === "unknown" ? 202 : claim.replayed ? 200 : 201,
    };
  }
  async function readiness() {
    try {
      return shippingQuoteReadinessSchema.parse(
        await transact((tx) => auth.readEasyPostQuoteAuthorizationReadiness(tx)),
      );
    } catch {
      throw unavailable();
    }
  }
  async function maintain(batchSize = 100) {
    z.number().int().min(1).max(500).parse(batchSize);
    const time = now();
    return transact(async (tx) => {
      const pending = await tx
        .select({
          id: ecommerceShippingQuoteAttempts.id,
          orderId: ecommerceShippingQuoteAttempts.orderId,
        })
        .from(ecommerceShippingQuoteAttempts)
        .where(
          and(
            eq(ecommerceShippingQuoteAttempts.status, "pending"),
            lte(ecommerceShippingQuoteAttempts.deadlineAt, time),
          ),
        )
        .limit(batchSize)
        .for("update", { skipLocked: true });
      for (const row of pending) await storage.expirePending(tx, time, row.id, row.orderId);
      const terminal = await tx
        .select({ id: ecommerceShippingQuoteAttempts.id })
        .from(ecommerceShippingQuoteAttempts)
        .where(
          and(
            ne(ecommerceShippingQuoteAttempts.status, "pending"),
            ne(ecommerceShippingQuoteAttempts.status, "unknown"),
            isNull(ecommerceShippingQuoteAttempts.redactedAt),
            lte(
              ecommerceShippingQuoteAttempts.completedAt,
              new Date(time.getTime() - 30 * 86400_000),
            ),
          ),
        )
        .limit(batchSize)
        .for("update", { skipLocked: true });
      if (terminal.length)
        await tx
          .update(ecommerceShippingQuoteAttempts)
          .set({ acceptedSnapshot: null, redactedAt: time, updatedAt: time })
          .where(
            inArray(
              ecommerceShippingQuoteAttempts.id,
              terminal.map((row) => row.id),
            ),
          );
      return { expired: pending.length, redacted: terminal.length };
    });
  }
  return { create, read, readiness, maintain };
}
export type ShippingQuoteService = ReturnType<typeof createShippingQuoteService>;
