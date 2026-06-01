import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Lock, MapPin, ShoppingBag, UserPlus } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { getCountryLabel, getRegionOptions, type EcommerceStoreSettings } from "@shared/ecommerce-shipping-settings";
import { CartItem, clearCart, formatMoney, readCart } from "./cart-store";

type CheckoutAccountMode = "guest" | "create_account";
type CustomerAccountMode = "optional" | "required" | "guest_only";

interface FormState {
  email: string;
  name: string;
  phone: string;
  address: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  couponCode: string;
  shippingRateId: string;
  accountMode: CheckoutAccountMode;
  password: string;
  confirmPassword: string;
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
  country: "US",
  couponCode: "",
  shippingRateId: "",
  accountMode: "create_account",
  password: "",
  confirmPassword: "",
};

interface StripeConfig {
  publishableKey: string;
  mode: "test" | "live";
}

interface PaymentIntentResponse {
  orderId: string;
  lookupToken: string;
  clientSecret: string;
  accountCreated?: boolean;
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

interface CheckoutSettings {
  customerAccountMode: CustomerAccountMode;
  store?: EcommerceStoreSettings;
}

interface AccountAddress {
  id: string;
  label: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  address: string;
  line2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
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
  const [selectedAddressId, setSelectedAddressId] = useState("custom");
  const lastShippingQuoteKey = useRef("");
  const { toast } = useToast();
  const { user } = useAuth();
  useEffect(() => {
    const syncCart = () => setItems(readCart());
    syncCart();
    window.addEventListener("ecommerce-cart-changed", syncCart);
    return () => window.removeEventListener("ecommerce-cart-changed", syncCart);
  }, []);

  const { data: stripeConfig, error: stripeConfigError, isLoading: isStripeConfigLoading } = useQuery<StripeConfig>({
    queryKey: ["/api/ecommerce/stripe/config"],
  });
  const { data: checkoutSettings } = useQuery<CheckoutSettings>({
    queryKey: ["/api/ecommerce/checkout/settings"],
  });
  const { data: savedAddresses = [] } = useQuery<AccountAddress[]>({
    queryKey: ["/api/ecommerce/account/addresses"],
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (stripeConfig?.publishableKey) {
      setStripePromise(loadStripe(stripeConfig.publishableKey));
    }
  }, [stripeConfig?.publishableKey]);

