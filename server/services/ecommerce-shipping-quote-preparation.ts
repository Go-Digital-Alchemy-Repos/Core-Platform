import type {
  EcommerceOrder,
  EcommerceOrderItem,
  EcommerceFulfillmentLocation,
} from "@shared/schema";
import { US_STATES } from "@shared/ecommerce-shipping-settings";
import { shippingQuoteRequestSchema } from "@shared/ecommerce-shipping-quote";
import {
  assertOrderShippable,
  assertRemainingFulfillmentQuantities,
  fulfillmentError,
} from "./ecommerce-fulfillment-validation";
import {
  normalizeEasyPostParcel,
  type ShippingProviderAddress,
} from "./ecommerce-shipping-carrier.service";

function addressText(value: string | null | undefined, required: boolean): string | undefined {
  if (
    value != null &&
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 ||
        (character.charCodeAt(0) >= 127 && character.charCodeAt(0) <= 159),
    )
  )
    throw fulfillmentError("Shipping address contains unsupported control characters");
  const text = value?.trim();
  if ((!text && required) || (text && text.length > 200))
    throw fulfillmentError("Shipping address is incomplete or exceeds supported length");
  return text || undefined;
}

/** Local eligibility only; this does not verify deliverability with a carrier. */
export function normalizeDomesticQuoteAddress(
  address: ShippingProviderAddress,
): ShippingProviderAddress {
  const country = addressText(address.country, true)!.toUpperCase();
  const stateInput = addressText(address.state, true)!;
  const state = US_STATES.find(
    ([code, name]) =>
      code === stateInput.toUpperCase() || name.toLowerCase() === stateInput.toLowerCase(),
  )?.[0];
  if (country !== "US" || !state)
    throw fulfillmentError("Shipping quotes currently support US states and DC only");
  const zip = addressText(address.zip, true)!;
  if (!/^\d{5}(-\d{4})?$/.test(zip)) throw fulfillmentError("A valid US ZIP code is required");
  const name = addressText(address.name, false);
  const company = addressText(address.company, false);
  if (!name && !company) throw fulfillmentError("A shipping recipient or company is required");
  return {
    name,
    company,
    street1: addressText(address.street1, true)!,
    street2: addressText(address.street2, false),
    city: addressText(address.city, true)!,
    state,
    zip,
    country,
  };
}

/** Caller must read these rows under the claim transaction's order/location locks. */
export function prepareShippingQuoteInputs(params: {
  input: unknown;
  order: EcommerceOrder | undefined;
  location: EcommerceFulfillmentLocation | undefined;
  ordered: EcommerceOrderItem[];
  fulfilled: Array<{ orderItemId: string; quantity: number; status: string }>;
}) {
  const request = shippingQuoteRequestSchema.parse(params.input);
  const order = assertOrderShippable(params.order);
  if (order.fulfillmentMode !== "shipping")
    throw fulfillmentError("Shipping quotes require a shipping order");
  const location = params.location;
  if (!location || location.id !== request.locationId || !location.active)
    throw fulfillmentError("Choose an active fulfillment location");
  const selected = new Set(request.items.map((item) => item.orderItemId));
  const ordered = params.ordered.filter((item) => item.orderId === order.id);
  if (ordered.some((item) => selected.has(item.id) && !item.requiresShipping))
    throw fulfillmentError("Shipping quotes cannot include non-shipping items");
  assertRemainingFulfillmentQuantities(request.items, ordered, params.fulfilled);
  const fromAddress = normalizeDomesticQuoteAddress({
    name: location.name,
    street1: location.address ?? "",
    street2: location.line2 ?? undefined,
    city: location.city ?? "",
    state: location.state ?? undefined,
    zip: location.postalCode ?? "",
    country: location.country,
  });
  const toAddress = normalizeDomesticQuoteAddress({
    name: order.shippingName ?? undefined,
    company: order.shippingCompany ?? undefined,
    street1: order.shippingAddress ?? "",
    street2: order.shippingLine2 ?? undefined,
    city: order.shippingCity ?? "",
    state: order.shippingState ?? undefined,
    zip: order.shippingZip ?? "",
    country: order.shippingCountry ?? "",
  });
  const { dimensions, ...weight } = request.parcel;
  let parcel: ReturnType<typeof normalizeEasyPostParcel>;
  try {
    parcel = normalizeEasyPostParcel({
      ...weight,
      ...(dimensions
        ? {
            length: dimensions.length,
            width: dimensions.width,
            height: dimensions.height,
            distanceUnit: dimensions.unit,
          }
        : {}),
    });
  } catch {
    throw fulfillmentError("Parcel measurements cannot be represented for shipping quotes");
  }
  return {
    version: request.version,
    orderId: order.id,
    locationId: location.id,
    currency: "USD" as const,
    fromAddress,
    toAddress,
    parcel,
    items: [...request.items].sort((a, b) =>
      a.orderItemId < b.orderItemId ? -1 : a.orderItemId > b.orderItemId ? 1 : 0,
    ),
  };
}
