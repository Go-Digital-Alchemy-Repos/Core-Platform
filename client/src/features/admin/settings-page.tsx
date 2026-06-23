import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminSidebar } from "./admin-sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import {
  CreditCard,
  Mail,
  Cloud,
  Eye,
  EyeOff,
  Save,
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  AlertCircle,
  Tag,
  Link2,
  ExternalLink,
  Search,
  BarChart3,
  Code2,
  Megaphone,
  Store,
  Truck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IconType } from "react-icons";
import {
  SiAdyen,
  SiAfterpay,
  SiAmazonpay,
  SiAmazon,
  SiApplepay,
  SiBraintree,
  SiCloudflare,
  SiDhl,
  SiGoogle,
  SiGoogleads,
  SiGoogleanalytics,
  SiGooglepay,
  SiKlarna,
  SiMailchimp,
  SiMailgun,
  SiMeta,
  SiPaypal,
  SiPinterest,
  SiSquare,
  SiStripe,
  SiTiktok,
  SiWalmart,
  SiX,
} from "react-icons/si";
import { EmailTemplatesTab } from "./settings/email-templates-tab";
export {
  filterEmailTemplates,
  getEmailTemplateModuleCounts,
  isEmailTemplateModuleEnabled,
} from "./settings/email-templates-tab";
export { BrandingTab, type BrandingSubview } from "./settings/branding-tab";

export type SettingsData = Record<string, Record<string, { value: string; isSecret: boolean }>>;

type SettingsTab = "integrations" | "head-tags" | "system" | "email-templates";

const SETTINGS_TABS = new Set<SettingsTab>([
  "integrations",
  "head-tags",
  "system",
  "email-templates",
]);

function normalizeSettingsTab(tab: string | undefined): SettingsTab {
  return SETTINGS_TABS.has(tab as SettingsTab) ? (tab as SettingsTab) : "integrations";
}

interface IntegrationField {
  key: string;
  label: string;
  isSecret: boolean;
  placeholder: string;
  type?: "text" | "boolean";
}

export type IntegrationGroupKey =
  | "commerce"
  | "shipping"
  | "marketing"
  | "communications"
  | "infrastructure";

export type IntegrationLibraryCategory =
  | "Payment Gateways"
  | "POS & Merchant Services"
  | "Shipping & Fulfillment"
  | "Social Commerce"
  | "Marketing & Analytics"
  | "Product Feeds"
  | "Inventory & Operations"
  | "Tax & Compliance"
  | "Marketplaces"
  | "Other";

export interface IntegrationConfig {
  category: string;
  title: string;
  description: string;
  group: IntegrationGroupKey;
  icon: typeof CreditCard;
  brandIcon?: IconType;
  brandColor?: string;
  logoText?: string;
  badge?: string;
  accountUrl: string;
  docsUrl?: string;
  instructions: string[];
  fields: IntegrationField[];
  replitConnected?: boolean;
  supportsConnectionTest?: boolean;
  libraryCategory?: IntegrationLibraryCategory;
  capabilities?: string[];
  configurable?: boolean;
  operational?: boolean;
  requiresAdapter?: boolean;
  supportedCapabilities?: string[];
  supportedEvents?: string[];
}

export const INTEGRATION_GROUPS: Array<{
  key: IntegrationGroupKey;
  title: string;
  description: string;
}> = [
  {
    key: "commerce",
    title: "Global Payment Processors",
    description:
      "Shared transaction providers used by ecommerce, paid events, subscriptions, and future paid modules.",
  },
  {
    key: "shipping",
    title: "Shipping & Fulfillment",
    description: "Label purchasing, fulfillment automation, inventory, and delivery workflows.",
  },
  {
    key: "marketing",
    title: "Marketing & Analytics",
    description: "Measurement, advertising, attribution, and audience lifecycle tools.",
  },
  {
    key: "communications",
    title: "Communications & CRM",
    description: "Transactional email, lead intake, and customer operations integrations.",
  },
  {
    key: "infrastructure",
    title: "Storage & Infrastructure",
    description: "Platform services used by media, uploads, and deployment operations.",
  },
];

export const ECOMMERCE_INTEGRATION_CATEGORIES = new Set([
  "google_merchant_center",
  "google_ads_tag_manager",
  "microsoft_ads_merchant_center",
  "meta_ads",
  "tiktok_ads",
  "pinterest_ads",
  "x_ads",
  "klaviyo",
  "omnisend",
  "avalara_avatax",
  "taxjar",
  "shipbob",
  "amazon_marketplace",
  "walmart_marketplace",
  "easypost",
  "shipstation",
  "shippo",
  "veeqo",
  "easyship",
  "pirate_ship",
  "ups",
  "usps",
  "fedex",
  "dhl_express",
]);

type IntegrationStatusFilter = "all" | "configured" | "not_configured";

function getIntegrationGroupLabel(groupKey: IntegrationGroupKey) {
  return INTEGRATION_GROUPS.find((group) => group.key === groupKey)?.title || "Other";
}

export function isIntegrationConfigured(config: IntegrationConfig, settings: SettingsData) {
  const categorySettings = settings[config.category] || {};
  return config.fields.some((field) => {
    const setting = categorySettings[field.key];
    return Boolean(setting?.value && setting.value !== "");
  });
}

export function getIntegrationLibraryCounts(
  integrations: IntegrationConfig[],
  settings: SettingsData,
) {
  return INTEGRATION_GROUPS.reduce(
    (counts, group) => {
      const groupIntegrations = integrations.filter((config) => config.group === group.key);
      counts[group.key] = {
        total: groupIntegrations.length,
        configured: groupIntegrations.filter((config) => isIntegrationConfigured(config, settings))
          .length,
      };
      return counts;
    },
    {} as Record<IntegrationGroupKey, { total: number; configured: number }>,
  );
}

export function filterIntegrations(
  integrations: IntegrationConfig[],
  settings: SettingsData,
  filters: {
    searchQuery?: string;
    groupFilter?: IntegrationGroupKey | "all";
    categoryFilter?: IntegrationLibraryCategory | "all";
    statusFilter?: IntegrationStatusFilter;
  },
) {
  const query = (filters.searchQuery || "").trim().toLowerCase();
  const groupFilter = filters.groupFilter || "all";
  const categoryFilter = filters.categoryFilter || "all";
  const statusFilter = filters.statusFilter || "all";

  return integrations.filter((config) => {
    const configured = isIntegrationConfigured(config, settings);
    const matchesGroup = groupFilter === "all" || config.group === groupFilter;
    const matchesCategory =
      categoryFilter === "all" || (config.libraryCategory || "Other") === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "configured" && configured) ||
      (statusFilter === "not_configured" && !configured);
    const searchable = [
      config.title,
      config.category,
      config.description,
      config.libraryCategory || "",
      getIntegrationGroupLabel(config.group),
      ...(config.capabilities || []),
      ...(config.supportedCapabilities || []),
      ...(config.supportedEvents || []),
      config.operational ? "operational" : "setup ready requires adapter",
      ...config.fields.map((field) => field.label),
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || searchable.includes(query);

    return matchesGroup && matchesCategory && matchesStatus && matchesSearch;
  });
}

