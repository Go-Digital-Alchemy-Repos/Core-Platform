import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, Percent, Save, Settings, Truck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  COMMON_ECOMMERCE_COUNTRIES,
  ECOMMERCE_TIMEZONES,
  getCountriesForShippingMode,
  getRegionOptions,
  type EcommerceShippingDestinationMode,
  type EcommerceStoreSettings,
} from "@shared/ecommerce-shipping-settings";

interface StripeSettingsStatus {
  activeMode: "test" | "live";
  testPublishableKey: string;
  livePublishableKey: string;
  hasTestSecretKey: boolean;
  hasLiveSecretKey: boolean;
  hasTestWebhookSecret: boolean;
  hasLiveWebhookSecret: boolean;
}

interface TaxSettingsStatus {
  enabled: boolean;
  manualRateBps: number;
  taxShipping: boolean;
  stripeTaxEnabled: boolean;
}

type CustomerAccountMode = "optional" | "required" | "guest_only";

interface CustomerAccountSettingsStatus {
  customerAccountMode: CustomerAccountMode;
}

type StoreOriginField = keyof EcommerceStoreSettings["storeOrigin"];

function csv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SettingsTab() {
  const { data } = useQuery<StripeSettingsStatus>({
    queryKey: ["/api/admin/ecommerce/settings/stripe"],
  });
  const { data: taxData } = useQuery<TaxSettingsStatus>({
    queryKey: ["/api/admin/ecommerce/settings/tax"],
  });
  const { data: customerAccountData } = useQuery<CustomerAccountSettingsStatus>({
    queryKey: ["/api/admin/ecommerce/settings/customer-accounts"],
  });
  const { data: storeData } = useQuery<EcommerceStoreSettings>({
    queryKey: ["/api/admin/ecommerce/settings/store"],
  });
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState("test");
  const [testPublishableKey, setTestPublishableKey] = useState("");
  const [testSecretKey, setTestSecretKey] = useState("");
  const [testWebhookSecret, setTestWebhookSecret] = useState("");
  const [livePublishableKey, setLivePublishableKey] = useState("");
  const [liveSecretKey, setLiveSecretKey] = useState("");
  const [liveWebhookSecret, setLiveWebhookSecret] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [taxShipping, setTaxShipping] = useState(false);
  const [stripeTaxEnabled, setStripeTaxEnabled] = useState(false);
  const [customerAccountMode, setCustomerAccountMode] = useState<CustomerAccountMode>("optional");
  const [storeOrigin, setStoreOrigin] = useState<EcommerceStoreSettings["storeOrigin"]>({
    name: "",
    address: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  const [storeTimezone, setStoreTimezone] = useState("America/New_York");
  const [shippingDestinationMode, setShippingDestinationMode] =
    useState<EcommerceShippingDestinationMode>("us_only");
  const [allowedCountries, setAllowedCountries] = useState("US");
  useEffect(() => {
    if (data) {
      setActiveMode(data.activeMode || "test");
      setTestPublishableKey(data.testPublishableKey || "");
      setLivePublishableKey(data.livePublishableKey || "");
    }
  }, [data]);
  useEffect(() => {
    if (taxData) {
      setTaxEnabled(taxData.enabled);
      setManualRate((taxData.manualRateBps / 100).toFixed(2).replace(/\.00$/, ""));
      setTaxShipping(taxData.taxShipping);
      setStripeTaxEnabled(taxData.stripeTaxEnabled);
    }
  }, [taxData]);
  useEffect(() => {
    if (customerAccountData) {
      setCustomerAccountMode(customerAccountData.customerAccountMode);
    }
  }, [customerAccountData]);
  useEffect(() => {
    if (storeData) {
      setStoreOrigin(storeData.storeOrigin);
      setStoreTimezone(storeData.storeTimezone);
      setShippingDestinationMode(storeData.shippingDestinationMode);
      setAllowedCountries(storeData.allowedCountries.join(", "));
    }
  }, [storeData]);
  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest("PUT", "/api/admin/ecommerce/settings/stripe", {
        activeMode,
        testPublishableKey,
        testSecretKey,
        testWebhookSecret,
        livePublishableKey,
        liveSecretKey,
        liveWebhookSecret,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/stripe"] });
      toast({ title: "Stripe settings saved" });
    },
  });
  const taxMutation = useMutation({
    mutationFn: async () =>
      apiRequest("PUT", "/api/admin/ecommerce/settings/tax", {
        enabled: taxEnabled,
        manualRateBps: Math.round((Number(manualRate) || 0) * 100),
        taxShipping,
        stripeTaxEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/tax"] });
      toast({ title: "Tax settings saved" });
    },
  });
  const customerAccountMutation = useMutation({
    mutationFn: async () =>
      apiRequest("PUT", "/api/admin/ecommerce/settings/customer-accounts", {
        customerAccountMode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/ecommerce/settings/customer-accounts"],
      });
      toast({ title: "Customer account settings saved" });
    },
  });
  const storeMutation = useMutation({
    mutationFn: async () =>
      apiRequest("PUT", "/api/admin/ecommerce/settings/store", {
        storeOrigin,
        storeTimezone,
        shippingDestinationMode,
        allowedCountries:
          shippingDestinationMode === "custom"
            ? csv(allowedCountries).map((country) => country.toUpperCase())
            : getCountriesForShippingMode(shippingDestinationMode),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/store"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/checkout/settings"] });
      toast({ title: "Store shipping settings saved" });
    },
  });
  const originRegionOptions = getRegionOptions(storeOrigin.country);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-sky-600" /> Store origin and shipping markets
          </CardTitle>
          <CardDescription>
            Set the ship-from address, website timezone, and the countries this store can sell and
            ship to. Checkout enforces these choices server-side.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <StoreOriginInput
              label="Location name"
              field="name"
              value={storeOrigin.name}
              setStoreOrigin={setStoreOrigin}
              placeholder="Main warehouse"
            />
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600" /> Website timezone
              </Label>
              <Select value={storeTimezone} onValueChange={setStoreTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ECOMMERCE_TIMEZONES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label} ({value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Used for ecommerce timestamps, order received times, receipts, and future
                customer-facing order events.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Origin country</Label>
              <Select
                value={storeOrigin.country}
                onValueChange={(country) =>
                  setStoreOrigin((current) => ({ ...current, country, state: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_ECOMMERCE_COUNTRIES.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <StoreOriginInput
              label="Address"
              field="address"
              value={storeOrigin.address}
              setStoreOrigin={setStoreOrigin}
              placeholder="123 Fulfillment Ave"
            />
            <StoreOriginInput
              label="Address line 2"
              field="line2"
              value={storeOrigin.line2}
              setStoreOrigin={setStoreOrigin}
              placeholder="Suite, unit, dock"
            />
            <StoreOriginInput
              label="City"
              field="city"
              value={storeOrigin.city}
              setStoreOrigin={setStoreOrigin}
            />
            <div className="space-y-2">
              <Label>
                {storeOrigin.country === "CA"
                  ? "Province / territory"
                  : storeOrigin.country === "US"
                    ? "State"
                    : "Region"}
              </Label>
              {originRegionOptions.length ? (
                <Select
                  value={storeOrigin.state}
                  onValueChange={(state) => setStoreOrigin((current) => ({ ...current, state }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {originRegionOptions.map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={storeOrigin.state}
                  onChange={(event) =>
                    setStoreOrigin((current) => ({ ...current, state: event.target.value }))
                  }
                />
              )}
            </div>
            <StoreOriginInput
              label="ZIP / postal code"
              field="zip"
              value={storeOrigin.zip}
              setStoreOrigin={setStoreOrigin}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Shipping destinations</Label>
              <Select
                value={shippingDestinationMode}
                onValueChange={(mode) =>
                  setShippingDestinationMode(mode as EcommerceShippingDestinationMode)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us_only">United States only</SelectItem>
                  <SelectItem value="us_canada">United States and Canada</SelectItem>
                  <SelectItem value="worldwide">
                    Worldwide / selected international markets
                  </SelectItem>
                  <SelectItem value="custom">Custom countries</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This controls checkout country options and server-side payment creation.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Allowed country codes</Label>
              <Input
                value={
                  shippingDestinationMode === "custom"
                    ? allowedCountries
                    : getCountriesForShippingMode(shippingDestinationMode).join(", ")
                }
                disabled={shippingDestinationMode !== "custom"}
                onChange={(event) => setAllowedCountries(event.target.value)}
                placeholder="US, CA, GB"
              />
              <p className="text-sm text-muted-foreground">
                Use ISO two-letter country codes for custom markets.
              </p>
            </div>
          </div>
          <Button
            onClick={() => storeMutation.mutate()}
            disabled={storeMutation.isPending}
            className="w-fit"
          >
            <Save className="mr-2 h-4 w-4" /> Save store shipping settings
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" /> Customer accounts
          </CardTitle>
          <CardDescription>
            Choose whether buyers can check out as guests, create accounts, or must sign in before
            payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Checkout account mode</Label>
            <Select
              value={customerAccountMode}
              onValueChange={(value) => setCustomerAccountMode(value as CustomerAccountMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="optional">Optional accounts and guest checkout</SelectItem>
                <SelectItem value="required">Require account before checkout</SelectItem>
                <SelectItem value="guest_only">Guest checkout only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Optional is recommended for conversion. Required works best for subscriptions,
              restricted products, and account-managed stores.
            </p>
          </div>
          <Button
            onClick={() => customerAccountMutation.mutate()}
            disabled={customerAccountMutation.isPending}
            className="w-fit"
          >
            <Save className="mr-2 h-4 w-4" /> Save customer accounts
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-500" /> Stripe settings
          </CardTitle>
          <CardDescription>Secret values are encrypted and masked after save.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Active mode</Label>
            <Select value={activeMode} onValueChange={setActiveMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <StripeModeFields
              title="Test keys"
              publishable={testPublishableKey}
              setPublishable={setTestPublishableKey}
              secret={testSecretKey}
              setSecret={setTestSecretKey}
              webhook={testWebhookSecret}
              setWebhook={setTestWebhookSecret}
              hasSecret={data?.hasTestSecretKey}
              hasWebhook={data?.hasTestWebhookSecret}
            />
            <StripeModeFields
              title="Live keys"
              publishable={livePublishableKey}
              setPublishable={setLivePublishableKey}
              secret={liveSecretKey}
              setSecret={setLiveSecretKey}
              webhook={liveWebhookSecret}
              setWebhook={setLiveWebhookSecret}
              hasSecret={data?.hasLiveSecretKey}
              hasWebhook={data?.hasLiveWebhookSecret}
            />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-fit">
            <Save className="mr-2 h-4 w-4" /> Save Stripe settings
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-amber-600" /> Tax settings
          </CardTitle>
          <CardDescription>
            Checkout tax is calculated server-side from saved settings and taxable product records.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Enable tax calculation</Label>
                <p className="text-sm text-muted-foreground">
                  Adds tax to cart, checkout, and order totals.
                </p>
              </div>
              <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Tax shipping</Label>
                <p className="text-sm text-muted-foreground">
                  Include shipping charges in the taxable base.
                </p>
              </div>
              <Switch checked={taxShipping} onCheckedChange={setTaxShipping} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Manual tax rate (%)</Label>
              <Input
                value={manualRate}
                onChange={(event) => setManualRate(event.target.value)}
                placeholder="6.00"
                inputMode="decimal"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Prepare Stripe Tax</Label>
                <p className="text-sm text-muted-foreground">
                  Marks this store for provider-backed tax calculation once the Stripe Tax API is
                  connected.
                </p>
              </div>
              <Switch checked={stripeTaxEnabled} onCheckedChange={setStripeTaxEnabled} />
            </div>
          </div>
          <Button
            onClick={() => taxMutation.mutate()}
            disabled={taxMutation.isPending}
            className="w-fit"
          >
            <Save className="mr-2 h-4 w-4" /> Save tax settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StoreOriginInput(props: {
  label: string;
  field: StoreOriginField;
  value: string;
  setStoreOrigin: (
    update: (
      current: EcommerceStoreSettings["storeOrigin"],
    ) => EcommerceStoreSettings["storeOrigin"],
  ) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{props.label}</Label>
      <Input
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) =>
          props.setStoreOrigin((current) => ({ ...current, [props.field]: event.target.value }))
        }
      />
    </div>
  );
}

function StripeModeFields(props: {
  title: string;
  publishable: string;
  setPublishable: (v: string) => void;
  secret: string;
  setSecret: (v: string) => void;
  webhook: string;
  setWebhook: (v: string) => void;
  hasSecret?: boolean;
  hasWebhook?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="font-medium">{props.title}</h3>
      <Input
        placeholder="Publishable key"
        value={props.publishable}
        onChange={(e) => props.setPublishable(e.target.value)}
      />
      <Input
        placeholder={props.hasSecret ? "Secret key saved" : "Secret key"}
        value={props.secret}
        onChange={(e) => props.setSecret(e.target.value)}
      />
      <Input
        placeholder={props.hasWebhook ? "Webhook secret saved" : "Webhook secret"}
        value={props.webhook}
        onChange={(e) => props.setWebhook(e.target.value)}
      />
    </div>
  );
}
