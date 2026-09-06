import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Ban,
  Clock,
  Info,
  Percent,
  Save,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Truck,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  providerTransactionsEnabled: boolean;
  configured: boolean;
  awaitingActivation: boolean;
  activeMode: "test" | "live";
  testPublishableKey: string;
  livePublishableKey: string;
  hasTestSecretKey: boolean;
  hasLiveSecretKey: boolean;
  hasTestWebhookSecret: boolean;
  hasLiveWebhookSecret: boolean;
}

function StripeActivationNotice({ status }: { status: StripeSettingsStatus | undefined }) {
  const [title, description] =
    status?.configured === false
      ? [
          "Stripe credentials required",
          "Save the keys for the active mode before using Stripe payments.",
        ]
      : status?.configured === true && status.providerTransactionsEnabled === false
        ? [
            "Awaiting payment activation",
            "Credentials are saved. New Stripe payments and refunds remain disabled until your deployment operator activates them.",
          ]
        : status?.configured === true && status.providerTransactionsEnabled === true
          ? [
              "New Stripe transactions enabled",
              "Operator activation is enabled. Checkout also requires the active publishable key, webhook setup, and provider acceptance.",
            ]
          : [
              "Payment activation status unavailable",
              "Reload these settings to check payment activation.",
            ];
  return (
    <div
      role="status"
      data-testid="stripe-activation-status"
      className="rounded-lg border bg-muted/40 p-4 text-sm"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
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

type FraudDecision = "allow" | "allow_with_alert" | "manual_review" | "block";

interface FraudSettingsStatus {
  enabled: boolean;
  riskReviewThreshold: number;
  riskBlockThreshold: number;
  defaultHighRiskAction: FraudDecision;
  billingShippingMismatchAction: FraudDecision;
  countryMismatchAction: FraudDecision;
  allowManualReviewOrders: boolean;
  customerDeclineMessage: string;
  adminAlertsEnabled: boolean;
  logRetentionDays: number;
  velocityWindowMinutes: number;
  maxAttemptsPerIp: number;
  maxAttemptsPerEmail: number;
  blockDurationMinutes: number;
  duplicateOrderWindowMinutes: number;
  firstOrderHighValueAmount: number;
  maxOrderAmount: number;
  maxQuantity: number;
  highRiskCountries: string[];
  suspiciousEmailDomains: string[];
  disposableEmailDomains: string[];
  blockedEmails: string[];
  blockedIpRanges: string[];
  allowedIpRanges: string[];
  blockedAddresses: string[];
  captchaProvider: "none" | "recaptcha" | "turnstile";
  captchaEnabled: boolean;
  maxMindEnabled: boolean;
  maxMindAccountId: string;
  hasMaxMindLicenseKey: boolean;
}

interface FraudEvent {
  id: string;
  createdAt: string;
  email?: string | null;
  ipAddress?: string | null;
  amount?: number | null;
  score: number;
  riskLevel: string;
  decision: FraudDecision;
  message?: string | null;
  matchedRules?: Array<{ code: string; label: string; score: number }>;
}

interface FraudBlock {
  id: string;
  type: "ip" | "email" | "address";
  value: string;
  reason?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

interface SecurityOverview {
  settings: FraudSettingsStatus;
  summary: {
    total: number;
    blocked: number;
    manualReview: number;
    velocityBlocks: number;
  };
  recentEvents: FraudEvent[];
  activeBlocks: FraudBlock[];
}

type StoreOriginField = keyof EcommerceStoreSettings["storeOrigin"];
export type EcommerceSettingsSection =
  | "store"
  | "customer-accounts"
  | "security"
  | "stripe"
  | "tax";

function csv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SettingsTab({ section = "store" }: { section?: EcommerceSettingsSection }) {
  const stripeQuery = useQuery<StripeSettingsStatus>({
    queryKey: ["/api/admin/ecommerce/settings/stripe"],
  });
  const taxQuery = useQuery<TaxSettingsStatus>({
    queryKey: ["/api/admin/ecommerce/settings/tax"],
  });
  const customerQuery = useQuery<CustomerAccountSettingsStatus>({
    queryKey: ["/api/admin/ecommerce/settings/customer-accounts"],
  });
  const storeQuery = useQuery<EcommerceStoreSettings>({
    queryKey: ["/api/admin/ecommerce/settings/store"],
  });
  const data = stripeQuery.data;
  const taxData = taxQuery.data;
  const customerAccountData = customerQuery.data;
  const storeData = storeQuery.data;
  const initialized = useRef(new Set<EcommerceSettingsSection>());
  const [hydrated, setHydrated] = useState<Partial<Record<EcommerceSettingsSection, boolean>>>({});
  const markHydrated = (name: EcommerceSettingsSection) => {
    initialized.current.add(name);
    setHydrated((current) => ({ ...current, [name]: true }));
  };
  const queries = {
    stripe: stripeQuery,
    tax: taxQuery,
    "customer-accounts": customerQuery,
    store: storeQuery,
  };
  const requireLoaded = (name: keyof typeof queries) => {
    if (!hydrated[name] || !queries[name].isSuccess)
      throw new Error("Load settings successfully before saving.");
  };
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
    if (data && !initialized.current.has("stripe")) {
      markHydrated("stripe");
      setActiveMode(data.activeMode || "test");
      setTestPublishableKey(data.testPublishableKey || "");
      setLivePublishableKey(data.livePublishableKey || "");
    }
  }, [data]);
  useEffect(() => {
    if (taxData && !initialized.current.has("tax")) {
      markHydrated("tax");
      setTaxEnabled(taxData.enabled);
      setManualRate((taxData.manualRateBps / 100).toFixed(2).replace(/\.00$/, ""));
      setTaxShipping(taxData.taxShipping);
      setStripeTaxEnabled(taxData.stripeTaxEnabled);
    }
  }, [taxData]);
  useEffect(() => {
    if (customerAccountData && !initialized.current.has("customer-accounts")) {
      markHydrated("customer-accounts");
      setCustomerAccountMode(customerAccountData.customerAccountMode);
    }
  }, [customerAccountData]);
  useEffect(() => {
    if (storeData && !initialized.current.has("store")) {
      markHydrated("store");
      setStoreOrigin(storeData.storeOrigin);
      setStoreTimezone(storeData.storeTimezone);
      setShippingDestinationMode(storeData.shippingDestinationMode);
      setAllowedCountries(storeData.allowedCountries.join(", "));
    }
  }, [storeData]);
  const mutation = useMutation({
    mutationFn: async () => {
      requireLoaded("stripe");
      return apiRequest("PUT", "/api/admin/ecommerce/settings/stripe", {
        activeMode,
        testPublishableKey,
        testSecretKey,
        testWebhookSecret,
        livePublishableKey,
        liveSecretKey,
        liveWebhookSecret,
      });
    },
    onError: () => {
      toast({
        title: "Settings could not be saved",
        description: "Your entries have been kept. Please retry saving.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/stripe"] });
      toast({ title: "Stripe settings saved" });
    },
  });
  const taxMutation = useMutation({
    mutationFn: async () => {
      requireLoaded("tax");
      return apiRequest("PUT", "/api/admin/ecommerce/settings/tax", {
        enabled: taxEnabled,
        manualRateBps: Math.round((Number(manualRate) || 0) * 100),
        taxShipping,
        stripeTaxEnabled,
      });
    },
    onError: () => {
      toast({
        title: "Settings could not be saved",
        description: "Your entries have been kept. Please retry saving.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/tax"] });
      toast({ title: "Tax settings saved" });
    },
  });
  const customerAccountMutation = useMutation({
    mutationFn: async () => {
      requireLoaded("customer-accounts");
      return apiRequest("PUT", "/api/admin/ecommerce/settings/customer-accounts", {
        customerAccountMode,
      });
    },
    onError: () => {
      toast({
        title: "Settings could not be saved",
        description: "Your entries have been kept. Please retry saving.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/ecommerce/settings/customer-accounts"],
      });
      toast({ title: "Customer account settings saved" });
    },
  });
  const storeMutation = useMutation({
    mutationFn: async () => {
      requireLoaded("store");
      return apiRequest("PUT", "/api/admin/ecommerce/settings/store", {
        storeOrigin,
        storeTimezone,
        shippingDestinationMode,
        allowedCountries:
          shippingDestinationMode === "custom"
            ? csv(allowedCountries).map((country) => country.toUpperCase())
            : getCountriesForShippingMode(shippingDestinationMode),
      });
    },
    onError: () => {
      toast({
        title: "Settings could not be saved",
        description: "Your entries have been kept. Please retry saving.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/settings/store"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/checkout/settings"] });
      toast({ title: "Store shipping settings saved" });
    },
  });
  const originRegionOptions = getRegionOptions(storeOrigin.country);
  if (section !== "security") {
    const selectedQuery = queries[section];
    if (!hydrated[section] || !selectedQuery.isSuccess) {
      return (
        <SettingsLoadState
          failed={selectedQuery.isError}
          retrying={selectedQuery.isFetching}
          onRetry={() => void selectedQuery.refetch()}
        />
      );
    }
  }
  return (
    <div className="space-y-6">
      {section === "store" ? (
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
      ) : null}
      {section === "customer-accounts" ? (
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
      ) : null}
      {section === "security" ? <SecurityCenterCard /> : null}
      {section === "stripe" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-500" /> Stripe settings
            </CardTitle>
            <CardDescription>Secret values are encrypted and masked after save.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <StripeActivationNotice status={data} />
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
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="w-fit"
            >
              <Save className="mr-2 h-4 w-4" /> Save Stripe settings
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {section === "tax" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-600" /> Tax settings
            </CardTitle>
            <CardDescription>
              Checkout tax is calculated server-side from saved settings and taxable product
              records.
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
      ) : null}
    </div>
  );
}

function SecurityCenterCard() {
  const { toast } = useToast();
  const overviewQuery = useQuery<SecurityOverview>({
    queryKey: ["/api/admin/ecommerce/security/overview"],
  });
  const settingsQuery = useQuery<FraudSettingsStatus>({
    queryKey: ["/api/admin/ecommerce/security/settings"],
  });
  const blocksQuery = useQuery<FraudBlock[]>({
    queryKey: ["/api/admin/ecommerce/security/blocks"],
  });
  const settingsData = settingsQuery.data;
  const initialized = useRef(false);
  const [settings, setSettings] = useState<FraudSettingsStatus | null>(null);
  const [maxMindLicenseKey, setMaxMindLicenseKey] = useState("");
  const [blockForm, setBlockForm] = useState({
    type: "email" as FraudBlock["type"],
    value: "",
    reason: "",
  });

  useEffect(() => {
    if (settingsData && !initialized.current) {
      initialized.current = true;
      setSettings(settingsData);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!settings || !settingsQuery.isSuccess)
        throw new Error("Load security settings successfully before saving.");
      return apiRequest("PUT", "/api/admin/ecommerce/security/settings", {
        ...settings,
        maxMindLicenseKey: maxMindLicenseKey.trim() || undefined,
      });
    },
    onError: () => {
      toast({
        title: "Settings could not be saved",
        description: "Your entries have been kept. Please retry saving.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      setMaxMindLicenseKey("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/security/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/security/overview"] });
      toast({ title: "Security Center settings saved" });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/admin/ecommerce/security/blocks", {
        type: blockForm.type,
        value: blockForm.value,
        reason: blockForm.reason || undefined,
      }),
    onSuccess: () => {
      setBlockForm({ type: "email", value: "", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/security/blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/security/overview"] });
      toast({ title: "Fraud block added" });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/admin/ecommerce/security/blocks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/security/blocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecommerce/security/overview"] });
      toast({ title: "Fraud block removed" });
    },
  });

  const updateSetting = <K extends keyof FraudSettingsStatus>(
    key: K,
    value: FraudSettingsStatus[K],
  ) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateList = (
    key: keyof Pick<
      FraudSettingsStatus,
      | "highRiskCountries"
      | "suspiciousEmailDomains"
      | "disposableEmailDomains"
      | "blockedEmails"
      | "blockedIpRanges"
      | "allowedIpRanges"
      | "blockedAddresses"
    >,
    value: string,
  ) => {
    updateSetting(key, csv(value) as FraudSettingsStatus[typeof key]);
  };

  const summary = overviewQuery.data?.summary;
  const events = overviewQuery.data?.recentEvents;
  const blocks = blocksQuery.data;

  if (!settings || !settingsQuery.isSuccess) {
    return (
      <SettingsLoadState
        failed={settingsQuery.isError}
        retrying={settingsQuery.isFetching}
        onRetry={() => void settingsQuery.refetch()}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" /> Security Center
        </CardTitle>
        <CardDescription>
          Screen checkout attempts, tune fraud rules, review suspicious activity, and manage
          temporary blocks before payment is created.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <SecurityReadState label="Security activity" query={overviewQuery} />
        {summary ? (
          <div className="grid gap-3 md:grid-cols-4">
            <SecurityMetric
              label="Screened today"
              value={summary.total}
              icon={Activity}
              className="text-sky-600 bg-sky-50"
            />
            <SecurityMetric
              label="Blocked"
              value={summary.blocked}
              icon={Ban}
              className="text-rose-600 bg-rose-50"
            />
            <SecurityMetric
              label="Needs review"
              value={summary.manualReview}
              icon={ShieldAlert}
              className="text-amber-600 bg-amber-50"
            />
            <SecurityMetric
              label="Velocity blocks"
              value={summary.velocityBlocks}
              icon={AlertTriangle}
              className="text-violet-600 bg-violet-50"
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <SettingLabel
                label="Enable checkout screening"
                help="Turns on rule-based fraud evaluation before Stripe creates a PaymentIntent. When disabled, checkout skips Core Platform fraud rules but Stripe Radar still applies inside Stripe."
              />
              <p className="text-sm text-muted-foreground">
                Evaluate orders before creating a Stripe PaymentIntent.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSetting("enabled", enabled)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <SettingLabel
                label="Allow review orders"
                help="When enabled, suspicious checkouts can create a pending order for admin review without collecting payment. When disabled, review-level checkouts are stopped with a generic customer message."
              />
              <p className="text-sm text-muted-foreground">
                Create a pending order when rules require manual review.
              </p>
            </div>
            <Switch
              checked={settings.allowManualReviewOrders}
              onCheckedChange={(enabled) => updateSetting("allowManualReviewOrders", enabled)}
            />
          </div>
          <NumberSetting
            label="Review threshold"
            help="Fraud scores at or above this number are routed to manual review. Lower numbers are stricter; higher numbers are more permissive."
            value={settings.riskReviewThreshold}
            onChange={(value) => updateSetting("riskReviewThreshold", value)}
          />
          <NumberSetting
            label="Block threshold"
            help="Fraud scores at or above this number use the high-risk action. If that action is Block, no order or PaymentIntent is created."
            value={settings.riskBlockThreshold}
            onChange={(value) => updateSetting("riskBlockThreshold", value)}
          />
          <DecisionSetting
            label="High-risk default action"
            help="Controls what happens when an order crosses the block threshold because of weighted signals such as high-risk countries, high amount, or multiple suspicious matches."
            value={settings.defaultHighRiskAction}
            onChange={(value) => updateSetting("defaultHighRiskAction", value)}
          />
          <DecisionSetting
            label="Billing/shipping mismatch"
            help="Controls the action when billing and shipping addresses differ. Manual review is safer than blocking because gifts, family orders, and business purchases commonly ship to another address."
            value={settings.billingShippingMismatchAction}
            onChange={(value) => updateSetting("billingShippingMismatchAction", value)}
          />
          <DecisionSetting
            label="Country mismatch"
            help="Controls the action when billing and shipping countries differ. This can indicate fraud, but it can also be legitimate for international families, business buyers, and gifts."
            value={settings.countryMismatchAction}
            onChange={(value) => updateSetting("countryMismatchAction", value)}
          />
          <NumberSetting
            label="Velocity window minutes"
            help="The rolling time window used to count repeated checkout attempts by IP address and email. Shorter windows catch rapid card testing; longer windows are stricter."
            value={settings.velocityWindowMinutes}
            onChange={(value) => updateSetting("velocityWindowMinutes", value)}
          />
          <NumberSetting
            label="Max attempts per IP"
            help="Maximum checkout screening attempts allowed from the same IP during the velocity window before Core Platform blocks additional attempts."
            value={settings.maxAttemptsPerIp}
            onChange={(value) => updateSetting("maxAttemptsPerIp", value)}
          />
          <NumberSetting
            label="Max attempts per email"
            help="Maximum checkout screening attempts allowed for the same email during the velocity window before additional attempts are blocked."
            value={settings.maxAttemptsPerEmail}
            onChange={(value) => updateSetting("maxAttemptsPerEmail", value)}
          />
          <NumberSetting
            label="Block duration minutes"
            help="How long temporary velocity blocks stay active before the buyer can try again. Use short values for normal fraud throttling and longer values for active card-testing attacks."
            value={settings.blockDurationMinutes}
            onChange={(value) => updateSetting("blockDurationMinutes", value)}
          />
          <NumberSetting
            label="Duplicate order window minutes"
            help="How long Core Platform looks back for a similar checkout using the same email, amount, and shipping address. Matching attempts are flagged as possible duplicate or retry behavior."
            value={settings.duplicateOrderWindowMinutes}
            onChange={(value) => updateSetting("duplicateOrderWindowMinutes", value)}
          />
          <NumberSetting
            label="First-order high value amount (cents)"
            help="A first checkout at or above this amount receives extra risk score and can be routed to review. Enter cents, so 50000 means $500.00."
            value={settings.firstOrderHighValueAmount}
            onChange={(value) => updateSetting("firstOrderHighValueAmount", value)}
          />
          <NumberSetting
            label="Maximum order amount (cents, 0 disables)"
            help="Hard ceiling for checkout totals. Amounts above this value are blocked before payment. Use 0 when there is no store-level maximum."
            value={settings.maxOrderAmount}
            onChange={(value) => updateSetting("maxOrderAmount", value)}
          />
          <NumberSetting
            label="Maximum item quantity (0 disables)"
            help="Flags or blocks unusually large item quantities before payment. This helps catch scripted tests and accidental bulk orders when the store does not support wholesale-style purchases."
            value={settings.maxQuantity}
            onChange={(value) => updateSetting("maxQuantity", value)}
          />
          <NumberSetting
            label="Log retention days"
            help="How long fraud events are retained for admin review and investigation. Longer retention helps pattern analysis but stores more operational history."
            value={settings.logRetentionDays}
            onChange={(value) => updateSetting("logRetentionDays", value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ListSetting
            label="High-risk countries"
            help="Comma-separated ISO country codes that add risk when used as the shipping country. Use this carefully and prefer review over automatic blocks for broad regions."
            value={settings.highRiskCountries}
            placeholder="NG, RU"
            onChange={(value) => updateList("highRiskCountries", value)}
          />
          <ListSetting
            label="Suspicious email domains"
            help="Email domains that are often associated with disposable inboxes or card testing. Matching domains add risk and usually route the order to review."
            value={settings.suspiciousEmailDomains}
            placeholder="mailinator.com, example.test"
            onChange={(value) => updateList("suspiciousEmailDomains", value)}
          />
          <ListSetting
            label="Disposable email domains"
            help="Known throwaway email domains that should increase risk. Keep this list focused, because many privacy-minded customers use email aliases legitimately."
            value={settings.disposableEmailDomains}
            placeholder="tempmail.com, 10minutemail.com"
            onChange={(value) => updateList("disposableEmailDomains", value)}
          />
          <ListSetting
            label="Blocked emails"
            help="Specific email addresses that should be blocked before payment. Use for confirmed abuse, not ordinary support disputes."
            value={settings.blockedEmails}
            placeholder="buyer@example.com"
            onChange={(value) => updateList("blockedEmails", value)}
          />
          <ListSetting
            label="Blocked IPs or prefixes"
            help="IP addresses or simple prefixes that should be blocked unless allowlisted. Useful for known card-testing sources."
            value={settings.blockedIpRanges}
            placeholder="192.0.2.10, 203.0.113."
            onChange={(value) => updateList("blockedIpRanges", value)}
          />
          <ListSetting
            label="Allowed IPs or prefixes"
            help="Trusted IPs that bypass IP block and velocity checks, such as store offices or testing locations. Other rules still apply."
            value={settings.allowedIpRanges}
            placeholder="Office IPs that bypass velocity rules"
            onChange={(value) => updateList("allowedIpRanges", value)}
          />
          <ListSetting
            label="Blocked address fragments"
            help="Address text fragments that should block checkout when they appear in the shipping address. Use exact, confirmed problem addresses to avoid false positives."
            value={settings.blockedAddresses}
            placeholder="123 fraud st"
            onChange={(value) => updateList("blockedAddresses", value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <SettingLabel
              label="Customer-facing decline message"
              help="The generic message shown when checkout is blocked or cannot proceed. Do not reveal the matched fraud rule, because that helps attackers tune future attempts."
            />
            <Textarea
              value={settings.customerDeclineMessage}
              onChange={(event) => updateSetting("customerDeclineMessage", event.target.value)}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Keep this generic so checkout does not reveal which rule matched.
            </p>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <SettingLabel
                  label="Admin alerts"
                  help="Controls whether security review events should be eligible for admin notification workflows. This does not change checkout decisions; it affects operational awareness."
                />
                <p className="text-sm text-muted-foreground">
                  Notify operators about blocked or review-level attempts when notification adapters
                  are enabled.
                </p>
              </div>
              <Switch
                checked={settings.adminAlertsEnabled}
                onCheckedChange={(enabled) => updateSetting("adminAlertsEnabled", enabled)}
              />
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SettingLabel
                    label="Provider screening readiness"
                    help="Stores readiness configuration for providers such as CAPTCHA, Turnstile, and MaxMind. Provider adapters remain gated until operational API calls are implemented."
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    MaxMind, reCAPTCHA, and Cloudflare Turnstile can be configured here. Operational
                    provider calls are adapter-gated.
                  </p>
                </div>
                <Badge variant="outline">Configurable</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                <SettingLabel
                  label="CAPTCHA provider"
                  help="Chooses the bot-protection provider to prepare for checkout challenges. This is configuration/readiness until the public checkout adapter is enabled."
                />
                <Select
                  value={settings.captchaProvider}
                  onValueChange={(value) =>
                    updateSetting(
                      "captchaProvider",
                      value as FraudSettingsStatus["captchaProvider"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No CAPTCHA provider</SelectItem>
                    <SelectItem value="recaptcha">Google reCAPTCHA</SelectItem>
                    <SelectItem value="turnstile">Cloudflare Turnstile</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <SettingLabel
                      label="Enable CAPTCHA challenge"
                      help="Allows checkout to require a bot challenge when the CAPTCHA adapter is operational. Keep disabled until site keys and public checkout verification are fully wired."
                    />
                    <p className="text-sm text-muted-foreground">
                      Preparation setting for checkout bot protection.
                    </p>
                  </div>
                  <Switch
                    checked={settings.captchaEnabled}
                    onCheckedChange={(enabled) => updateSetting("captchaEnabled", enabled)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <SettingLabel
                      label="Enable MaxMind screening"
                      help="Allows checkout to request MaxMind minFraud scoring when the provider adapter is operational and credentials are saved."
                    />
                    <p className="text-sm text-muted-foreground">
                      Preparation setting for provider-backed risk scoring.
                    </p>
                  </div>
                  <Switch
                    checked={settings.maxMindEnabled}
                    onCheckedChange={(enabled) => updateSetting("maxMindEnabled", enabled)}
                  />
                </div>
                <div className="space-y-2">
                  <SettingLabel
                    label="MaxMind account ID"
                    help="Stores the MaxMind account identifier for a future minFraud adapter. This does not call MaxMind until the adapter is enabled."
                  />
                  <Input
                    value={settings.maxMindAccountId}
                    onChange={(event) => updateSetting("maxMindAccountId", event.target.value)}
                    placeholder="MaxMind account ID"
                  />
                </div>
                <div className="space-y-2">
                  <SettingLabel
                    label="MaxMind license key"
                    help="Encrypted credential storage for MaxMind minFraud. Saved keys are masked and are not exposed back to the browser."
                  />
                  <Input
                    value={maxMindLicenseKey}
                    onChange={(event) => setMaxMindLicenseKey(event.target.value)}
                    placeholder={
                      settings.hasMaxMindLicenseKey
                        ? "MaxMind license key saved"
                        : "MaxMind license key"
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                Manual blocklist{" "}
                <InfoHelp
                  title="Manual blocklist"
                  body="Use manual blocks for confirmed abuse such as repeated card testing, known bad emails, or exact problem address fragments. Blocks are checked before payment is created."
                />
              </h3>
              <p className="text-sm text-muted-foreground">
                Temporarily or permanently block emails, IPs, or address fragments.
              </p>
            </div>
            <Button
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending || !blockForm.value.trim()}
            >
              <Ban className="mr-2 h-4 w-4" /> Add block
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr]">
            <div className="space-y-2">
              <SettingLabel
                label="Block type"
                help="Choose whether the block applies to an email address, IP/prefix, or a shipping address fragment."
              />
              <Select
                value={blockForm.type}
                onValueChange={(type) =>
                  setBlockForm((current) => ({ ...current, type: type as FraudBlock["type"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="ip">IP / prefix</SelectItem>
                  <SelectItem value="address">Address fragment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <SettingLabel
                label="Block value"
                help="The exact email, IP/prefix, or address fragment to block. Address fragments are matched against normalized shipping addresses."
              />
              <Input
                value={blockForm.value}
                onChange={(event) =>
                  setBlockForm((current) => ({ ...current, value: event.target.value }))
                }
                placeholder="Value to block"
              />
            </div>
            <div className="space-y-2">
              <SettingLabel
                label="Internal reason"
                help="Private explanation for admins so future operators understand why the block exists."
              />
              <Input
                value={blockForm.reason}
                onChange={(event) =>
                  setBlockForm((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Internal reason"
              />
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <SecurityReadState label="Manual fraud blocks" query={blocksQuery} />
            {blocks ? (
              blocks.length ? (
                blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 text-sm"
                  >
                    <div>
                      <Badge variant="secondary">{block.type}</Badge>
                      <span className="ml-2 font-medium">{block.value}</span>
                      {block.reason ? (
                        <span className="ml-2 text-muted-foreground">{block.reason}</span>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteBlockMutation.mutate(block.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No active manual fraud blocks.</p>
              )
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Recent fraud activity</h3>
          <div className="mt-3 grid gap-2">
            {events ? (
              events.length ? (
                events.slice(0, 8).map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-2 rounded-lg bg-muted/30 p-3 text-sm md:grid-cols-[160px_1fr_120px_90px]"
                  >
                    <span className="text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                    <span>
                      {event.email || event.ipAddress || "Unknown checkout"}
                      <span className="ml-2 text-muted-foreground">{event.message}</span>
                    </span>
                    <Badge variant={event.decision === "block" ? "destructive" : "outline"}>
                      {event.decision.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-medium">Score {event.score}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No fraud activity has been logged yet.
                </p>
              )
            ) : null}
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-fit"
        >
          <Save className="mr-2 h-4 w-4" /> Save Security Center
        </Button>
      </CardContent>
    </Card>
  );
}

function SecurityReadState({
  label,
  query,
}: {
  label: string;
  query: { data: unknown; isError: boolean; isFetching: boolean; refetch: () => Promise<unknown> };
}) {
  const retained = query.data !== undefined;
  if (query.isError)
    return (
      <div role="alert" className="rounded-lg border p-3 text-sm">
        <p>
          {label} could not be {retained ? "refreshed. Showing previously loaded data." : "loaded."}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Retry {label.toLowerCase()}
        </Button>
      </div>
    );
  if (!retained || query.isFetching)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {retained ? "Refreshing" : "Loading"} {label.toLowerCase()}…
      </p>
    );
  return null;
}

function SecurityMetric(props: {
  label: string;
  value: number;
  icon: typeof Activity;
  className: string;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-lg border p-4">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${props.className}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-semibold">{props.value}</div>
      <div className="text-sm text-muted-foreground">{props.label}</div>
    </div>
  );
}

function InfoHelp(props: { title: string; body: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          aria-label={`About ${props.title}`}
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-w-sm text-sm leading-6">
        <div className="font-medium text-foreground">{props.title}</div>
        <p className="mt-1 text-muted-foreground">{props.body}</p>
      </PopoverContent>
    </Popover>
  );
}

function SettingLabel(props: { label: string; help: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{props.label}</Label>
      <InfoHelp title={props.label} body={props.help} />
    </div>
  );
}

function NumberSetting(props: {
  label: string;
  help: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <SettingLabel label={props.label} help={props.help} />
      <Input
        type="number"
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value) || 0)}
      />
    </div>
  );
}

function DecisionSetting(props: {
  label: string;
  help: string;
  value: FraudDecision;
  onChange: (value: FraudDecision) => void;
}) {
  return (
    <div className="space-y-2">
      <SettingLabel label={props.label} help={props.help} />
      <Select value={props.value} onValueChange={(value) => props.onChange(value as FraudDecision)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="allow">Allow</SelectItem>
          <SelectItem value="allow_with_alert">Allow with alert</SelectItem>
          <SelectItem value="manual_review">Manual review</SelectItem>
          <SelectItem value="block">Block</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function ListSetting(props: {
  label: string;
  help: string;
  value: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <SettingLabel label={props.label} help={props.help} />
      <Input
        value={props.value.join(", ")}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
      />
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

function SettingsLoadState({
  failed,
  retrying,
  onRetry,
}: {
  failed: boolean;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription role={failed ? "alert" : "status"}>
          {failed
            ? "Settings could not be loaded. Retry before editing or saving."
            : "Loading settings…"}
        </CardDescription>
      </CardHeader>
      {failed && (
        <CardContent>
          <Button onClick={onRetry} disabled={retrying}>
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
