import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Lock, ShoppingBag } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CartItem, clearCart, formatMoney, readCart } from "./cart-store";

interface FormState {
  email: string;
  name: string;
  phone: string;
  address: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  couponCode: string;
  shippingRateId: string;
}

const initialForm: FormState = {
  email: "",
  name: "",
  phone: "",
  address: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  couponCode: "",
  shippingRateId: "",
};

interface StripeConfig {
  publishableKey: string;
  mode: "test" | "live";
}

interface PaymentIntentResponse {
  orderId: string;
  lookupToken: string;
  clientSecret: string;
  priced: {
    subtotalAmount: number;
    discountAmount: number;
    shippingAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
}

interface ShippingRateOption {
  id: string;
  name: string;
  description?: string | null;
  amount: number;
}

export function getStripeCheckoutUnavailableMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return "Secure card checkout is temporarily unavailable. Please contact support before placing this order.";
  }
  return "Secure card checkout is not available yet.";
}

function CheckoutPaymentForm({
  order,
  email,
}: {
  order: PaymentIntentResponse;
  email: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setIsConfirming(true);
    const returnUrl = `${window.location.origin}/order-success?orderId=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(order.lookupToken)}`;
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (error) {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
      setIsConfirming(false);
      return;
    }

    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing" || paymentIntent?.status === "requires_capture") {
      clearCart();
      setLocation(`/order-success?orderId=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(order.lookupToken)}`);
      return;
    }

    toast({
      title: "Payment pending",
      description: paymentIntent ? `Stripe returned status: ${paymentIntent.status}` : "Please check your payment details and try again.",
      variant: "destructive",
    });
    setIsConfirming(false);
  };

  return (
    <form onSubmit={confirmPayment} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <Button type="submit" className="w-full" disabled={!stripe || !elements || isConfirming}>
        {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
        Pay {formatMoney(order.priced.totalAmount)}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [shippingRates, setShippingRates] = useState<ShippingRateOption[]>([]);
  const [shippingQuoted, setShippingQuoted] = useState(false);
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const lastShippingQuoteKey = useRef("");
  const { toast } = useToast();
  useEffect(() => {
    const syncCart = () => setItems(readCart());
    syncCart();
    window.addEventListener("ecommerce-cart-changed", syncCart);
    return () => window.removeEventListener("ecommerce-cart-changed", syncCart);
  }, []);

  const { data: stripeConfig, error: stripeConfigError, isLoading: isStripeConfigLoading } = useQuery<StripeConfig>({
    queryKey: ["/api/ecommerce/stripe/config"],
  });

  useEffect(() => {
    if (stripeConfig?.publishableKey) {
      setStripePromise(loadStripe(stripeConfig.publishableKey));
    }
  }, [stripeConfig?.publishableKey]);

  const hasStripeConfig = Boolean(stripeConfig?.publishableKey);
  const canCreatePayment = hasStripeConfig && !isStripeConfigLoading;
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const selectedShippingRate = shippingRates.find((rate) => rate.id === form.shippingRateId);
  const shippingQuoteKey = useMemo(() => JSON.stringify({
    state: form.state.trim().toUpperCase(),
    items: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
    })),
  }), [form.state, items]);
  const elementsOptions = useMemo(
    () => intent?.clientSecret ? { clientSecret: intent.clientSecret, appearance: { theme: "stripe" as const } } : undefined,
    [intent?.clientSecret],
  );
  useEffect(() => {
    if (!shippingQuoted || shippingQuoteKey === lastShippingQuoteKey.current) return;
    setShippingQuoted(false);
    setShippingRates([]);
    setIntent(null);
    setForm((current) => ({ ...current, shippingRateId: "" }));
  }, [shippingQuoteKey, shippingQuoted]);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!shippingQuoted) {
        throw new Error("Update shipping rates before continuing.");
      }
      if (shippingRates.length > 0 && !form.shippingRateId) {
        throw new Error("Select a shipping method before continuing.");
      }
      const res = await apiRequest("POST", "/api/ecommerce/checkout/payment-intent", {
        items: items.map((item) => ({ productId: item.productId, variantId: item.variantId ?? undefined, quantity: item.quantity })),
        couponCode: form.couponCode || undefined,
        shippingRateId: form.shippingRateId || undefined,
        customer: { email: form.email, name: form.name, phone: form.phone || undefined },
        shippingAddress: {
          name: form.name,
          address: form.address,
          line2: form.line2 || undefined,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: "US",
        },
        billingSameAsShipping: true,
      });
      return res.json() as Promise<PaymentIntentResponse>;
    },
    onSuccess: (data) => {
      setIntent(data);
    },
    onError: (error: Error) => toast({ title: "Checkout failed", description: error.message, variant: "destructive" }),
  });
  const shippingQuoteMutation = useMutation({
    mutationFn: async () => {
      const quoteKey = shippingQuoteKey;
      const res = await apiRequest("POST", "/api/ecommerce/shipping/rates", {
        items: items.map((item) => ({ productId: item.productId, variantId: item.variantId ?? undefined, quantity: item.quantity })),
        address: {
          country: "US",
          state: form.state,
        },
      });
      return { rates: await res.json() as ShippingRateOption[], quoteKey };
    },
    onSuccess: ({ rates, quoteKey }) => {
      lastShippingQuoteKey.current = quoteKey;
      setShippingRates(rates);
      setShippingQuoted(true);
      setForm((current) => ({
        ...current,
        shippingRateId: rates.some((rate) => rate.id === current.shippingRateId)
          ? current.shippingRateId
          : rates[0]?.id ?? "",
      }));
    },
    onError: (error: Error) => toast({ title: "Shipping rates unavailable", description: error.message, variant: "destructive" }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!items.length) return;
    mutation.mutate();
  };

  return (
    <PageLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-semibold">Checkout</h1>
            <p className="mt-2 text-muted-foreground">Pricing is recalculated securely on the server.</p>
          </div>
          <Button asChild variant="outline"><Link href="/cart">Back to cart</Link></Button>
        </div>
        {items.length === 0 ? (
          <Card><CardContent className="p-10 text-center"><p className="text-muted-foreground">Your cart is empty.</p><Button asChild className="mt-6"><Link href="/shop">Shop products</Link></Button></CardContent></Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Customer and shipping</CardTitle>
                <CardDescription>Guest checkout is supported. Use your email to look up the order later.</CardDescription>
              </CardHeader>
              <CardContent>
                <form id="checkout-details-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                  {([
                    ["email", "Email"],
                    ["name", "Full name"],
                    ["phone", "Phone"],
                    ["address", "Address"],
                    ["line2", "Address line 2"],
                    ["city", "City"],
                    ["state", "State"],
                    ["zip", "ZIP"],
                    ["couponCode", "Coupon code"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className={key === "address" || key === "couponCode" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        type={key === "email" ? "email" : "text"}
                        required={!["phone", "line2", "couponCode"].includes(key)}
                        value={form[key]}
                        disabled={Boolean(intent)}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, [key]: event.target.value }));
                        }}
                      />
                    </div>
                  ))}
                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Label>Shipping method</Label>
                        <p className="text-sm text-muted-foreground">Rates are selected from active shipping zones and calculated on the server.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={Boolean(intent) || shippingQuoteMutation.isPending || !form.state.trim()}
                        onClick={() => shippingQuoteMutation.mutate()}
                      >
                        {shippingQuoteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Update rates
                      </Button>
                    </div>
                    {shippingQuoted ? (
                      shippingRates.length ? (
                        <RadioGroup
                          value={form.shippingRateId}
                          onValueChange={(shippingRateId) => setForm((current) => ({ ...current, shippingRateId }))}
                          className="gap-3"
                        >
                          {shippingRates.map((rate) => (
                            <label key={rate.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                              <RadioGroupItem value={rate.id} className="mt-1" disabled={Boolean(intent)} />
                              <span className="flex flex-1 justify-between gap-4">
                                <span>
                                  <span className="block font-medium">{rate.name}</span>
                                  {rate.description ? <span className="text-sm text-muted-foreground">{rate.description}</span> : null}
                                </span>
                                <span className="font-semibold">{formatMoney(rate.amount)}</span>
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      ) : (
                        <p className="rounded-lg border p-3 text-sm text-muted-foreground">No paid shipping rates matched this address. Checkout will continue with no shipping charge.</p>
                      )
                    ) : (
                      <p className="rounded-lg border p-3 text-sm text-muted-foreground">Enter the shipping state and update rates before payment.</p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Order summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => <div key={item.productId} className="flex justify-between gap-4 text-sm"><span>{item.name} x {item.quantity}</span><span>{formatMoney(item.unitPrice * item.quantity)}</span></div>)}
                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold"><span>Estimated subtotal</span><span>{formatMoney(intent?.priced.subtotalAmount ?? subtotal)}</span></div>
                  {!intent && selectedShippingRate ? (
                    <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                      <span>Selected shipping</span>
                      <span>{formatMoney(selectedShippingRate.amount)}</span>
                    </div>
                  ) : null}
                  {intent ? (
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(intent.priced.discountAmount)}</span></div>
                      <div className="flex justify-between"><span>Tax</span><span>{formatMoney(intent.priced.taxAmount)}</span></div>
                      <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(intent.priced.shippingAmount)}</span></div>
                      <div className="flex justify-between border-t pt-2 text-base font-semibold text-foreground"><span>Total</span><span>{formatMoney(intent.priced.totalAmount)}</span></div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Final tax, discount, and Stripe PaymentIntent totals are calculated by the server.</p>
                  )}
                </div>
                {isStripeConfigLoading ? (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                    Checking secure checkout availability...
                  </div>
                ) : !hasStripeConfig ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    {getStripeCheckoutUnavailableMessage(stripeConfigError)}
                  </div>
                ) : null}
                {!intent ? (
                  <Button type="submit" form="checkout-details-form" className="w-full" disabled={mutation.isPending || !canCreatePayment}>
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    {mutation.isPending ? "Creating payment..." : "Continue to payment"}
                  </Button>
                ) : stripePromise && elementsOptions ? (
                  <Elements stripe={stripePromise} options={elementsOptions}>
                    <CheckoutPaymentForm order={intent} email={form.email} />
                  </Elements>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
