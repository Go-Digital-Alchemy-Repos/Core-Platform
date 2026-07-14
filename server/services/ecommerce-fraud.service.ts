import { z } from "zod";
import { storage } from "../storage/index";
import type {
  EcommerceFraudBlock,
  EcommerceFraudEvent,
  EcommerceOrder,
  InsertEcommerceFraudBlock,
} from "@shared/schema";
import type { PricedCartLine } from "./ecommerce-pricing.service";

const SETTINGS_CATEGORY = "ecommerce_fraud";
const SETTINGS_KEY = "ecommerce_fraud_settings";
const MAXMIND_LICENSE_KEY = "maxmind_license_key";

const fraudDecisionSchema = z.enum(["allow", "allow_with_alert", "manual_review", "block"]);
const fraudBlockTypeSchema = z.enum(["ip", "email", "address"]);

export const ecommerceFraudSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  riskReviewThreshold: z.number().int().min(0).max(100).default(45),
  riskBlockThreshold: z.number().int().min(1).max(100).default(80),
  defaultHighRiskAction: fraudDecisionSchema.default("manual_review"),
  billingShippingMismatchAction: fraudDecisionSchema.default("manual_review"),
  countryMismatchAction: fraudDecisionSchema.default("allow_with_alert"),
  allowManualReviewOrders: z.boolean().default(true),
  customerDeclineMessage: z.string().trim().max(240).default("We could not complete this checkout. Please contact support for help with this order."),
  adminAlertsEnabled: z.boolean().default(true),
  logRetentionDays: z.number().int().min(7).max(365).default(90),
  velocityWindowMinutes: z.number().int().min(1).max(1440).default(10),
  maxAttemptsPerIp: z.number().int().min(1).max(500).default(8),
  maxAttemptsPerEmail: z.number().int().min(1).max(500).default(5),
  blockDurationMinutes: z.number().int().min(1).max(10080).default(30),
  duplicateOrderWindowMinutes: z.number().int().min(1).max(1440).default(15),
  firstOrderHighValueAmount: z.number().int().min(0).max(100000000).default(50000),
  maxOrderAmount: z.number().int().min(0).max(100000000).default(0),
  maxQuantity: z.number().int().min(0).max(10000).default(0),
  highRiskCountries: z.array(z.string().trim().length(2).transform((value) => value.toUpperCase())).default([]),
  suspiciousEmailDomains: z.array(z.string().trim().toLowerCase()).default(["mailinator.com", "guerrillamail.com", "10minutemail.com"]),
  disposableEmailDomains: z.array(z.string().trim().toLowerCase()).default([]),
  blockedEmails: z.array(z.string().trim().toLowerCase()).default([]),
  blockedIpRanges: z.array(z.string().trim()).default([]),
  allowedIpRanges: z.array(z.string().trim()).default([]),
  blockedAddresses: z.array(z.string().trim().toLowerCase()).default([]),
  captchaProvider: z.enum(["none", "recaptcha", "turnstile"]).default("none"),
  captchaEnabled: z.boolean().default(false),
  maxMindEnabled: z.boolean().default(false),
  maxMindAccountId: z.string().trim().max(120).default(""),
  maxMindLicenseKey: z.string().trim().max(500).optional(),
});

export type EcommerceFraudDecision = z.infer<typeof fraudDecisionSchema>;
export type EcommerceFraudSettings = Omit<z.infer<typeof ecommerceFraudSettingsSchema>, "maxMindLicenseKey"> & {
  hasMaxMindLicenseKey: boolean;
};

export interface FraudSignal {
  code: string;
  label: string;
  score: number;
  action?: EcommerceFraudDecision;
}

export interface EcommerceFraudEvaluation {
  decision: EcommerceFraudDecision;
  riskLevel: "low" | "medium" | "high";
  score: number;
  matchedRules: FraudSignal[];
  message: string;
  settings: EcommerceFraudSettings;
}

interface CheckoutAddress {
  address?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}

interface FraudEvaluationInput {
  email: string;
  amount: number;
  quantity: number;
  ip?: string | null;
  userAgent?: string | null;
  customerId?: string | null;
  customerCreatedAt?: Date | string | null;
  shippingAddress: CheckoutAddress;
  billingAddress?: CheckoutAddress | null;
  billingSameAsShipping?: boolean;
  lines?: PricedCartLine[];
}

