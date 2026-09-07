import { db } from "../db";
import {
  createShippingQuoteService,
  easyPostShippingQuoteAuthorization,
  type ShippingQuoteService,
} from "./ecommerce-shipping-quote-orchestration";
import { fetchEasyPostTestQuotes } from "./easypost-test-quote.service";

let instance: ShippingQuoteService | undefined;
function service() {
  return (instance ??= createShippingQuoteService({
    database: db,
    authorization: easyPostShippingQuoteAuthorization,
    transport: fetchEasyPostTestQuotes,
  }));
}

/** Shared runtime wiring; importing routes does not start work or access credentials. */
export const shippingQuoteService: ShippingQuoteService = {
  create: (...args) => service().create(...args),
  read: (...args) => service().read(...args),
  readiness: () => service().readiness(),
  maintain: (...args) => service().maintain(...args),
};