export const INTEGRATIONS: IntegrationConfig[] = [
  {
    category: "stripe",
    title: "Stripe",
    description: "Global card, wallet, subscription, and checkout payment processing",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiStripe,
    brandColor: "text-[#635BFF]",
    libraryCategory: "Payment Gateways",
    capabilities: ["Cards", "Wallets", "Subscriptions", "Payment Element", "Webhooks"],
    accountUrl: "https://dashboard.stripe.com/apikeys",
    docsUrl: "https://docs.stripe.com/keys",
    instructions: [
      "Open Stripe API keys and confirm you are in the correct test or live mode.",
      "Copy the Publishable key and Secret key into this card.",
      "Create or open the webhook endpoint in Stripe, then copy its signing secret into Webhook Secret.",
    ],
    replitConnected: false,
    fields: [
      {
        key: "stripe_secret_key",
        label: "Secret Key",
        isSecret: true,
        placeholder: "sk_live_...",
      },
      {
        key: "stripe_publishable_key",
        label: "Publishable Key",
        isSecret: false,
        placeholder: "pk_live_...",
      },
      {
        key: "stripe_webhook_secret",
        label: "Webhook Secret",
        isSecret: true,
        placeholder: "whsec_...",
      },
    ],
  },
  {
    category: "paypal",
    title: "PayPal",
    description: "Global PayPal checkout, wallet payment, and webhook credentials",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiPaypal,
    brandColor: "text-[#003087]",
    libraryCategory: "Payment Gateways",
    capabilities: ["PayPal Checkout", "Wallets", "Refunds", "Webhooks"],
    accountUrl: "https://developer.paypal.com/dashboard/applications/live",
    docsUrl: "https://developer.paypal.com/api/rest/",
    instructions: [
      "Create or open a REST app in the PayPal Developer Dashboard.",
      "Copy the Client ID and Secret for the active sandbox or live environment.",
      "Create webhooks for payment capture, refund, and dispute events before enabling live payments.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "paypal_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "sandbox",
      },
      {
        key: "paypal_client_id",
        label: "Client ID",
        isSecret: false,
        placeholder: "PayPal client ID",
      },
      {
        key: "paypal_client_secret",
        label: "Client Secret",
        isSecret: true,
        placeholder: "PayPal client secret",
      },
      {
        key: "paypal_webhook_id",
        label: "Webhook ID",
        isSecret: false,
        placeholder: "Webhook ID",
      },
    ],
  },
  {
    category: "square",
    title: "Square",
    description: "Global Square Payments API, location, and webhook configuration",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiSquare,
    brandColor: "text-[#3E4348]",
    libraryCategory: "POS & Merchant Services",
    capabilities: ["Payments", "POS", "Locations", "Webhooks"],
    accountUrl: "https://developer.squareup.com/apps",
    docsUrl: "https://developer.squareup.com/docs/payments-api/overview",
    instructions: [
      "Create or open a Square application and confirm sandbox or production mode.",
      "Copy the Application ID, Access Token, and Location ID used for payments.",
      "Configure webhook signature verification before routing production payment events.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "square_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "sandbox",
      },
      {
        key: "square_application_id",
        label: "Application ID",
        isSecret: false,
        placeholder: "Square application ID",
      },
      {
        key: "square_access_token",
        label: "Access Token",
        isSecret: true,
        placeholder: "Square access token",
      },
      {
        key: "square_location_id",
        label: "Location ID",
        isSecret: false,
        placeholder: "Square location ID",
      },
      {
        key: "square_webhook_signature_key",
        label: "Webhook Signature Key",
        isSecret: true,
        placeholder: "Square webhook signature key",
      },
    ],
  },
  {
    category: "authorize_net",
    title: "Authorize.net",
    description: "Global Authorize.net API, transaction key, and webhook signature settings",
    group: "commerce",
    icon: CreditCard,
    logoText: "Authorize.net",
    brandColor: "text-sky-700",
    libraryCategory: "Payment Gateways",
    capabilities: ["Cards", "Merchant gateway", "Fraud tools", "Webhooks"],
    accountUrl: "https://account.authorize.net/",
    docsUrl: "https://developer.authorize.net/api/reference/",
    instructions: [
      "Open Authorize.net account settings and confirm sandbox or production mode.",
      "Copy the API Login ID, Transaction Key, and Public Client Key.",
      "Copy the Signature Key so webhooks can be verified before updating transactions.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "authorize_net_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "sandbox",
      },
      {
        key: "authorize_net_api_login_id",
        label: "API Login ID",
        isSecret: false,
        placeholder: "API login ID",
      },
      {
        key: "authorize_net_transaction_key",
        label: "Transaction Key",
        isSecret: true,
        placeholder: "Transaction key",
      },
      {
        key: "authorize_net_signature_key",
        label: "Signature Key",
        isSecret: true,
        placeholder: "Webhook signature key",
      },
      {
        key: "authorize_net_public_client_key",
        label: "Public Client Key",
        isSecret: false,
        placeholder: "Public client key",
      },
    ],
  },
  {
    category: "braintree",
    title: "Braintree",
    description: "Global Braintree merchant, card, PayPal, and wallet payment credentials",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiBraintree,
    brandColor: "text-[#000000]",
    libraryCategory: "Payment Gateways",
    capabilities: ["Cards", "PayPal", "Venmo", "Vaulting", "Wallets"],
    accountUrl: "https://www.braintreegateway.com/login",
    docsUrl: "https://developer.paypal.com/braintree/docs/",
    instructions: [
      "Open Braintree API settings and confirm sandbox or production environment.",
      "Copy the Merchant ID, Public Key, and Private Key.",
      "Use Braintree when module checkouts need vaulting, PayPal, Venmo, or wallet support through one gateway.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "braintree_environment",
        label: "Environment",
        isSecret: false,
        placeholder: "sandbox",
      },
      {
        key: "braintree_merchant_id",
        label: "Merchant ID",
        isSecret: false,
        placeholder: "Merchant ID",
      },
      {
        key: "braintree_public_key",
        label: "Public Key",
        isSecret: false,
        placeholder: "Public key",
      },
      {
        key: "braintree_private_key",
        label: "Private Key",
        isSecret: true,
        placeholder: "Private key",
      },
    ],
  },
  {
    category: "adyen",
    title: "Adyen",
    description: "Global Adyen checkout, payment method, and webhook settings",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiAdyen,
    brandColor: "text-[#0ABF53]",
    libraryCategory: "Payment Gateways",
    capabilities: ["Cards", "Global payments", "Risk", "Webhooks"],
    accountUrl: "https://ca-live.adyen.com/",
    docsUrl: "https://docs.adyen.com/online-payments/",
    instructions: [
      "Open Adyen Customer Area and copy the Merchant Account and API key for the active environment.",
      "Copy the Client Key used by web checkout components.",
      "Configure webhook HMAC signing before enabling Adyen for module transactions.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "adyen_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "test",
      },
      {
        key: "adyen_merchant_account",
        label: "Merchant Account",
        isSecret: false,
        placeholder: "YourMerchantAccount",
      },
      {
        key: "adyen_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "Adyen API key",
      },
      {
        key: "adyen_client_key",
        label: "Client Key",
        isSecret: false,
        placeholder: "Adyen client key",
      },
      {
        key: "adyen_webhook_hmac_key",
        label: "Webhook HMAC Key",
        isSecret: true,
        placeholder: "Webhook HMAC key",
      },
    ],
  },
  {
    category: "amazon_pay",
    title: "Amazon Pay",
    description: "Global Amazon Pay merchant, checkout, and signing key configuration",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiAmazonpay,
    brandColor: "text-[#FF9900]",
    libraryCategory: "Payment Gateways",
    capabilities: ["Amazon wallet", "Checkout", "Signing keys"],
    accountUrl: "https://pay.amazon.com/",
    docsUrl: "https://developer.amazon.com/docs/amazon-pay/intro.html",
    instructions: [
      "Open Amazon Pay merchant integration settings and confirm sandbox or live mode.",
      "Copy the Merchant ID, Store ID, Public Key ID, and private signing key.",
      "Use module-level settings to decide where Amazon Pay appears during checkout.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "amazon_pay_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "sandbox",
      },
      {
        key: "amazon_pay_merchant_id",
        label: "Merchant ID",
        isSecret: false,
        placeholder: "Amazon Pay merchant ID",
      },
      {
        key: "amazon_pay_store_id",
        label: "Store ID",
        isSecret: false,
        placeholder: "Amazon Pay store ID",
      },
      {
        key: "amazon_pay_public_key_id",
        label: "Public Key ID",
        isSecret: false,
        placeholder: "Public key ID",
      },
      {
        key: "amazon_pay_private_key",
        label: "Private Key",
        isSecret: true,
        placeholder: "-----BEGIN PRIVATE KEY-----",
      },
    ],
  },
  {
    category: "apple_pay",
    title: "Apple Pay",
    description: "Global Apple Pay merchant identity and domain verification settings",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiApplepay,
    brandColor: "text-black",
    libraryCategory: "Payment Gateways",
    capabilities: ["Apple wallet", "Domain verification", "Merchant identity"],
    accountUrl: "https://developer.apple.com/account/resources/identifiers/list/merchant",
    docsUrl: "https://developer.apple.com/documentation/apple_pay_on_the_web",
    instructions: [
      "Create or open the Apple Pay Merchant ID in Apple Developer.",
      "Verify the production checkout domain before enabling Apple Pay for a module.",
      "Store certificate references here; certificate file handling should use secure secrets or object storage.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "apple_pay_merchant_id",
        label: "Merchant ID",
        isSecret: false,
        placeholder: "merchant.com.yourdomain",
      },
      {
        key: "apple_pay_display_name",
        label: "Display Name",
        isSecret: false,
        placeholder: "Store or organization name",
      },
      {
        key: "apple_pay_domain",
        label: "Verified Domain",
        isSecret: false,
        placeholder: "https://yourdomain.com",
      },
      {
        key: "apple_pay_payment_processing_cert_ref",
        label: "Payment Processing Certificate Reference",
        isSecret: true,
        placeholder: "Secure certificate reference",
      },
    ],
  },
  {
    category: "google_pay",
    title: "Google Pay",
    description: "Global Google Pay merchant profile and gateway mapping",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiGooglepay,
    brandColor: "text-[#4285F4]",
    libraryCategory: "Payment Gateways",
    capabilities: ["Google wallet", "Gateway mapping", "Merchant profile"],
    accountUrl: "https://pay.google.com/business/console/",
    docsUrl: "https://developers.google.com/pay/api/web/overview",
    instructions: [
      "Create or open the Google Pay Business Console merchant profile.",
      "Copy the Merchant ID and merchant name approved for web payments.",
      "Set the gateway name and merchant identifier used by the selected processor, such as Stripe, Braintree, or Adyen.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "google_pay_environment",
        label: "Environment",
        isSecret: false,
        placeholder: "TEST",
      },
      {
        key: "google_pay_merchant_id",
        label: "Merchant ID",
        isSecret: false,
        placeholder: "Google Pay merchant ID",
      },
      {
        key: "google_pay_merchant_name",
        label: "Merchant Name",
        isSecret: false,
        placeholder: "Store or organization name",
      },
      {
        key: "google_pay_gateway",
        label: "Gateway",
        isSecret: false,
        placeholder: "stripe",
      },
      {
        key: "google_pay_gateway_merchant_id",
        label: "Gateway Merchant ID",
        isSecret: false,
        placeholder: "Gateway merchant ID",
      },
    ],
  },
  {
    category: "klarna",
    title: "Klarna",
    description: "Global Klarna payments, buy-now-pay-later, and order management credentials",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiKlarna,
    brandColor: "text-[#FFB3C7]",
    libraryCategory: "Payment Gateways",
    capabilities: ["Buy now pay later", "Order management", "Regional payments"],
    accountUrl: "https://portal.klarna.com/",
    docsUrl: "https://docs.klarna.com/",
    instructions: [
      "Open Klarna Merchant Portal and confirm test or production environment.",
      "Copy the API username and password for payments.",
      "Set region and merchant ID so module checkouts can route eligible transactions correctly.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "klarna_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "test",
      },
      {
        key: "klarna_region",
        label: "Region",
        isSecret: false,
        placeholder: "na",
      },
      {
        key: "klarna_merchant_id",
        label: "Merchant ID",
        isSecret: false,
        placeholder: "Klarna merchant ID",
      },
      {
        key: "klarna_api_username",
        label: "API Username",
        isSecret: false,
        placeholder: "API username",
      },
      {
        key: "klarna_api_password",
        label: "API Password",
        isSecret: true,
        placeholder: "API password",
      },
    ],
  },
  {
    category: "afterpay",
    title: "Afterpay",
    description: "Global Afterpay/Clearpay merchant and buy-now-pay-later API settings",
    group: "commerce",
    icon: CreditCard,
    brandIcon: SiAfterpay,
    brandColor: "text-[#00C9B7]",
    libraryCategory: "Payment Gateways",
    capabilities: ["Buy now pay later", "Clearpay", "Merchant checkout"],
    accountUrl: "https://portal.afterpay.com/",
    docsUrl: "https://developers.afterpay.com/",
    instructions: [
      "Open the Afterpay merchant portal and confirm sandbox or production mode.",
      "Copy the merchant ID and secret key for API access.",
      "Set country and currency defaults so modules can determine checkout eligibility.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "afterpay_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "sandbox",
      },
      {
        key: "afterpay_merchant_id",
        label: "Merchant ID",
        isSecret: false,
        placeholder: "Afterpay merchant ID",
      },
      {
        key: "afterpay_secret_key",
        label: "Secret Key",
        isSecret: true,
        placeholder: "Afterpay secret key",
      },
      {
        key: "afterpay_country_code",
        label: "Country Code",
        isSecret: false,
        placeholder: "US",
      },
      {
        key: "afterpay_currency",
        label: "Currency",
        isSecret: false,
        placeholder: "USD",
      },
    ],
  },
  {
    category: "affirm",
    title: "Affirm",
    description: "Global Affirm buy-now-pay-later checkout and merchant API settings",
    group: "commerce",
    icon: CreditCard,
    logoText: "Affirm",
    brandColor: "text-[#4A4AF4]",
    libraryCategory: "Payment Gateways",
    capabilities: ["Buy now pay later", "Checkout", "Promotional messaging", "Webhooks"],
    accountUrl: "https://businesshub.affirm.com/",
    docsUrl: "https://docs.affirm.com/",
    instructions: [
      "Open Affirm Business Hub and confirm sandbox or production mode.",
      "Copy the public API key and private API key for checkout authorization.",
      "Configure webhook events and set country and currency defaults before routing live transactions.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "affirm_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "sandbox",
      },
      {
        key: "affirm_public_api_key",
        label: "Public API Key",
        isSecret: false,
        placeholder: "Affirm public API key",
      },
      {
        key: "affirm_private_api_key",
        label: "Private API Key",
        isSecret: true,
        placeholder: "Affirm private API key",
      },
      {
        key: "affirm_webhook_secret",
        label: "Webhook Secret",
        isSecret: true,
        placeholder: "Affirm webhook secret",
      },
      {
        key: "affirm_country_code",
        label: "Country Code",
        isSecret: false,
        placeholder: "US",
      },
      {
        key: "affirm_currency",
        label: "Currency",
        isSecret: false,
        placeholder: "USD",
      },
    ],
  },
  {
    category: "mailgun",
    title: "Mailgun",
    description: "Transactional email delivery service",
    group: "communications",
    icon: Mail,
    brandIcon: SiMailgun,
    brandColor: "text-[#F06B66]",
    accountUrl: "https://app.mailgun.com/app/account/security/api_keys",
    docsUrl:
      "https://help.mailgun.com/hc/en-us/articles/203380100-Where-can-I-find-my-API-keys-and-SMTP-credentials",
    instructions: [
      "Open Mailgun API Security and create or copy an API key.",
      "Open Sending > Domains and copy the verified sending domain.",
      "Enter the from address exactly as messages should appear to recipients.",
    ],
    fields: [
      {
        key: "mailgun_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "key-...",
      },
      {
        key: "mailgun_domain",
        label: "Domain",
        isSecret: false,
        placeholder: "mg.yourdomain.com",
      },
      {
        key: "mailgun_from_address",
        label: "From Address",
        isSecret: false,
        placeholder: "Core Platform <noreply@yourdomain.com>",
      },
    ],
  },
  {
    category: "mailchimp",
    title: "Mailchimp",
    description: "Audience sync used by managed forms and lifecycle tagging",
    group: "marketing",
    icon: Tag,
    brandIcon: SiMailchimp,
    brandColor: "text-[#FFE01B]",
    libraryCategory: "Marketing & Analytics",
    capabilities: ["Audience sync", "Lifecycle tagging", "Email marketing"],
    accountUrl: "https://admin.mailchimp.com/account/api/",
    docsUrl: "https://mailchimp.com/help/about-api-keys/",
    instructions: [
      "Open Mailchimp API Keys and create or copy an active API key.",
      "Use the suffix after the API key hyphen as the Server Prefix, for example us6.",
      "Open Audience settings to copy the Audience ID for the list this site should sync to.",
    ],
    fields: [
      {
        key: "mailchimp_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "xxxxxxxxxxxxxxxxxxxx-us6",
      },
      {
        key: "mailchimp_audience_id",
        label: "Audience ID",
        isSecret: false,
        placeholder: "a1b2c3d4e5",
      },
      {
        key: "mailchimp_server_prefix",
        label: "Server Prefix",
        isSecret: false,
        placeholder: "us6",
      },
    ],
  },
  {
    category: "google_analytics",
    title: "Google Analytics",
    description:
      "Reserve the GA4 tracking and reporting configuration used by future public analytics and the planned admin Analytics area.",
    group: "marketing",
    icon: BarChart3,
    brandIcon: SiGoogleanalytics,
    brandColor: "text-[#E37400]",
    libraryCategory: "Marketing & Analytics",
    capabilities: ["GA4", "Reporting", "Measurement ID"],
    accountUrl: "https://analytics.google.com/analytics/web/",
    docsUrl: "https://support.google.com/analytics/answer/9539598",
    instructions: [
      "Open Google Analytics Admin and choose the GA4 property for this site.",
      "Copy the Measurement ID from Data streams > Web stream details.",
      "For reporting access, create a Google Cloud service account and add its email to the GA4 property with viewer access.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "ga4_measurement_id",
        label: "GA4 Measurement ID",
        isSecret: false,
        placeholder: "G-XXXXXXXXXX",
      },
      {
        key: "ga4_property_id",
        label: "GA4 Property ID",
        isSecret: false,
        placeholder: "123456789",
      },
      {
        key: "ga4_reporting_client_email",
        label: "Reporting Service Account Email",
        isSecret: false,
        placeholder: "ga-reporting@your-project.iam.gserviceaccount.com",
      },
      {
        key: "ga4_reporting_private_key",
        label: "Reporting Private Key",
        isSecret: true,
        placeholder: "-----BEGIN PRIVATE KEY-----",
      },
    ],
  },
  {
    category: "klaviyo",
    title: "Klaviyo",
    description: "Email and SMS lifecycle automation for ecommerce events and customer profiles",
    group: "marketing",
    icon: Send,
    logoText: "Klaviyo",
    brandColor: "text-[#111827]",
    libraryCategory: "Marketing & Analytics",
    capabilities: ["Email", "SMS", "Profiles", "Abandoned cart", "Order events"],
    supportedEvents: ["checkout_started", "order_placed", "order_fulfilled", "order_refunded"],
    supportedCapabilities: ["marketing_event_dispatch", "customer_profile_sync"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://www.klaviyo.com/account#api-keys-tab",
    docsUrl: "https://developers.klaviyo.com/en/reference/events_api_overview",
    instructions: [
      "Create a private API key with event and profile access in Klaviyo.",
      "Copy the public site ID for browser-side identification when tracking is enabled.",
      "Keep event dispatch disabled until consent rules, event mapping, and test profiles are verified.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "klaviyo_private_api_key",
        label: "Private API Key",
        isSecret: true,
        placeholder: "pk_...",
      },
      {
        key: "klaviyo_public_site_id",
        label: "Public Site ID",
        isSecret: false,
        placeholder: "ABC123",
      },
      {
        key: "klaviyo_event_sync_enabled",
        label: "Event Sync Enabled",
        isSecret: false,
        placeholder: "false",
        type: "boolean",
      },
    ],
  },
  {
    category: "omnisend",
    title: "Omnisend",
    description: "Email and SMS automation for ecommerce newsletters, carts, and order lifecycle",
    group: "marketing",
    icon: Send,
    logoText: "Omnisend",
    brandColor: "text-emerald-700",
    libraryCategory: "Marketing & Analytics",
    capabilities: ["Email", "SMS", "Automation", "Contacts", "Order events"],
    supportedEvents: ["checkout_started", "order_placed", "order_fulfilled"],
    supportedCapabilities: ["marketing_event_dispatch", "customer_profile_sync"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://app.omnisend.com/",
    docsUrl: "https://api-docs.omnisend.com/",
    instructions: [
      "Create an API key in Omnisend with contact and event permissions.",
      "Map ecommerce events before enabling automation triggers.",
      "Verify consent handling for email and SMS before syncing customers.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "omnisend_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "Omnisend API key",
      },
      {
        key: "omnisend_brand_id",
        label: "Brand ID",
        isSecret: false,
        placeholder: "Optional brand ID",
      },
      {
        key: "omnisend_event_sync_enabled",
        label: "Event Sync Enabled",
        isSecret: false,
        placeholder: "false",
        type: "boolean",
      },
    ],
  },
  {
    category: "google_ads_tag_manager",
    title: "Google Ads & Tag Manager",
    description:
      "Google Ads conversion tracking, GTM container settings, and remarketing readiness",
    group: "marketing",
    icon: Megaphone,
    brandIcon: SiGoogleads,
    brandColor: "text-[#4285F4]",
    libraryCategory: "Marketing & Analytics",
    capabilities: ["Google Ads", "Tag Manager", "Conversions", "Remarketing"],
    supportedEvents: ["page_view", "view_item", "add_to_cart", "begin_checkout", "purchase"],
    supportedCapabilities: ["marketing_event_dispatch", "tag_container_injection"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://ads.google.com/",
    docsUrl: "https://support.google.com/google-ads/answer/1722054",
    instructions: [
      "Copy the Google Ads conversion ID and purchase conversion label.",
      "Copy the Google Tag Manager container ID when GTM should manage store tags.",
      "Enable dispatch only after cookie consent and duplicate purchase tracking are verified.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "google_ads_conversion_id",
        label: "Conversion ID",
        isSecret: false,
        placeholder: "AW-123456789",
      },
      {
        key: "google_ads_purchase_label",
        label: "Purchase Conversion Label",
        isSecret: false,
        placeholder: "AbCdEfGh...",
      },
      {
        key: "google_tag_manager_container_id",
        label: "GTM Container ID",
        isSecret: false,
        placeholder: "GTM-XXXXXXX",
      },
      {
        key: "google_ads_enhanced_conversions",
        label: "Enhanced Conversions Enabled",
        isSecret: false,
        placeholder: "false",
        type: "boolean",
      },
    ],
  },
  {
    category: "pinterest_ads",
    title: "Pinterest Tag & Conversions API",
    description: "Pinterest product discovery, catalog, tag, and server-side conversion settings",
    group: "marketing",
    icon: Megaphone,
    brandIcon: SiPinterest,
    brandColor: "text-[#E60023]",
    libraryCategory: "Social Commerce",
    capabilities: ["Pinterest Tag", "Conversions API", "Catalog events"],
    supportedEvents: ["page_visit", "view_category", "add_to_cart", "checkout", "purchase"],
    supportedCapabilities: ["marketing_event_dispatch", "product_catalog_events"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://ads.pinterest.com/",
    docsUrl: "https://help.pinterest.com/en/business/article/the-pinterest-api-for-conversions",
    instructions: [
      "Copy the Pinterest Tag ID from Ads Manager.",
      "Create a Conversions API access token only after server-side event mapping is ready.",
      "Verify consent and catalog event names before enabling purchase dispatch.",
    ],
    supportsConnectionTest: false,
    fields: [
      { key: "pinterest_tag_id", label: "Tag ID", isSecret: false, placeholder: "2612345678901" },
      {
        key: "pinterest_access_token",
        label: "Conversions API Access Token",
        isSecret: true,
        placeholder: "pina_...",
      },
      {
        key: "pinterest_ad_account_id",
        label: "Ad Account ID",
        isSecret: false,
        placeholder: "1234567890",
      },
    ],
  },
  {
    category: "microsoft_ads_merchant_center",
    title: "Microsoft Ads & Merchant Center",
    description: "Bing/Microsoft shopping feed, UET tag, and purchase conversion readiness",
    group: "marketing",
    icon: Store,
    logoText: "Microsoft",
    brandColor: "text-[#0078D4]",
    libraryCategory: "Product Feeds",
    capabilities: ["Microsoft Ads", "Bing Shopping", "UET Tag", "Product feed"],
    supportedEvents: ["page_load", "product_view", "add_to_cart", "purchase"],
    supportedCapabilities: ["product_feed_publishing", "marketing_event_dispatch"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://ads.microsoft.com/",
    docsUrl: "https://learn.microsoft.com/en-us/advertising/guides/get-started",
    instructions: [
      "Copy the Microsoft Ads account and customer IDs used for this store.",
      "Copy the UET tag ID for future conversion tracking.",
      "Keep feed publishing disabled until the product feed and tax/shipping settings are validated.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "microsoft_ads_customer_id",
        label: "Customer ID",
        isSecret: false,
        placeholder: "123456789",
      },
      {
        key: "microsoft_ads_account_id",
        label: "Account ID",
        isSecret: false,
        placeholder: "987654321",
      },
      {
        key: "microsoft_uet_tag_id",
        label: "UET Tag ID",
        isSecret: false,
        placeholder: "12345678",
      },
      {
        key: "microsoft_feed_enabled",
        label: "Product Feed Enabled",
        isSecret: false,
        placeholder: "false",
        type: "boolean",
      },
    ],
  },
  {
    category: "avalara_avatax",
    title: "Avalara AvaTax",
    description: "Enterprise tax calculation, exemption, and transaction commit readiness",
    group: "commerce",
    icon: CreditCard,
    logoText: "Avalara",
    brandColor: "text-orange-700",
    libraryCategory: "Tax & Compliance",
    capabilities: ["Tax quotes", "Transaction commits", "Exemptions", "Address validation"],
    supportedCapabilities: ["tax_quote", "tax_transaction_commit", "tax_refund_adjustment"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://admin.avalara.com/",
    docsUrl: "https://developer.avalara.com/products/avatax/",
    instructions: [
      "Create or identify the AvaTax company code used for this store.",
      "Copy the account ID and license key for the correct sandbox or production environment.",
      "Do not enable transaction commits until checkout tax quotes and refund flows are tested.",
    ],
    supportsConnectionTest: false,
    fields: [
      { key: "avalara_environment", label: "Environment", isSecret: false, placeholder: "sandbox" },
      { key: "avalara_account_id", label: "Account ID", isSecret: false, placeholder: "123456789" },
      {
        key: "avalara_license_key",
        label: "License Key",
        isSecret: true,
        placeholder: "Avalara license key",
      },
      {
        key: "avalara_company_code",
        label: "Company Code",
        isSecret: false,
        placeholder: "DEFAULT",
      },
    ],
  },
  {
    category: "taxjar",
    title: "TaxJar",
    description: "Sales tax calculation and transaction reporting for small and midmarket stores",
    group: "commerce",
    icon: CreditCard,
    logoText: "TaxJar",
    brandColor: "text-blue-700",
    libraryCategory: "Tax & Compliance",
    capabilities: ["Tax quotes", "Nexus", "Transactions", "Refund adjustments"],
    supportedCapabilities: ["tax_quote", "tax_transaction_commit", "tax_refund_adjustment"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://app.taxjar.com/account#api-access",
    docsUrl: "https://developers.taxjar.com/api/reference/",
    instructions: [
      "Copy the TaxJar API token from account API access.",
      "Confirm nexus states and product tax categories before enabling checkout quotes.",
      "Keep transaction sync disabled until paid order and refund mappings are verified.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "taxjar_api_token",
        label: "API Token",
        isSecret: true,
        placeholder: "TaxJar API token",
      },
      {
        key: "taxjar_environment",
        label: "Environment",
        isSecret: false,
        placeholder: "production",
      },
      {
        key: "taxjar_transaction_sync_enabled",
        label: "Transaction Sync Enabled",
        isSecret: false,
        placeholder: "false",
        type: "boolean",
      },
    ],
  },
  {
    category: "meta_ads",
    title: "Meta Pixel & Conversions API",
    description:
      "Marketing pixel and server-side event credentials for Facebook and Instagram commerce campaigns",
    group: "marketing",
    icon: Megaphone,
    brandIcon: SiMeta,
    brandColor: "text-[#0467DF]",
    libraryCategory: "Social Commerce",
    capabilities: ["Meta Pixel", "Conversions API", "Facebook", "Instagram"],
    accountUrl: "https://business.facebook.com/events_manager",
    docsUrl: "https://developers.facebook.com/docs/meta-pixel/",
    instructions: [
      "Open Meta Events Manager and choose the dataset connected to this store.",
      "Copy the Pixel ID for browser PageView tracking.",
      "Create a Conversions API access token only when server-side purchase events are ready to be enabled.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "meta_pixel_id",
        label: "Pixel ID",
        isSecret: false,
        placeholder: "123456789012345",
      },
      {
        key: "meta_access_token",
        label: "Conversions API Access Token",
        isSecret: true,
        placeholder: "EAAB...",
      },
      {
        key: "meta_test_event_code",
        label: "Test Event Code",
        isSecret: false,
        placeholder: "TEST12345",
      },
    ],
  },
  {
    category: "tiktok_ads",
    title: "TikTok Pixel & Events API",
    description:
      "TikTok browser pixel and Events API credentials for catalog, checkout, and purchase tracking",
    group: "marketing",
    icon: Megaphone,
    brandIcon: SiTiktok,
    brandColor: "text-black",
    libraryCategory: "Social Commerce",
    capabilities: ["TikTok Pixel", "Events API", "Catalog events"],
    accountUrl: "https://ads.tiktok.com/i18n/events_manager",
    docsUrl: "https://business-api.tiktok.com/portal/docs?id=1739584855420929",
    instructions: [
      "Open TikTok Events Manager and choose the web event source for this store.",
      "Copy the Pixel ID for consent-based browser tracking.",
      "Create an Events API access token only when server-side purchase events are ready to be enabled.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "tiktok_pixel_id",
        label: "Pixel ID",
        isSecret: false,
        placeholder: "CXXXXXXXXXXXXXXX",
      },
      {
        key: "tiktok_access_token",
        label: "Events API Access Token",
        isSecret: true,
        placeholder: "Act...",
      },
      {
        key: "tiktok_test_event_code",
        label: "Test Event Code",
        isSecret: false,
        placeholder: "TEST12345",
      },
    ],
  },
  {
    category: "x_ads",
    title: "X Ads Website Tag",
    description:
      "Consent-based website tag configuration for X campaign measurement and remarketing",
    group: "marketing",
    icon: Megaphone,
    brandIcon: SiX,
    brandColor: "text-black",
    libraryCategory: "Social Commerce",
    capabilities: ["Website tag", "Remarketing", "Campaign measurement"],
    accountUrl: "https://ads.x.com/conversion_tracking",
    docsUrl:
      "https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html",
    instructions: [
      "Open X Ads conversion tracking and create or select the website tag for this store.",
      "Copy the website tag ID into this card.",
      "Use the tag only after confirming marketing cookie consent requirements for the site.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "x_pixel_id",
        label: "Website Tag ID",
        isSecret: false,
        placeholder: "o1234",
      },
    ],
  },
  {
    category: "google_merchant_center",
    title: "Google Merchant Center",
    description: "Product feed readiness settings for Shopping surfaces and merchant diagnostics",
    group: "commerce",
    icon: Store,
    brandIcon: SiGoogle,
    brandColor: "text-[#4285F4]",
    libraryCategory: "Product Feeds",
    capabilities: ["Shopping feed", "Merchant diagnostics", "Product publishing"],
    accountUrl: "https://merchants.google.com/",
    docsUrl: "https://support.google.com/merchants/answer/7052112",
    instructions: [
      "Create or open the Merchant Center account for this store.",
      "Copy the Merchant Center ID for future feed publishing and diagnostics.",
      "Keep feed publishing disabled until product inventory, tax, shipping, and return policies are final.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "merchant_center_id",
        label: "Merchant Center ID",
        isSecret: false,
        placeholder: "123456789",
      },
      {
        key: "product_feed_enabled",
        label: "Product Feed Enabled",
        isSecret: false,
        placeholder: "false",
        type: "boolean",
      },
    ],
  },
  {
    category: "amazon_marketplace",
    title: "Amazon Marketplace + MCF",
    description: "Amazon marketplace order sync and future Multi-Channel Fulfillment readiness",
    group: "commerce",
    icon: Store,
    brandIcon: SiAmazon,
    brandColor: "text-[#FF9900]",
    libraryCategory: "Marketplaces",
    capabilities: ["Marketplace orders", "Inventory sync", "Amazon MCF", "Listings"],
    supportedCapabilities: ["marketplace_order_sync", "inventory_sync", "fulfillment_sync"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://sellercentral.amazon.com/",
    docsUrl: "https://developer-docs.amazon.com/sp-api",
    instructions: [
      "Create or authorize an Amazon Selling Partner API application for this seller account.",
      "Copy marketplace, seller, and app identifiers for future order and inventory sync.",
      "Keep order import and MCF fulfillment disabled until sandbox authorization and webhook polling are tested.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "amazon_spapi_marketplace_id",
        label: "Marketplace ID",
        isSecret: false,
        placeholder: "ATVPDKIKX0DER",
      },
      {
        key: "amazon_spapi_seller_id",
        label: "Seller ID",
        isSecret: false,
        placeholder: "A1SELLERID",
      },
      {
        key: "amazon_spapi_client_id",
        label: "Client ID",
        isSecret: true,
        placeholder: "SP-API client ID",
      },
      {
        key: "amazon_spapi_client_secret",
        label: "Client Secret",
        isSecret: true,
        placeholder: "SP-API client secret",
      },
      {
        key: "amazon_spapi_refresh_token",
        label: "Refresh Token",
        isSecret: true,
        placeholder: "Refresh token",
      },
    ],
  },
  {
    category: "walmart_marketplace",
    title: "Walmart Marketplace",
    description: "Walmart Marketplace item, inventory, order, and fulfillment sync readiness",
    group: "commerce",
    icon: Store,
    brandIcon: SiWalmart,
    brandColor: "text-[#0071CE]",
    libraryCategory: "Marketplaces",
    capabilities: ["Marketplace orders", "Item sync", "Inventory sync", "Fulfillment"],
    supportedCapabilities: ["marketplace_order_sync", "inventory_sync", "product_feed_publishing"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://seller.walmart.com/",
    docsUrl: "https://developer.walmart.com/us-marketplace/docs/introduction-to-marketplace-apis",
    instructions: [
      "Create Walmart Marketplace API credentials for the seller account.",
      "Copy the client ID and client secret used for marketplace API access.",
      "Keep order and inventory sync disabled until item mapping and fulfillment settings are verified.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "walmart_marketplace_client_id",
        label: "Client ID",
        isSecret: true,
        placeholder: "Walmart client ID",
      },
      {
        key: "walmart_marketplace_client_secret",
        label: "Client Secret",
        isSecret: true,
        placeholder: "Walmart client secret",
      },
      {
        key: "walmart_marketplace_channel_type",
        label: "Channel Type",
        isSecret: false,
        placeholder: "Marketplace",
      },
      {
        key: "walmart_marketplace_sync_enabled",
        label: "Marketplace Sync Enabled",
        isSecret: false,
        placeholder: "false",
        type: "boolean",
      },
    ],
  },
  {
    category: "crm",
    title: "CRM Inbound API",
    description:
      "API key used by external lead sources like social ads, Zapier, and landing-page tools",
    group: "communications",
    icon: Plug,
    logoText: "CRM",
    brandColor: "text-blue-700",
    accountUrl: "https://core-platform-production-0848.up.railway.app/admin/settings",
    docsUrl: "https://core-platform-production-0848.up.railway.app/admin/settings",
    instructions: [
      "Create a strong shared key for trusted lead sources.",
      "Send inbound leads to /api/crm/leads with the key in the X-CRM-API-Key header.",
      "Rotate this key if a connected integration is removed or compromised.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "crm_api_key",
        label: "Inbound API Key",
        isSecret: true,
        placeholder: "Generate a long random secret",
      },
    ],
  },
  {
    category: "shipbob",
    title: "ShipBob",
    description: "3PL fulfillment, distributed inventory, warehouse, and order sync readiness",
    group: "shipping",
    icon: Truck,
    logoText: "ShipBob",
    brandColor: "text-blue-700",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["3PL", "Fulfillment", "Inventory", "Warehouses", "Order sync"],
    supportedCapabilities: ["fulfillment_sync", "inventory_sync", "shipment_tracking"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://web.shipbob.com/",
    docsUrl: "https://developer.shipbob.com/introduction",
    instructions: [
      "Create a ShipBob API token with order, inventory, and fulfillment permissions.",
      "Copy the default fulfillment center or channel identifier for this store.",
      "Keep fulfillment sync disabled until SKUs and package workflows are mapped.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "shipbob_api_token",
        label: "API Token",
        isSecret: true,
        placeholder: "ShipBob API token",
      },
      {
        key: "shipbob_channel_id",
        label: "Channel ID",
        isSecret: false,
        placeholder: "Channel identifier",
      },
      {
        key: "shipbob_default_fulfillment_center_id",
        label: "Default Fulfillment Center ID",
        isSecret: false,
        placeholder: "Optional center ID",
      },
      {
        key: "shipbob_sync_enabled",
        label: "Fulfillment Sync Enabled",
        isSecret: false,
        placeholder: "false",
        type: "boolean",
      },
    ],
  },
  {
    category: "easypost",
    title: "EasyPost",
    description:
      "Aggregator-first live rates, labels, tracking, and address validation across major carriers",
    group: "shipping",
    icon: Truck,
    logoText: "EasyPost",
    brandColor: "text-indigo-700",
    badge: "First operational live-rates path",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["Live rates", "Labels", "Tracking", "Address validation", "Carrier aggregation"],
    supportedCapabilities: [
      "shipping_rates",
      "label_purchase",
      "shipment_tracking",
      "address_validation",
    ],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://www.easypost.com/account/api-keys",
    docsUrl: "https://docs.easypost.com/docs",
    instructions: [
      "Copy the EasyPost test and production API keys.",
      "Use test mode until package dimensions, shipping zones, rates, labels, and tracking are verified.",
      "This is the preferred first adapter for live USPS/UPS/FedEx/DHL-style rate shopping.",
    ],
    supportsConnectionTest: false,
    fields: [
      { key: "easypost_active_mode", label: "Active Mode", isSecret: false, placeholder: "test" },
      {
        key: "easypost_test_api_key",
        label: "Test API Key",
        isSecret: true,
        placeholder: "EZTK...",
      },
      {
        key: "easypost_live_api_key",
        label: "Live API Key",
        isSecret: true,
        placeholder: "EZAK...",
      },
      {
        key: "easypost_webhook_secret",
        label: "Webhook Secret",
        isSecret: true,
        placeholder: "Optional webhook secret",
      },
    ],
  },
  {
    category: "ups",
    title: "UPS",
    description:
      "Direct UPS merchant account credentials for future live rates, labels, and tracking",
    group: "shipping",
    icon: Truck,
    logoText: "UPS",
    brandColor: "text-amber-900",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["Direct carrier", "Live rates", "Labels", "Tracking", "International"],
    supportedCapabilities: [
      "shipping_rates",
      "label_purchase",
      "shipment_tracking",
      "address_validation",
    ],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://www.ups.com/upsdeveloperkit",
    docsUrl: "https://developer.ups.com/",
    instructions: [
      "Create UPS API credentials for the merchant account.",
      "Copy the client ID, client secret, and account number.",
      "Keep direct UPS live rates disabled until OAuth, rating, label, and tracking adapters are tested.",
    ],
    supportsConnectionTest: false,
    fields: [
      { key: "ups_client_id", label: "Client ID", isSecret: true, placeholder: "UPS client ID" },
      {
        key: "ups_client_secret",
        label: "Client Secret",
        isSecret: true,
        placeholder: "UPS client secret",
      },
      {
        key: "ups_account_number",
        label: "Account Number",
        isSecret: true,
        placeholder: "UPS account number",
      },
    ],
  },
  {
    category: "usps",
    title: "USPS",
    description:
      "Direct USPS domestic shipping credentials for future live rates, labels, and tracking",
    group: "shipping",
    icon: Truck,
    logoText: "USPS",
    brandColor: "text-blue-700",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["Direct carrier", "Domestic rates", "Labels", "Tracking"],
    supportedCapabilities: ["shipping_rates", "label_purchase", "shipment_tracking"],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://developer.usps.com/",
    docsUrl: "https://developer.usps.com/",
    instructions: [
      "Create USPS developer credentials for the merchant account.",
      "Copy the API key and account identifiers required by USPS APIs.",
      "Keep direct USPS live rates disabled until rating, label, and tracking adapters are tested.",
    ],
    supportsConnectionTest: false,
    fields: [
      { key: "usps_api_key", label: "API Key", isSecret: true, placeholder: "USPS API key" },
      {
        key: "usps_account_number",
        label: "Account Number",
        isSecret: true,
        placeholder: "Optional account number",
      },
    ],
  },
  {
    category: "fedex",
    title: "FedEx",
    description:
      "Direct FedEx merchant account credentials for future live rates, labels, and tracking",
    group: "shipping",
    icon: Truck,
    logoText: "FedEx",
    brandColor: "text-purple-700",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["Direct carrier", "Live rates", "Labels", "Tracking", "International"],
    supportedCapabilities: [
      "shipping_rates",
      "label_purchase",
      "shipment_tracking",
      "address_validation",
    ],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://developer.fedex.com/",
    docsUrl: "https://developer.fedex.com/api/en-us/home.html",
    instructions: [
      "Create FedEx API credentials for the merchant account.",
      "Copy the API key, secret key, and account number.",
      "Keep direct FedEx live rates disabled until rating, label, and tracking adapters are tested.",
    ],
    supportsConnectionTest: false,
    fields: [
      { key: "fedex_client_id", label: "API Key", isSecret: true, placeholder: "FedEx API key" },
      {
        key: "fedex_client_secret",
        label: "Secret Key",
        isSecret: true,
        placeholder: "FedEx secret key",
      },
      {
        key: "fedex_account_number",
        label: "Account Number",
        isSecret: true,
        placeholder: "FedEx account number",
      },
    ],
  },
  {
    category: "dhl_express",
    title: "DHL Express",
    description:
      "Direct DHL Express credentials for future international rates, labels, and tracking",
    group: "shipping",
    icon: Truck,
    brandIcon: SiDhl,
    brandColor: "text-[#D40511]",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["Direct carrier", "International rates", "Labels", "Tracking"],
    supportedCapabilities: [
      "shipping_rates",
      "label_purchase",
      "shipment_tracking",
      "international",
    ],
    configurable: true,
    operational: false,
    requiresAdapter: true,
    accountUrl: "https://developer.dhl.com/",
    docsUrl: "https://developer.dhl.com/api-reference/mydhl-api-dhl-express",
    instructions: [
      "Create DHL Express API credentials for the merchant account.",
      "Copy the API key, API secret, and account number.",
      "Keep direct DHL live rates disabled until MyDHL rating, label, and tracking adapters are tested.",
    ],
    supportsConnectionTest: false,
    fields: [
      { key: "dhl_express_api_key", label: "API Key", isSecret: true, placeholder: "DHL API key" },
      {
        key: "dhl_express_api_secret",
        label: "API Secret",
        isSecret: true,
        placeholder: "DHL API secret",
      },
      {
        key: "dhl_express_account_number",
        label: "Account Number",
        isSecret: true,
        placeholder: "DHL account number",
      },
    ],
  },
  {
    category: "shipstation",
    title: "ShipStation",
    description:
      "Shipping label, fulfillment, and shipment sync configuration for ecommerce orders",
    group: "shipping",
    icon: Truck,
    logoText: "ShipStation",
    brandColor: "text-teal-700",
    badge: "Best workflow automation",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["Labels", "Tracking", "Order sync", "Warehouse automation"],
    accountUrl: "https://shipstation.com/account/settings/api",
    docsUrl: "https://docs.shipstation.com/api-overview",
    instructions: [
      "Open ShipStation API settings and copy the API key and API secret.",
      "Copy the Store ID and Warehouse ID that should receive ecommerce orders.",
      "Keep fulfillment automation disabled until carrier services, package defaults, and test orders are verified.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "shipstation_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "ShipStation API key",
      },
      {
        key: "shipstation_api_secret",
        label: "API Secret",
        isSecret: true,
        placeholder: "ShipStation API secret",
      },
      {
        key: "shipstation_store_id",
        label: "Store ID",
        isSecret: false,
        placeholder: "123456",
      },
      {
        key: "shipstation_warehouse_id",
        label: "Warehouse ID",
        isSecret: false,
        placeholder: "123456",
      },
    ],
  },
  {
    category: "shippo",
    title: "Shippo",
    description:
      "Carrier rates, label purchasing, address validation, and tracking through a developer-first shipping API",
    group: "shipping",
    icon: Truck,
    logoText: "Shippo",
    brandColor: "text-purple-700",
    badge: "Best API strategy",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["Carrier rates", "Labels", "Tracking", "Address validation"],
    accountUrl: "https://apps.goshippo.com/settings/api",
    docsUrl: "https://docs.goshippo.com/docs/Guides_general/authentication/",
    instructions: [
      "Open Shippo API settings and copy separate test and live tokens.",
      "Use test mode while validating rates, labels, webhooks, and tracking events.",
      "Switch to live mode only after package dimensions, carrier accounts, and fulfillment workflows are verified.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "shippo_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "test",
      },
      {
        key: "shippo_test_token",
        label: "Test API Token",
        isSecret: true,
        placeholder: "shippo_test_...",
      },
      {
        key: "shippo_live_token",
        label: "Live API Token",
        isSecret: true,
        placeholder: "shippo_live_...",
      },
      {
        key: "shippo_webhook_secret",
        label: "Webhook Secret",
        isSecret: true,
        placeholder: "Optional webhook signing secret",
      },
    ],
  },
  {
    category: "veeqo",
    title: "Veeqo",
    description:
      "Inventory, warehouse, order, shipping, and marketplace operations for multi-channel ecommerce",
    group: "shipping",
    icon: Store,
    logoText: "Veeqo",
    brandColor: "text-emerald-700",
    badge: "Best inventory + shipping",
    libraryCategory: "Inventory & Operations",
    capabilities: ["Inventory", "Warehouses", "Shipping", "Marketplace operations"],
    accountUrl: "https://app.veeqo.com/",
    docsUrl: "https://developers.veeqo.com/getting-started/authentication",
    instructions: [
      "Use Veeqo when the store needs inventory and warehouse operations alongside shipping.",
      "For private store usage, generate an API key from the Veeqo user or employee record.",
      "Store warehouse, channel, and location identifiers so future order sync can target the correct operation.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "veeqo_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "Veeqo API key",
      },
      {
        key: "veeqo_default_warehouse_id",
        label: "Default Warehouse ID",
        isSecret: false,
        placeholder: "123456",
      },
      {
        key: "veeqo_default_store_id",
        label: "Default Store ID",
        isSecret: false,
        placeholder: "123456",
      },
      {
        key: "veeqo_sync_inventory",
        label: "Sync Inventory",
        isSecret: false,
        placeholder: "false",
      },
    ],
  },
  {
    category: "easyship",
    title: "Easyship",
    description:
      "International shipping rates, duties, taxes, courier options, and cross-border delivery workflows",
    group: "shipping",
    icon: Truck,
    logoText: "Easyship",
    brandColor: "text-sky-700",
    badge: "Best international features",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["International rates", "Duties", "Taxes", "Courier options"],
    accountUrl: "https://www.easyship.com/developers",
    docsUrl: "https://www.easyship.com/developers",
    instructions: [
      "Use Easyship when cross-border rates, duties, taxes, and international courier options matter.",
      "Generate an API key from the Easyship developer area and start in sandbox/test mode when available.",
      "Save origin warehouse and incoterm defaults before enabling automated label purchasing.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "easyship_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "Easyship API key",
      },
      {
        key: "easyship_active_mode",
        label: "Active Mode",
        isSecret: false,
        placeholder: "test",
      },
      {
        key: "easyship_origin_warehouse_id",
        label: "Origin Warehouse ID",
        isSecret: false,
        placeholder: "warehouse identifier",
      },
      {
        key: "easyship_default_incoterm",
        label: "Default Incoterm",
        isSecret: false,
        placeholder: "DDU",
      },
    ],
  },
  {
    category: "pirate_ship",
    title: "Pirate Ship",
    description:
      "Simple manual shipping workflow using order exports and tracking imports instead of a public API",
    group: "shipping",
    icon: Truck,
    logoText: "Pirate Ship",
    brandColor: "text-orange-700",
    badge: "Best simplicity",
    libraryCategory: "Shipping & Fulfillment",
    capabilities: ["Manual workflow", "CSV export", "Tracking import"],
    accountUrl: "https://www.pirateship.com/",
    docsUrl: "https://support.pirateship.com/en/articles/2309246-does-pirate-ship-have-an-api",
    instructions: [
      "Pirate Ship does not expose a public API, so this integration is intentionally configured as a manual workflow.",
      "Use CSV order export and tracking import for simple stores that do not need real-time rate or label automation.",
      "Choose Shippo, ShipStation, Veeqo, or Easyship instead when automated labels, webhooks, or API-driven fulfillment are required.",
    ],
    supportsConnectionTest: false,
    fields: [
      {
        key: "pirate_ship_account_email",
        label: "Account Email",
        isSecret: false,
        placeholder: "shipping@yourdomain.com",
      },
      {
        key: "pirate_ship_export_profile",
        label: "Export Profile",
        isSecret: false,
        placeholder: "Default CSV export",
      },
      {
        key: "pirate_ship_tracking_import_enabled",
        label: "Tracking Import Enabled",
        isSecret: false,
        placeholder: "false",
      },
    ],
  },
  {
    category: "cloudflare_r2",
    title: "Cloudflare R2",
    description: "Object storage for images and file uploads",
    group: "infrastructure",
    icon: Cloud,
    brandIcon: SiCloudflare,
    brandColor: "text-[#F38020]",
    accountUrl: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    docsUrl: "https://developers.cloudflare.com/r2/api/s3/tokens/",
    instructions: [
      "Open Cloudflare R2 API tokens for the correct account.",
      "Create an Account API token with Object Read and Write access scoped to this bucket.",
      "Copy the Access Key ID and Secret Access Key immediately; Cloudflare only shows the secret once.",
      "Copy the Account ID from the R2 overview or account overview, then enter the bucket name.",
      "Leave Public URL blank unless you have a custom public domain. Do not use the r2.cloudflarestorage.com API endpoint as the Public URL.",
    ],
    fields: [
      {
        key: "r2_account_id",
        label: "Account ID",
        isSecret: false,
        placeholder: "Your Cloudflare Account ID",
      },
      {
        key: "r2_access_key_id",
        label: "Access Key ID",
        isSecret: true,
        placeholder: "Access key for R2",
      },
      {
        key: "r2_secret_access_key",
        label: "Secret Access Key",
        isSecret: true,
        placeholder: "Secret access key for R2",
      },
      {
        key: "r2_bucket_name",
        label: "Bucket Name",
        isSecret: false,
        placeholder: "core-platform-uploads",
      },
      {
        key: "r2_public_url",
        label: "Public URL",
        isSecret: false,
        placeholder: "https://cdn.yourdomain.com",
      },
    ],
  },
];