function parseStoredSettings(raw: string | undefined): z.infer<typeof ecommerceFraudSettingsSchema> {
  if (!raw) return ecommerceFraudSettingsSchema.parse({});
  try {
    return ecommerceFraudSettingsSchema.parse(JSON.parse(raw));
  } catch {
    return ecommerceFraudSettingsSchema.parse({});
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function emailDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function normalizeAddress(address?: CheckoutAddress | null) {
  if (!address) return "";
  return [
    address.address,
    address.line2,
    address.city,
    address.state,
    address.zip,
    address.country,
  ].map((part) => String(part ?? "").trim().toLowerCase()).filter(Boolean).join("|");
}

function addressesDiffer(a?: CheckoutAddress | null, b?: CheckoutAddress | null) {
  return Boolean(a && b && normalizeAddress(a) && normalizeAddress(b) && normalizeAddress(a) !== normalizeAddress(b));
}

function listHas(list: string[], value: string) {
  const normalized = value.trim().toLowerCase();
  return list.map((item) => item.trim().toLowerCase()).includes(normalized);
}

function ipMatches(ip: string | null | undefined, patterns: string[]) {
  if (!ip) return false;
  return patterns.some((pattern) => {
    const trimmed = pattern.trim();
    if (!trimmed) return false;
    if (trimmed.includes("/")) {
      const [prefix] = trimmed.split("/");
      return ip.startsWith(prefix.replace(/\.\d+$/, "."));
    }
    return ip === trimmed || ip.startsWith(trimmed);
  });
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function chooseDecision(params: {
  signals: FraudSignal[];
  score: number;
  settings: EcommerceFraudSettings;
}): EcommerceFraudDecision {
  if (params.signals.some((signal) => signal.action === "block")) return "block";
  if (params.score >= params.settings.riskBlockThreshold) return params.settings.defaultHighRiskAction;
  if (params.signals.some((signal) => signal.action === "manual_review")) return "manual_review";
  if (params.score >= params.settings.riskReviewThreshold) return "manual_review";
  if (params.signals.some((signal) => signal.action === "allow_with_alert")) return "allow_with_alert";
  return "allow";
}

function riskLevel(score: number, settings: EcommerceFraudSettings): "low" | "medium" | "high" {
  if (score >= settings.riskBlockThreshold) return "high";
  if (score >= settings.riskReviewThreshold) return "medium";
  return "low";
}

export async function getEcommerceFraudSettings(): Promise<EcommerceFraudSettings> {
  const settings = await storage.settings.getDecryptedCategory(SETTINGS_CATEGORY);
  const parsed = parseStoredSettings(settings[SETTINGS_KEY]);
  const { maxMindLicenseKey: _license, ...safeSettings } = parsed;
  return {
    ...safeSettings,
    hasMaxMindLicenseKey: Boolean(settings[MAXMIND_LICENSE_KEY]),
  };
}

export async function saveEcommerceFraudSettings(input: unknown): Promise<EcommerceFraudSettings> {
  const parsed = ecommerceFraudSettingsSchema.parse(input);
  const { maxMindLicenseKey, ...safeSettings } = parsed;
  const writes = [
    storage.settings.upsertSetting(SETTINGS_KEY, JSON.stringify(safeSettings), SETTINGS_CATEGORY, false),
  ];
  if (maxMindLicenseKey) {
    writes.push(storage.settings.upsertSetting(MAXMIND_LICENSE_KEY, maxMindLicenseKey, SETTINGS_CATEGORY, true));
  }
  await Promise.all(writes);
  storage.settings.invalidateCategory(SETTINGS_CATEGORY);
  return getEcommerceFraudSettings();
}

export async function evaluateEcommerceFraud(input: FraudEvaluationInput): Promise<EcommerceFraudEvaluation> {
  const settings = await getEcommerceFraudSettings();
  if (!settings.enabled) {
    return {
      decision: "allow",
      riskLevel: "low",
      score: 0,
      matchedRules: [],
      message: "Fraud screening is disabled.",
      settings,
    };
  }

  const email = normalizeEmail(input.email);
  const domain = emailDomain(email);
  const ipAllowed = ipMatches(input.ip, settings.allowedIpRanges);
  const signals: FraudSignal[] = [];

  const activeBlocks = typeof storage.ecommerce.getActiveFraudBlocks === "function"
    ? await storage.ecommerce.getActiveFraudBlocks()
    : [];
  const shippingAddressText = normalizeAddress(input.shippingAddress);
  for (const block of activeBlocks) {
    if (block.type === "email" && block.value === email) {
      signals.push({ code: "blocked_email", label: "Email is blocked", score: 100, action: "block" });
    }
    if (block.type === "address" && shippingAddressText.includes(block.value)) {
      signals.push({ code: "blocked_address", label: "Shipping address matched blocklist", score: 100, action: "block" });
    }
    if (!ipAllowed && block.type === "ip" && ipMatches(input.ip, [block.value])) {
      signals.push({ code: "blocked_ip", label: "IP address is blocked", score: 100, action: "block" });
    }
  }

  if (listHas(settings.blockedEmails, email)) {
    signals.push({ code: "settings_blocked_email", label: "Email is in the settings blocklist", score: 100, action: "block" });
  }
  if (!ipAllowed && ipMatches(input.ip, settings.blockedIpRanges)) {
    signals.push({ code: "settings_blocked_ip", label: "IP address is in the settings blocklist", score: 100, action: "block" });
  }
  if (settings.blockedAddresses.some((blocked) => shippingAddressText.includes(blocked.toLowerCase()))) {
    signals.push({ code: "settings_blocked_address", label: "Shipping address is in the settings blocklist", score: 100, action: "block" });
  }

  if (!ipAllowed) {
    const since = new Date(Date.now() - settings.velocityWindowMinutes * 60_000);
    const attempts = typeof storage.ecommerce.countFraudEventsByIdentity === "function"
      ? await storage.ecommerce.countFraudEventsByIdentity({ ip: input.ip, email, since })
      : { ipAttempts: 0, emailAttempts: 0 };
    if (attempts.ipAttempts >= settings.maxAttemptsPerIp) {
      signals.push({ code: "velocity_ip", label: "Too many recent checkout attempts from this IP", score: 100, action: "block" });
    }
    if (attempts.emailAttempts >= settings.maxAttemptsPerEmail) {
      signals.push({ code: "velocity_email", label: "Too many recent checkout attempts for this email", score: 100, action: "block" });
    }
  } else if (input.ip) {
    signals.push({ code: "allowed_ip", label: "IP allowlist bypassed IP block and velocity rules", score: 0, action: "allow_with_alert" });
  }

  if (!input.billingSameAsShipping && addressesDiffer(input.shippingAddress, input.billingAddress)) {
    signals.push({
      code: "billing_shipping_mismatch",
      label: "Billing and shipping addresses differ",
      score: 30,
      action: settings.billingShippingMismatchAction,
    });
  }

  const shippingCountry = input.shippingAddress.country?.toUpperCase();
  const billingCountry = input.billingAddress?.country?.toUpperCase();
  if (shippingCountry && billingCountry && shippingCountry !== billingCountry) {
    signals.push({ code: "country_mismatch", label: "Billing and shipping countries differ", score: 25, action: settings.countryMismatchAction });
  }
  if (shippingCountry && settings.highRiskCountries.includes(shippingCountry)) {
    signals.push({ code: "high_risk_country", label: "Shipping country is on the high-risk list", score: 40, action: settings.defaultHighRiskAction });
  }
  if (settings.suspiciousEmailDomains.includes(domain) || settings.disposableEmailDomains.includes(domain)) {
    signals.push({ code: "suspicious_email_domain", label: "Email domain is commonly used for suspicious checkout attempts", score: 35, action: "manual_review" });
  }
  if (settings.maxOrderAmount > 0 && input.amount > settings.maxOrderAmount) {
    signals.push({ code: "max_order_amount", label: "Order amount exceeds the configured maximum", score: 100, action: "block" });
  }
  if (settings.maxQuantity > 0 && input.quantity > settings.maxQuantity) {
    signals.push({ code: "max_quantity", label: "Order quantity exceeds the configured maximum", score: 50, action: "manual_review" });
  }
  if (!input.customerId && settings.firstOrderHighValueAmount > 0 && input.amount >= settings.firstOrderHighValueAmount) {
    signals.push({ code: "first_order_high_value", label: "High-value first order", score: 35, action: "manual_review" });
  }

  const duplicate = typeof storage.ecommerce.findRecentDuplicateFraudEvent === "function"
    ? await storage.ecommerce.findRecentDuplicateFraudEvent({
        email,
        amount: input.amount,
        shippingAddress: shippingAddressText,
        since: new Date(Date.now() - settings.duplicateOrderWindowMinutes * 60_000),
      })
    : undefined;
  if (duplicate) {
    signals.push({ code: "duplicate_order_window", label: "Similar checkout attempt found recently", score: 30, action: "allow_with_alert" });
  }

  const score = clampScore(signals.reduce((sum, signal) => sum + signal.score, 0));
  const decision = chooseDecision({ signals, score, settings });
  return {
    decision,
    riskLevel: riskLevel(score, settings),
    score,
    matchedRules: signals,
    message: decision === "block" ? settings.customerDeclineMessage : "Fraud screening completed.",
    settings,
  };
}

export async function recordEcommerceFraudEvent(input: {
  eventType: string;
  orderId?: string | null;
  customerId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  amount?: number | null;
  score: number;
  riskLevel: "low" | "medium" | "high";
  decision: EcommerceFraudDecision;
  matchedRules: FraudSignal[];
  message?: string | null;
  requestSnapshot?: Record<string, unknown>;
}): Promise<EcommerceFraudEvent> {
  if (typeof storage.ecommerce.createFraudEvent !== "function") {
    return {
      id: `fraud_${Date.now()}`,
      eventType: input.eventType,
      orderId: input.orderId ?? null,
      customerId: input.customerId ?? null,
      email: input.email ? normalizeEmail(input.email) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      amount: input.amount ?? null,
      currency: "usd",
      score: input.score,
      riskLevel: input.riskLevel,
      decision: input.decision,
      matchedRules: input.matchedRules.map((signal) => ({ ...signal })),
      message: input.message ?? null,
      requestSnapshot: input.requestSnapshot ?? {},
      createdAt: new Date(),
    } as EcommerceFraudEvent;
  }
  return storage.ecommerce.createFraudEvent({
    eventType: input.eventType,
    orderId: input.orderId ?? null,
    customerId: input.customerId ?? null,
    email: input.email ? normalizeEmail(input.email) : null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    amount: input.amount ?? null,
    currency: "usd",
    score: input.score,
    riskLevel: input.riskLevel,
    decision: input.decision,
    matchedRules: input.matchedRules.map((signal) => ({ ...signal })),
    message: input.message ?? null,
    requestSnapshot: input.requestSnapshot ?? {},
  });
}

export async function getEcommerceSecurityOverview() {
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const [settings, summary, events, blocks] = await Promise.all([
    getEcommerceFraudSettings(),
    typeof storage.ecommerce.getFraudEventSummary === "function"
      ? storage.ecommerce.getFraudEventSummary(since)
      : Promise.resolve({ total: 0, blocked: 0, manualReview: 0, velocityBlocks: 0 }),
    typeof storage.ecommerce.getFraudEvents === "function"
      ? storage.ecommerce.getFraudEvents({ limit: 25 })
      : Promise.resolve([]),
    typeof storage.ecommerce.getActiveFraudBlocks === "function"
      ? storage.ecommerce.getActiveFraudBlocks()
      : Promise.resolve([]),
  ]);
  return { settings, summary, recentEvents: events, activeBlocks: blocks };
}

export async function createEcommerceFraudBlock(input: unknown, actorId?: string | null): Promise<EcommerceFraudBlock> {
  const data = z.object({
    type: fraudBlockTypeSchema,
    value: z.string().trim().min(1).max(500),
    reason: z.string().trim().max(500).optional(),
    expiresAt: z.string().datetime().optional().nullable(),
  }).parse(input);
  const block: InsertEcommerceFraudBlock = {
    type: data.type,
    value: data.value,
    reason: data.reason || "Manual fraud block",
    createdBy: actorId ?? null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    active: true,
  };
  return storage.ecommerce.createFraudBlock(block);
}

export async function deleteEcommerceFraudBlock(id: string): Promise<EcommerceFraudBlock | undefined> {
  return storage.ecommerce.deactivateFraudBlock(id);
}

export async function reviewEcommerceOrderFraud(
  orderId: string,
  input: unknown,
  actorId?: string | null,
): Promise<EcommerceOrder | undefined> {
  const data = z.object({
    reviewStatus: z.enum(["approved", "rejected"]),
    note: z.string().trim().max(2000).optional(),
  }).parse(input);
  const decision = data.reviewStatus === "approved" ? "allow" : "block";
  const order = await storage.ecommerce.updateOrder(orderId, {
    fraudReviewStatus: data.reviewStatus,
    fraudDecision: decision,
  });
  if (!order) return undefined;
  if (data.note) {
    await storage.ecommerce.createOrderNote({ orderId, authorId: actorId ?? null, body: data.note });
  }
  await recordEcommerceFraudEvent({
    eventType: "admin_review",
    orderId,
    customerId: order.customerId,
    email: null,
    amount: order.totalAmount,
    score: order.fraudScore,
    riskLevel: order.fraudRiskLevel as "low" | "medium" | "high",
    decision,
    matchedRules: [],
    message: `Fraud review ${data.reviewStatus}`,
    requestSnapshot: { reviewedBy: actorId ?? null, note: data.note ?? null },
  });
  return order;
}