  const hasStripeConfig = Boolean(stripeConfig?.publishableKey);
  const customerAccountMode = checkoutSettings?.customerAccountMode ?? "optional";
  const isAccountRequired = customerAccountMode === "required";
  const isGuestOnly = customerAccountMode === "guest_only";
  const canCreatePayment = hasStripeConfig && !isStripeConfigLoading;
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const selectedShippingRate = shippingRates.find((rate) => rate.id === form.shippingRateId);
  const allowedCountries = checkoutSettings?.store?.allowedCountries?.length
    ? checkoutSettings.store.allowedCountries
    : ["US"];
  const countryOptions = allowedCountries.map((code) => [code, getCountryLabel(code)] as const);
  const eligibleSavedAddresses = savedAddresses.filter((address) => allowedCountries.includes(address.country));
  const regionOptions = getRegionOptions(form.country);
  const regionLabel = form.country === "CA" ? "Province / territory" : form.country === "US" ? "State" : "Region";
  const shippingQuoteKey = useMemo(() => JSON.stringify({
    country: form.country.trim().toUpperCase(),
    state: form.state.trim().toUpperCase(),
    items: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
    })),
  }), [form.country, form.state, items]);
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
  useEffect(() => {
    if (allowedCountries.includes(form.country)) return;
    setForm((current) => ({
      ...current,
      country: allowedCountries[0] ?? "US",
      state: "",
      shippingRateId: "",
    }));
  }, [allowedCountries, form.country]);
  const applySavedAddress = (address: AccountAddress) => {
    setSelectedAddressId(address.id);
    setForm((current) => ({
      ...current,
      name: address.name || current.name,
      phone: address.phone || current.phone,
      address: address.address,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      zip: address.zipCode,
      country: address.country,
      shippingRateId: "",
    }));
    setShippingQuoted(false);
    setShippingRates([]);
    setIntent(null);
  };
  useEffect(() => {
    if (!user || selectedAddressId !== "custom" || form.address || !eligibleSavedAddresses.length) return;
    const defaultAddress = eligibleSavedAddresses.find((address) => address.isDefault) ?? eligibleSavedAddresses[0];
    applySavedAddress(defaultAddress);
  }, [eligibleSavedAddresses, form.address, selectedAddressId, user]);
  const mutation = useMutation({
    mutationFn: async () => {
      const normalizedAccountMode: CheckoutAccountMode = isGuestOnly
        ? "guest"
        : isAccountRequired
          ? "create_account"
          : form.accountMode;
      if (normalizedAccountMode === "create_account" && !user) {
        if (form.password.length < 8) throw new Error("Use at least 8 characters for your account password.");
        if (form.password !== form.confirmPassword) throw new Error("Password confirmation does not match.");
      }
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
        account: {
          mode: user ? "guest" : normalizedAccountMode,
          password: !user && normalizedAccountMode === "create_account" ? form.password : undefined,
        },
        shippingAddress: {
          name: form.name,
          address: form.address,
          line2: form.line2 || undefined,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
        billingSameAsShipping: true,
      });
      return res.json() as Promise<PaymentIntentResponse>;
    },
    onSuccess: (data) => {
      setIntent(data);
      if (data.accountCreated) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
    onError: (error: Error) => toast({ title: "Checkout failed", description: error.message, variant: "destructive" }),
  });
  const shippingQuoteMutation = useMutation({
    mutationFn: async () => {
      const quoteKey = shippingQuoteKey;
      const res = await apiRequest("POST", "/api/ecommerce/shipping/rates", {
        items: items.map((item) => ({ productId: item.productId, variantId: item.variantId ?? undefined, quantity: item.quantity })),
        address: {
          country: form.country,
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
                <CardTitle>Account setup</CardTitle>
                <CardDescription>
                  {user?.role === "client"
                    ? "You are signed in. This order will be saved to your account."
                    : isGuestOnly
                      ? "This store supports guest checkout only. Use your email to receive order updates."
                      : isAccountRequired
                        ? "Create an account to continue checkout and track future orders."
                        : "Create an account for order history, saved details, and faster future checkout."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!user && !isGuestOnly ? (
                  <div className="mb-6 space-y-4 rounded-lg border p-4">
                    <RadioGroup
                      value={isAccountRequired ? "create_account" : form.accountMode}
                      onValueChange={(accountMode) => setForm((current) => ({ ...current, accountMode: accountMode as CheckoutAccountMode }))}
                      className="grid gap-3 md:grid-cols-2"
                    >
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                        <RadioGroupItem value="create_account" className="mt-1" disabled={Boolean(intent) || isAccountRequired} />
                        <span>
                          <span className="flex items-center gap-2 font-medium"><UserPlus className="h-4 w-4" /> Create account</span>
                          <span className="text-sm text-muted-foreground">Save orders and shipping details for next time.</span>
                        </span>
                      </label>
                      {!isAccountRequired ? (
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                          <RadioGroupItem value="guest" className="mt-1" disabled={Boolean(intent)} />
                          <span>
                            <span className="font-medium">Continue as guest</span>
                            <span className="block text-sm text-muted-foreground">We will email secure order status links.</span>
                          </span>
                        </label>
                      ) : null}
                    </RadioGroup>
                    {(isAccountRequired || form.accountMode === "create_account") ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            minLength={8}
                            value={form.password}
                            disabled={Boolean(intent)}
                            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            minLength={8}
                            value={form.confirmPassword}
                            disabled={Boolean(intent)}
                            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <form id="checkout-details-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                  <CheckoutTextField id="email" label="Email" type="email" value={form.email} disabled={Boolean(intent)} onChange={(email) => setForm((current) => ({ ...current, email }))} />
                  <CheckoutTextField id="name" label="Full name" value={form.name} disabled={Boolean(intent)} onChange={(name) => setForm((current) => ({ ...current, name }))} />
                  <CheckoutTextField id="phone" label="Phone" value={form.phone} required={false} disabled={Boolean(intent)} onChange={(phone) => setForm((current) => ({ ...current, phone }))} />
                  {user && eligibleSavedAddresses.length ? (
                    <div className="space-y-3 sm:col-span-2">
                      <div>
                        <Label>Delivery address</Label>
                        <p className="text-sm text-muted-foreground">Choose a saved address or enter a different delivery address below.</p>
                      </div>
                      <RadioGroup
                        value={selectedAddressId}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setSelectedAddressId("custom");
                            return;
                          }
                          const savedAddress = eligibleSavedAddresses.find((item) => item.id === value);
                          if (savedAddress) applySavedAddress(savedAddress);
                        }}
                        className="grid gap-3 md:grid-cols-2"
                      >
                        {eligibleSavedAddresses.map((address) => (
                          <label key={address.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                            <RadioGroupItem value={address.id} className="mt-1" disabled={Boolean(intent)} />
                            <span>
                              <span className="flex items-center gap-2 font-medium">
                                <MapPin className="h-4 w-4" />
                                {address.label}
                              </span>
                              <span className="block text-sm text-muted-foreground">
                                {[address.address, address.line2, address.city, address.state, address.zipCode].filter(Boolean).join(", ")}
                              </span>
                            </span>
                          </label>
                        ))}
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                          <RadioGroupItem value="custom" className="mt-1" disabled={Boolean(intent)} />
                          <span>
                            <span className="font-medium">Use a different address</span>
                            <span className="block text-sm text-muted-foreground">Enter a one-time delivery address for this order.</span>
                          </span>
                        </label>
                      </RadioGroup>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={form.country}
                      disabled={Boolean(intent)}
                      onValueChange={(country) => setForm((current) => ({
                        ...current,
                        country,
                        state: "",
                        shippingRateId: "",
                      }))}
                    >
                      <SelectTrigger id="country"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {countryOptions.map(([code, name]) => (
                          <SelectItem key={code} value={code}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <CheckoutTextField id="address" label="Address" value={form.address} disabled={Boolean(intent)} className="sm:col-span-2" onChange={(address) => setForm((current) => ({ ...current, address }))} />
                  <CheckoutTextField id="line2" label="Address line 2" value={form.line2} required={false} disabled={Boolean(intent)} onChange={(line2) => setForm((current) => ({ ...current, line2 }))} />
                  <CheckoutTextField id="city" label="City" value={form.city} disabled={Boolean(intent)} onChange={(city) => setForm((current) => ({ ...current, city }))} />
                  <div className="space-y-2">
                    <Label htmlFor="state">{regionLabel}</Label>
                    {regionOptions.length ? (
                      <Select
                        value={form.state}
                        disabled={Boolean(intent)}
                        onValueChange={(state) => setForm((current) => ({ ...current, state, shippingRateId: "" }))}
                      >
                        <SelectTrigger id="state"><SelectValue placeholder={`Select ${regionLabel.toLowerCase()}`} /></SelectTrigger>
                        <SelectContent>
                          {regionOptions.map(([code, name]) => (
                            <SelectItem key={code} value={code}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="state"
                        value={form.state}
                        disabled={Boolean(intent)}
                        onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                      />
                    )}
                  </div>
                  <CheckoutTextField id="zip" label={form.country === "US" ? "ZIP" : "Postal code"} value={form.zip} disabled={Boolean(intent)} onChange={(zip) => setForm((current) => ({ ...current, zip }))} />
                  <CheckoutTextField id="couponCode" label="Coupon code" value={form.couponCode} required={false} disabled={Boolean(intent)} className="sm:col-span-2" onChange={(couponCode) => setForm((current) => ({ ...current, couponCode }))} />
                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Label>Shipping method</Label>
                        <p className="text-sm text-muted-foreground">Rates are selected from active shipping zones and calculated on the server.</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={Boolean(intent) || shippingQuoteMutation.isPending || !form.country.trim() || (regionOptions.length > 0 && !form.state.trim())}
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
                      <p className="rounded-lg border p-3 text-sm text-muted-foreground">Choose your shipping country and {regionLabel.toLowerCase()} to update rates before payment.</p>
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

function CheckoutTextField(props: {
  id: keyof FormState;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className={props.className ? `space-y-2 ${props.className}` : "space-y-2"}>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        required={props.required ?? true}
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}