export function IntegrationCard({
  config,
  settings,
}: {
  config: IntegrationConfig;
  settings: SettingsData;
}) {
  const { toast } = useToast();
  const categorySettings = settings[config.category] || {};
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const hasAnyValue = config.fields.some(
    (f) => categorySettings[f.key]?.value && categorySettings[f.key].value !== "",
  );

  const saveMutation = useMutation({
    mutationFn: async (field: IntegrationField) => {
      const val = values[field.key];
      if (val === undefined || val === "") return;
      await apiRequest("PUT", "/api/admin/settings", {
        key: field.key,
        value: val,
        category: config.category,
        isSecret: field.isSecret,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Setting saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving setting", description: err.message, variant: "destructive" });
    },
  });

  const saveAll = async () => {
    for (const field of config.fields) {
      const val = values[field.key];
      if (val !== undefined && val !== "") {
        await saveMutation.mutateAsync(field);
      }
    }
    setValues({});
  };

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/settings/test-connection", {
        integration: config.category,
      });
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      toast({
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  const supportsConnectionTest = config.supportsConnectionTest !== false;

  const Icon = config.icon;
  const BrandIcon = config.brandIcon;

  return (
    <Card data-testid={`card-integration-${config.category}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
              {BrandIcon ? (
                <BrandIcon
                  aria-label={`${config.title} logo`}
                  className={cn("h-8 w-8", config.brandColor || "text-primary")}
                />
              ) : config.logoText ? (
                <span
                  aria-label={`${config.title} logo`}
                  className={cn(
                    "px-1 text-center text-[11px] font-bold leading-tight tracking-normal",
                    config.brandColor || "text-primary",
                  )}
                >
                  {config.logoText}
                </span>
              ) : (
                <Icon className={cn("h-7 w-7", config.brandColor || "text-primary")} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{config.title}</CardTitle>
                {config.badge ? (
                  <Badge variant="secondary" className="font-normal">
                    {config.badge}
                  </Badge>
                ) : null}
              </div>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.replitConnected && (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                data-testid={`badge-replit-${config.category}`}
              >
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" /> Auto-connected
                </span>
              </Badge>
            )}
            {config.requiresAdapter ? (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-800"
                data-testid={`badge-readiness-${config.category}`}
              >
                Setup ready
              </Badge>
            ) : config.operational ? (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700"
                data-testid={`badge-readiness-${config.category}`}
              >
                Operational
              </Badge>
            ) : null}
            <Badge
              variant={hasAnyValue ? "default" : "outline"}
              data-testid={`badge-status-${config.category}`}
            >
              {hasAnyValue ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Not configured
                </span>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.replitConnected && (
          <div
            className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-2"
            data-testid={`notice-replit-${config.category}`}
          >
            <Link2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              This service is auto-connected via Replit integration. The fields below are optional
              overrides for custom or production keys.
            </span>
          </div>
        )}
        {config.requiresAdapter ? (
          <div
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            data-testid={`notice-readiness-${config.category}`}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Credentials can be saved now. This integration will not affect checkout, fulfillment,
              feeds, tax, or marketing events until its operational adapter is implemented and
              tested.
            </span>
          </div>
        ) : null}
        <div className="rounded-md border bg-muted/30 px-3 py-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={config.accountUrl} target="_blank" rel="noreferrer">
                Open {config.title} Account
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
            {config.docsUrl ? (
              <Button asChild variant="ghost" size="sm">
                <a href={config.docsUrl} target="_blank" rel="noreferrer">
                  Setup Docs
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
            {config.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>
        {config.fields.map((field) => {
          const existing = categorySettings[field.key];
          const hasExisting = existing && existing.value && existing.value !== "";
          const currentVal = values[field.key] ?? "";
          const normalizedExisting = existing?.value?.trim().toLowerCase();
          const isBooleanEnabled =
            values[field.key] !== undefined
              ? values[field.key] === "true"
              : ["true", "1", "yes", "on"].includes(normalizedExisting ?? "");
          const isVisible = showSecrets[field.key];
          const shouldAutoPrependHttps =
            /url/i.test(field.label) ||
            field.key.toLowerCase().endsWith("_url") ||
            field.placeholder?.startsWith("https://") === true;

          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === "boolean" ? (
                <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {isBooleanEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    id={field.key}
                    checked={isBooleanEnabled}
                    onCheckedChange={(checked) =>
                      setValues((prev) => ({ ...prev, [field.key]: checked ? "true" : "false" }))
                    }
                    data-testid={`switch-${field.key}`}
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id={field.key}
                      type={field.isSecret && !isVisible ? "password" : "text"}
                      placeholder={
                        hasExisting
                          ? field.isSecret
                            ? "••••••••  (saved — enter new value to update)"
                            : existing.value
                          : field.placeholder
                      }
                      value={currentVal}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      autoPrependHttps={shouldAutoPrependHttps}
                      data-testid={`input-${field.key}`}
                    />
                  </div>
                  {field.isSecret && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setShowSecrets((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key],
                        }))
                      }
                      data-testid={`button-toggle-${field.key}`}
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={saveAll}
            disabled={saveMutation.isPending || Object.values(values).every((v) => !v)}
            data-testid={`button-save-${config.category}`}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !hasAnyValue}
            className={cn(!supportsConnectionTest && "hidden")}
            data-testid={`button-test-${config.category}`}
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plug className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>
        {!supportsConnectionTest ? (
          <p className="text-xs text-muted-foreground">
            Tracking and reporting values can be saved now. Connection validation will be added when
            the Analytics feature ships.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function IntegrationsTab({ settings }: { settings: SettingsData }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<IntegrationGroupKey | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<IntegrationLibraryCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IntegrationStatusFilter>("all");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const platformIntegrations = INTEGRATIONS.filter(
    (config) => !ECOMMERCE_INTEGRATION_CATEGORIES.has(config.category),
  );
  const configuredCount = platformIntegrations.filter((config) =>
    isIntegrationConfigured(config, settings),
  ).length;
  const groupCounts = useMemo(
    () => getIntegrationLibraryCounts(platformIntegrations, settings),
    [platformIntegrations, settings],
  );
  const libraryCategories = useMemo(
    () =>
      Array.from(
        new Set(
          platformIntegrations.map(
            (config) => config.libraryCategory || ("Other" as IntegrationLibraryCategory),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [platformIntegrations],
  );
  const filteredIntegrations = useMemo(
    () =>
      filterIntegrations(platformIntegrations, settings, {
        searchQuery,
        groupFilter,
        categoryFilter,
        statusFilter,
      }),
    [categoryFilter, groupFilter, platformIntegrations, searchQuery, settings, statusFilter],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-integrations-heading">
          Integrations
        </h3>
        <p className="text-sm text-muted-foreground">
          Browse platform-wide integrations as a library. {configuredCount} of{" "}
          {platformIntegrations.length} connections have saved settings, and secret values are
          encrypted at rest.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {INTEGRATION_GROUPS.map((group) => {
          const counts = groupCounts[group.key] || { total: 0, configured: 0 };
          if (counts.total === 0) return null;

          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setGroupFilter(group.key)}
              className={cn(
                "rounded-lg border bg-background p-3 text-left shadow-sm transition-colors hover:bg-muted/40",
                groupFilter === group.key && "border-primary bg-primary/5",
              )}
              data-testid={`button-integration-group-${group.key}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{group.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {counts.total}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{counts.configured} configured</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search integrations, providers, capabilities..."
            className="pl-9"
            data-testid="input-search-integrations"
          />
        </div>
        <Select
          value={groupFilter}
          onValueChange={(value) => setGroupFilter(value as IntegrationGroupKey | "all")}
        >
          <SelectTrigger className="w-[190px]" data-testid="select-integration-group-filter">
            <SelectValue placeholder="Module type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Module Types</SelectItem>
            {INTEGRATION_GROUPS.map((group) => (
              <SelectItem key={group.key} value={group.key}>
                {group.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value as IntegrationLibraryCategory | "all")}
        >
          <SelectTrigger className="w-[190px]" data-testid="select-integration-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {libraryCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as IntegrationStatusFilter)}
        >
          <SelectTrigger className="w-[165px]" data-testid="select-integration-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="configured">Configured</SelectItem>
            <SelectItem value="not_configured">Not Configured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" data-testid="text-integration-result-count">
          Showing {filteredIntegrations.length} of {platformIntegrations.length} integrations
        </p>
        {(searchQuery ||
          groupFilter !== "all" ||
          categoryFilter !== "all" ||
          statusFilter !== "all") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setGroupFilter("all");
              setCategoryFilter("all");
              setStatusFilter("all");
            }}
            data-testid="button-clear-integration-filters"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {filteredIntegrations.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>No integrations match the current filters.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredIntegrations.map((config) => {
            const configured = isIntegrationConfigured(config, settings);
            const Icon = config.icon;
            const BrandIcon = config.brandIcon;

            return (
              <Card key={config.category} data-testid={`library-integration-${config.category}`}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
                        {BrandIcon ? (
                          <BrandIcon
                            aria-label={`${config.title} logo`}
                            className={cn("h-6 w-6", config.brandColor || "text-primary")}
                          />
                        ) : config.logoText ? (
                          <span
                            aria-label={`${config.title} logo`}
                            className={cn(
                              "px-1 text-center text-[10px] font-bold leading-tight tracking-normal",
                              config.brandColor || "text-primary",
                            )}
                          >
                            {config.logoText}
                          </span>
                        ) : (
                          <Icon className={cn("h-5 w-5", config.brandColor || "text-primary")} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{config.title}</h4>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant={configured ? "default" : "outline"} className="text-xs">
                      {configured ? "Configured" : "Not configured"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {getIntegrationGroupLabel(config.group)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {config.libraryCategory || "Other"}
                    </Badge>
                    {(config.capabilities || []).slice(0, 2).map((capability) => (
                      <Badge key={capability} variant="outline" className="text-xs font-normal">
                        {capability}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedIntegration(config)}
                    data-testid={`button-open-integration-${config.category}`}
                  >
                    Configure
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={!!selectedIntegration}
        onOpenChange={(open) => {
          if (!open) setSelectedIntegration(null);
        }}
      >
        <SheetContent side="right" size="xl">
          <SheetHeader>
            <SheetTitle>Configure Integration</SheetTitle>
            <SheetDescription>
              Save credentials, review setup steps, and test supported connections.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {selectedIntegration ? (
              <IntegrationCard config={selectedIntegration} settings={settings} />
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export { SpecializationsTab } from "./settings/specializations-tab";

import { SystemConfigurationTab } from "./settings/system-configuration-tab";
import { HeadTagAdditionsTab } from "./settings/head-tag-additions-tab";
export default function AdminSettingsPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/settings/:tab");
  const activeTab = normalizeSettingsTab(params?.tab);
  const shouldLoadSettings = activeTab !== "email-templates";
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/admin/settings"],
    enabled: shouldLoadSettings,
  });

  useEffect(() => {
    if (params?.tab && !SETTINGS_TABS.has(params.tab as SettingsTab)) {
      setLocation("/admin/settings/integrations");
    }
  }, [params?.tab, setLocation]);

  return (
    <AdminSidebar>
      <div className="p-6 max-w-7xl">
        <h1 className="text-2xl font-heading font-bold mb-1" data-testid="text-settings-title">
          System Settings
        </h1>
        <p className="text-muted-foreground mb-6">
          Manage integrations, head markup, system configuration, and system email templates.
        </p>

        <Tabs value={activeTab} onValueChange={(value) => setLocation(`/admin/settings/${value}`)}>
          <TabsList data-testid="tabs-settings">
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <Plug className="mr-1.5 h-4 w-4 text-blue-600" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="head-tags" data-testid="tab-head-tag-additions">
              <Code2 className="mr-1.5 h-4 w-4 text-violet-600" />
              Head Tag Additions
            </TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system-configuration">
              <Settings className="mr-1.5 h-4 w-4 text-slate-500" />
              System Configuration
            </TabsTrigger>
            <TabsTrigger value="email-templates" data-testid="tab-templates">
              <Mail className="mr-1.5 h-4 w-4 text-rose-600" />
              Email Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <IntegrationsTab settings={settings || {}} />
            )}
          </TabsContent>

          <TabsContent value="email-templates" className="mt-6 max-w-4xl">
            <EmailTemplatesTab />
          </TabsContent>

          <TabsContent value="head-tags" className="mt-6 max-w-4xl">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <HeadTagAdditionsTab settings={settings || {}} />
            )}
          </TabsContent>

          <TabsContent value="system" className="mt-6 max-w-4xl">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <SystemConfigurationTab settings={settings || {}} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}
