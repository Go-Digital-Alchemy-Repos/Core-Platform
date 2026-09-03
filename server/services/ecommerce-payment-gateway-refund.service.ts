import { getEcommerceStripeClient } from "./ecommerce-stripe.service";
import {
  assertEcommerceIntegrationOperational,
  getEcommerceIntegrationAdapterDefinition,
} from "./ecommerce-integration-adapter.service";

export const ECOMMERCE_REFUND_PROVIDERS = [
  "stripe",
  "paypal",
  "square",
  "authorize_net",
  "braintree",
  "adyen",
  "amazon_pay",
  "klarna",
  "afterpay",
] as const;

export type EcommerceRefundProvider = (typeof ECOMMERCE_REFUND_PROVIDERS)[number];

interface GatewayRefundOrder {
  id: string;
  stripePaymentIntentId?: string | null;
}

interface GatewayRefundParams {
  provider: EcommerceRefundProvider;
  order: GatewayRefundOrder;
  amount: number;
  reasonCode?: string;
  idempotencyKey: string;
}

export interface GatewayRefundResult {
  providerRefundId?: string;
  status: "pending" | "processed" | "failed";
}

export function isEcommerceRefundProvider(provider: string): provider is EcommerceRefundProvider {
  return ECOMMERCE_REFUND_PROVIDERS.includes(provider as EcommerceRefundProvider);
}

export function getRefundProviderDisplayName(provider: string) {
  return getEcommerceIntegrationAdapterDefinition(provider)?.displayName ?? provider;
}

export function assertPaymentGatewayRefundReady(
  provider: EcommerceRefundProvider,
  order: GatewayRefundOrder,
) {
  assertEcommerceIntegrationOperational(provider, "payment_refund");
  if (provider === "stripe" && !order.stripePaymentIntentId) {
    throw new Error("Order does not have a Stripe payment intent");
  }
  if (provider !== "stripe") {
    throw new Error(
      `${getRefundProviderDisplayName(provider)} refund adapter is not implemented yet`,
    );
  }
}

export async function createPaymentGatewayRefund(
  params: GatewayRefundParams,
): Promise<GatewayRefundResult> {
  assertPaymentGatewayRefundReady(params.provider, params.order);

  if (params.provider === "stripe") {
    const stripe = await getEcommerceStripeClient();
    const refund = await stripe.refunds.create(
      {
        payment_intent: params.order.stripePaymentIntentId!,
        amount: params.amount,
        reason:
          params.reasonCode === "fraudulent"
            ? "fraudulent"
            : params.reasonCode === "duplicate"
              ? "duplicate"
              : "requested_by_customer",
        metadata: {
          orderId: params.order.id,
          provider: params.provider,
          localRefundId: params.idempotencyKey,
        },
      },
      { idempotencyKey: `ecommerce_refund_${params.idempotencyKey}` },
    );
    return {
      providerRefundId: refund.id,
      status: refund.status === "succeeded" ? "processed" : "pending",
    };
  }

  throw new Error(`${getRefundProviderDisplayName(params.provider)} refund adapter is unavailable`);
}
