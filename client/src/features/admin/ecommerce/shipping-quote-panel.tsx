import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shippingQuoteRequestSchema } from "@shared/ecommerce-shipping-quote";
import { normalizeEasyPostParcel } from "@shared/ecommerce-shipping-parcel";
import {
  shippingQuoteResultSchema,
  type ShippingQuoteResult,
} from "@shared/ecommerce-shipping-quote-result";
import {
  readQuoteSession,
  writeQuoteSession,
  type QuoteDraft,
  type QuoteSession,
} from "./shipping-quote-session";
import type { Order } from "./ecommerce-page.types";
const readinessSchema = z
  .object({
    implemented: z.boolean(),
    configured: z.boolean(),
    approvedTestCredentials: z.boolean(),
    enabled: z.boolean(),
    mode: z.literal("test"),
    reasonCode: z
      .enum(["not_configured", "test_approval_required", "provider_inactive", "production_mode"])
      .nullable(),
  })
  .strict();
const locationsSchema = z.array(
  z.object({ id: z.string(), name: z.string(), active: z.boolean() }).passthrough(),
);
const readinessReasons = {
  not_configured: "Configure EasyPost test credentials in Shipping settings.",
  test_approval_required: "Test credentials require approval before quoting.",
  provider_inactive: "Enable the configured provider in Shipping settings.",
  production_mode: "Only approved test mode is supported for quotes.",
};
function initial(order: Order, remaining: Record<string, number>): QuoteSession {
  return {
    draft: {
      locationId: "",
      quantities: Object.fromEntries(
        order.items
          .filter((i) => i.requiresShipping === true)
          .map((i) => [i.id, String(remaining[i.id] ?? 0)]),
      ),
      weight: "",
      weightUnit: "oz",
      length: "",
      width: "",
      height: "",
      dimensionUnit: "in",
    },
  };
}
function buildRequest(draft: QuoteDraft) {
  if (
    Object.values(draft.quantities).some(
      (value) => !Number.isInteger(Number(value)) || Number(value) < 0,
    )
  )
    throw new Error("Invalid quantity");
  const dimensions = [draft.length, draft.width, draft.height];
  const body = shippingQuoteRequestSchema.parse({
    version: "1.0.0",
    locationId: draft.locationId,
    items: Object.entries(draft.quantities)
      .filter(([, v]) => Number(v) > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity: Number(quantity) }))
      .sort((a, b) => (a.orderItemId < b.orderItemId ? -1 : a.orderItemId > b.orderItemId ? 1 : 0)),
    parcel: {
      weight: Number(draft.weight),
      weightUnit: draft.weightUnit,
      ...(dimensions.some(Boolean)
        ? {
            dimensions: {
              length: Number(draft.length),
              width: Number(draft.width),
              height: Number(draft.height),
              unit: draft.dimensionUnit,
            },
          }
        : {}),
    },
  });
  const { dimensions: dim, ...weight } = body.parcel;
  const normalized = normalizeEasyPostParcel({
    ...weight,
    ...(dim
      ? { length: dim.length, width: dim.width, height: dim.height, distanceUnit: dim.unit }
      : {}),
  });
  return { body, normalized };
}
/** Parent keys this component by authenticated user and order. Drafts never share fulfillment state. */
export function ShippingQuotePanel({
  userId,
  order,
  remaining,
}: {
  userId: string;
  order: Order;
  remaining: Record<string, number>;
}) {
  const [session, setSession] = useState(
    () => readQuoteSession(userId, order.id) ?? initial(order, remaining),
  );
  const state = useRef(session);
  state.current = session;
  const mounted = useRef(true);
  const loadSequence = useRef(0);
  const [result, setResult] = useState<ShippingQuoteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      loadSequence.current += 1;
    };
  }, []);
  const locations = useQuery({
    queryKey: ["shipping-quote-locations", userId],
    queryFn: async () =>
      locationsSchema.parse(
        await (await apiRequest("GET", "/api/admin/ecommerce/shipping/locations")).json(),
      ),
  });
  const readiness = useQuery({
    queryKey: ["shipping-quote-readiness", userId],
    queryFn: async () =>
      readinessSchema.parse(
        await (
          await apiRequest(
            "GET",
            "/api/admin/ecommerce/shipping/providers/easypost/quote-readiness",
          )
        ).json(),
      ),
  });
  const base = `/api/admin/ecommerce/orders/${encodeURIComponent(order.id)}/shipping-quotes`;
  function save(next: QuoteSession, required = false) {
    const persisted = writeQuoteSession(userId, order.id, next);
    if (required && !persisted) {
      setError(
        "Session recovery storage is unavailable or full. Existing attempts have been kept.",
      );
      return false;
    }
    state.current = next;
    setSession(next);
    return persisted;
  }
  function update(field: keyof QuoteDraft, value: string) {
    save({ ...state.current, draft: { ...state.current.draft, [field]: value } });
  }
  async function load(attemptId: string) {
    const sequence = ++loadSequence.current;
    const requestKey = state.current.request?.key;
    const isCurrent = () =>
      mounted.current &&
      sequence === loadSequence.current &&
      state.current.request?.key === requestKey &&
      state.current.request?.attemptId === attemptId;
    setBusy(true);
    setError("");
    try {
      const parsed = shippingQuoteResultSchema.parse(
        await (await apiRequest("GET", `${base}/${encodeURIComponent(attemptId)}`)).json(),
      );
      if (parsed.id !== attemptId) throw new Error("Mismatched quote identity");
      if (isCurrent()) setResult(parsed);
    } catch {
      if (isCurrent())
        setError(
          "Quote status could not be loaded. Your draft and previous result have been kept.",
        );
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }
  useEffect(() => {
    const attemptId = state.current.request?.attemptId;
    if (attemptId) void load(attemptId);
  }, []);
  let prepared: ReturnType<typeof buildRequest> | null = null;
  try {
    prepared = buildRequest(session.draft);
  } catch {
    /* Incomplete drafts remain editable. */
  }
  const eligible =
    order.fulfillmentMode === "shipping" &&
    ["paid", "partially_refunded"].includes(order.paymentStatus) &&
    !["cancelled", "delivered"].includes(order.status) &&
    !["block", "manual_review"].includes(order.fraudDecision ?? "") &&
    order.fraudReviewStatus !== "rejected" &&
    !(order.fraudReviewStatus === "pending");
  const ready = Boolean(
    readiness.data?.implemented &&
    readiness.data.configured &&
    readiness.data.approvedTestCredentials &&
    readiness.data.enabled &&
    readiness.data.reasonCode === null,
  );
  const selectionsValid = prepared?.body.items.every(
    (i) =>
      order.items.some((item) => item.id === i.orderItemId && item.requiresShipping === true) &&
      i.quantity <= (remaining[i.orderItemId] ?? 0),
  );
  const locationValid = locations.data?.some((l) => l.id === session.draft.locationId && l.active);
  async function submit() {
    if (busy) return;
    const prior = state.current.request;
    if (prior?.attemptId) return;
    if (!prior && (!prepared || !ready || !eligible || !locationValid || !selectionsValid)) return;
    const request = prior ?? { key: crypto.randomUUID(), body: prepared!.body };
    const submitted = { ...state.current, request };
    if (!save(submitted, true)) {
      setError("Session recovery storage is unavailable or full. No quote request was sent.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const parsed = shippingQuoteResultSchema.parse(
        await (
          await apiRequest("POST", base, request.body, {
            headers: { "Idempotency-Key": request.key },
          })
        ).json(),
      );
      const stored = readQuoteSession(userId, order.id);
      if (stored?.request?.key !== request.key) return;
      const next = { ...stored, request: { ...request, attemptId: parsed.id } };
      const persisted = writeQuoteSession(userId, order.id, next);
      if (mounted.current) {
        state.current = next;
        setSession(next);
        setResult(parsed);
        if (!persisted)
          setError("Quote loaded, but reload recovery could not be saved. Keep this page open.");
      }
    } catch {
      if (mounted.current)
        setError(
          "Quote request could not be confirmed. Retry the same request to recover its status; your draft is saved.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section aria-label="Test shipping quotes" className="grid min-w-0 gap-4 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Test shipping quotes</h3>
        <p className="text-xs text-muted-foreground">
          Compare one package using approved EasyPost test credentials. Quotes do not change
          checkout prices or ship items. Label purchase is unavailable.
        </p>
      </div>
      {(locations.isPending || readiness.isPending) && <p role="status">Loading quote settings…</p>}
      {(locations.isError || readiness.isError) && (
        <div role="alert">
          Quote settings could not be loaded.{" "}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void locations.refetch();
              void readiness.refetch();
            }}
          >
            Retry quote settings
          </Button>
        </div>
      )}
      {readiness.data && !ready && (
        <p role="status">
          {readiness.data.reasonCode
            ? readinessReasons[readiness.data.reasonCode]
            : "Test rate quoting is not available yet."}
        </p>
      )}
      {!eligible && (
        <p role="status">Quotes require a paid, cleared shipping order with unfulfilled items.</p>
      )}
      <fieldset disabled={busy || Boolean(session.request)} className="grid min-w-0 gap-3">
        <legend className="sr-only">Package and items</legend>
        <div className="min-w-0">
          <Label htmlFor="quote-location">Quote fulfillment location</Label>
          <select
            id="quote-location"
            className="h-10 w-full min-w-0 rounded-md border bg-background px-2"
            value={session.draft.locationId}
            onChange={(e) => update("locationId", e.target.value)}
          >
            <option value="">Choose an active location</option>
            {locations.data
              ?.filter((l) => l.active)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
        </div>
        {order.items
          .filter((i) => i.requiresShipping === true)
          .map((item) => (
            <div key={item.id}>
              <Label htmlFor={`quote-item-${item.id}`}>
                {item.productName}: quantity to quote ({remaining[item.id] ?? 0} remaining)
              </Label>
              <Input
                id={`quote-item-${item.id}`}
                type="number"
                min="0"
                step="1"
                value={session.draft.quantities[item.id] ?? "0"}
                onChange={(e) =>
                  save({
                    ...state.current,
                    draft: {
                      ...state.current.draft,
                      quantities: { ...state.current.draft.quantities, [item.id]: e.target.value },
                    },
                  })
                }
              />
            </div>
          ))}
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="quote-weight">Package weight</Label>
            <Input
              id="quote-weight"
              type="number"
              min="0"
              step="any"
              value={session.draft.weight}
              onChange={(e) => update("weight", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="quote-weight-unit">Weight unit</Label>
            <select
              id="quote-weight-unit"
              className="h-10 w-full rounded-md border bg-background px-2"
              value={session.draft.weightUnit}
              onChange={(e) => update("weightUnit", e.target.value)}
            >
              {["oz", "lb", "g", "kg"].map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Dimensions are optional; enter all three if supplied.
        </p>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          {(["length", "width", "height"] as const).map((field) => (
            <div key={field}>
              <Label htmlFor={`quote-${field}`}>Package {field}</Label>
              <Input
                id={`quote-${field}`}
                type="number"
                min="0"
                step="any"
                value={session.draft[field]}
                onChange={(e) => update(field, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div>
          <Label htmlFor="quote-dimension-unit">Dimension unit</Label>
          <select
            id="quote-dimension-unit"
            className="h-10 w-full rounded-md border bg-background px-2"
            value={session.draft.dimensionUnit}
            onChange={(e) => update("dimensionUnit", e.target.value)}
          >
            {["in", "cm", "mm"].map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </fieldset>
      {prepared && (
        <p role="status">
          Normalized package: {prepared.normalized.weight.toFixed(1)} oz
          {prepared.normalized.length !== undefined
            ? `, ${prepared.normalized.length.toFixed(1)} × ${prepared.normalized.width!.toFixed(1)} × ${prepared.normalized.height!.toFixed(1)} in`
            : ""}
          .
        </p>
      )}
      {!session.request && !prepared && (
        <p className="text-sm">
          Choose items, a location and a positive package weight; complete all dimensions or leave
          them blank.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {!session.request && (
          <Button
            type="button"
            disabled={
              busy ||
              !ready ||
              locations.isError ||
              readiness.isError ||
              !eligible ||
              !prepared ||
              !locationValid ||
              !selectionsValid
            }
            onClick={() => void submit()}
          >
            Get test shipping rates
          </Button>
        )}
        {session.request && !session.request.attemptId && (
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            Retry same quote request
          </Button>
        )}
        {session.request?.attemptId && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void load(session.request!.attemptId!)}
          >
            Refresh quote status
          </Button>
        )}
        {session.request && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              const current = state.current;
              const history = current.history ?? [];
              if (history.length >= 5) {
                setError(
                  "Prior quote recovery is full. Review an existing attempt instead of discarding it.",
                );
                return;
              }
              if (
                !save(
                  {
                    draft: current.draft,
                    history: [
                      ...history,
                      {
                        draft: current.draft,
                        request: current.request!,
                        ...(result ? { result } : {}),
                      },
                    ],
                  },
                  true,
                )
              )
                return;
              loadSequence.current += 1;
              setResult(null);
              setError("");
            }}
          >
            New quote
          </Button>
        )}
      </div>
      {(session.history ?? []).length > 0 && (
        <div className="grid gap-2" aria-label="Prior quote attempts">
          <p className="text-sm">
            Previous attempts are retained for review; a new quote does not cancel them.
          </p>
          {session.history!.map((entry, index) => (
            <div key={entry.request.key} className="min-w-0 rounded border p-2">
              <p>
                Prior quote {index + 1}: {entry.result?.status ?? "unconfirmed"}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const current = state.current;
                  const history = (current.history ?? []).filter(
                    (item) => item.request.key !== entry.request.key,
                  );
                  if (current.request)
                    history.push({
                      draft: current.draft,
                      request: current.request,
                      ...(result ? { result } : {}),
                    });
                  if (!save({ draft: entry.draft, request: entry.request, history }, true)) return;
                  loadSequence.current += 1;
                  setResult(entry.result ?? null);
                  setError("");
                  if (entry.request.attemptId) void load(entry.request.attemptId);
                }}
              >
                Review prior quote {index + 1}
              </Button>
            </div>
          ))}
        </div>
      )}
      {busy && <p role="status">Checking quote…</p>}
      {result && (
        <div className="grid min-w-0 gap-3" aria-live="polite">
          <p>Quote status: {result.status}. Test mode.</p>
          {result.status === "pending" && (
            <p>The quote is processing. Refresh its status; do not submit another request.</p>
          )}
          {result.status === "unknown" && (
            <p>
              The provider outcome is unknown. Refresh checks this attempt only. A new quote creates
              a separate attempt.
            </p>
          )}
          {result.status === "unavailable" && (
            <p>
              {result.errorCode === "no_rates"
                ? "No test rates were returned for this package."
                : "Test rates are unavailable for this attempt."}
            </p>
          )}
          {result.stale && (
            <p role="alert">This quote is stale. Create a new quote for current rates.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Core freshness deadline (UTC): {result.expiresAt}. This is not a carrier price
            guarantee.
          </p>
          {result.rates.map((rate) => (
            <div key={rate.id} className="min-w-0 break-words rounded border p-3">
              <p>
                {rate.carrier} · {rate.service}
              </p>
              <p>
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                  rate.amount / 100,
                )}{" "}
                USD
              </p>
              <p>
                {rate.estimatedDays === null
                  ? "Delivery estimate unavailable"
                  : `Estimated delivery: ${rate.estimatedDays} days`}
                .{" "}
                {rate.deliveryGuaranteed === null
                  ? "Delivery guarantee unknown"
                  : rate.deliveryGuaranteed
                    ? "Provider reports guaranteed delivery"
                    : "Delivery is not guaranteed"}
                .
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
