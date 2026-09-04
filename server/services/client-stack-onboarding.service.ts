import { z } from "zod";
import { isIP } from "node:net";

const stackIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "must be a public DNS hostname",
  );
const recordValueSchema = z.string().trim().min(1).max(255);
const dnsRecordFields = {
  type: z.enum(["A", "AAAA", "ALIAS", "ANAME", "CNAME"]),
  value: recordValueSchema,
  ttl: z.number().int().min(60).max(86400),
  proxyMode: z.enum(["dns-only", "provider-managed", "not-applicable"]),
};

type DnsRecord = z.infer<z.ZodObject<typeof dnsRecordFields>>;

function validateDnsRecord(record: DnsRecord, context: z.RefinementCtx) {
  const expectedIpVersion = record.type === "A" ? 4 : record.type === "AAAA" ? 6 : null;
  if (expectedIpVersion && isIP(record.value) !== expectedIpVersion) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: `${record.type} records require a literal IPv${expectedIpVersion} address`,
    });
  }
  if (!expectedIpVersion && !hostnameSchema.safeParse(record.value).success) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: `${record.type} records require a public DNS hostname target`,
    });
  }
}

const dnsRecordSchema = z.object(dnsRecordFields).strict().superRefine(validateDnsRecord);
const publicDnsRecordSchema = z
  .object({ host: z.enum(["@", "www"]), ...dnsRecordFields })
  .strict()
  .superRefine(validateDnsRecord);

export const clientStackDomainPlanSchema = z
  .object({
    stackId: stackIdSchema,
    publicDomain: hostnameSchema,
    adminDomain: hostnameSchema,
    canonicalHost: z.enum(["apex", "www"]),
    publicRecords: z.array(publicDnsRecordSchema).min(2),
    adminRecord: dnsRecordSchema,
    dnsOperator: z.string().trim().min(1).max(160),
    launchOwner: z.string().trim().min(1).max(160),
    routingMode: z.literal("same-origin-proxy"),
  })
  .strict()
  .superRefine((plan, context) => {
    const expectedAdminLabel = plan.adminDomain.slice(0, -(plan.publicDomain.length + 1));
    if (!expectedAdminLabel || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(expectedAdminLabel)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adminDomain"],
        message: "must be a direct subdomain of publicDomain",
      });
    }
    for (const host of ["@", "www"] as const) {
      const matching = plan.publicRecords.filter((record) => record.host === host);
      if (matching.length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["publicRecords"],
          message: `must contain exactly one ${host} record`,
        });
      }
    }
    if (plan.publicRecords.some((record) => record.host === "@" && record.type === "CNAME")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publicRecords"],
        message:
          "apex records must use A, AAAA, ALIAS, or ANAME; use the provider's apex equivalent",
      });
    }
  });

export type ClientStackDomainPlanInput = z.infer<typeof clientStackDomainPlanSchema>;

export type DomainReadinessStatus = "ready" | "pending" | "blocked";

const readinessStateSchema = z.enum(["pass", "pending", "fail"]);

export const clientStackReadinessSchema = z
  .object({
    ownership: readinessStateSchema,
    authoritativeDns: readinessStateSchema,
    certificate: readinessStateSchema,
    publicRouting: readinessStateSchema,
    adminRouting: readinessStateSchema,
    sameOriginApi: readinessStateSchema,
    applicationHealth: readinessStateSchema,
    canonicalRedirect: readinessStateSchema,
    rollbackPlan: readinessStateSchema,
  })
  .strict();

export type ClientStackReadinessInput = z.infer<typeof clientStackReadinessSchema>;

export interface ClientStackReadinessResult {
  status: DomainReadinessStatus;
  passed: string[];
  pending: string[];
  failed: string[];
}

export function createClientStackDomainPlan(input: ClientStackDomainPlanInput) {
  const plan = clientStackDomainPlanSchema.parse(input);
  const adminLabel = plan.adminDomain.slice(0, -(plan.publicDomain.length + 1));
  const records: Array<DnsRecord & { host: string; fqdn: string; purpose: string }> = [
    ...plan.publicRecords.map((record) => ({
      ...record,
      fqdn: record.host === "@" ? plan.publicDomain : `${record.host}.${plan.publicDomain}`,
      purpose: record.host === "@" ? "Public site apex" : "Public site www host",
    })),
    {
      ...plan.adminRecord,
      host: adminLabel,
      fqdn: plan.adminDomain,
      purpose: "Protected Core Platform admin host",
    },
  ];

  return {
    stackId: plan.stackId,
    publicOrigin: `https://${plan.canonicalHost === "apex" ? plan.publicDomain : `www.${plan.publicDomain}`}`,
    adminOrigin: `https://${plan.adminDomain}`,
    routingMode: plan.routingMode,
    records,
    manualInstructions: records.map(
      (record, index) =>
        `${index + 1}. Create or update only the ${record.host} ${record.type} record for ${record.fqdn} to ${record.value} with TTL ${record.ttl}s (${record.proxyMode}). Purpose: ${record.purpose}.`,
    ),
    rollbackInstructions: records.map(
      (record) =>
        `Before changing ${record.fqdn}, record its current ${record.type} value and TTL. Rollback restores that recorded value; do not remove unrelated records.`,
    ),
    requiredVerification: [
      "Domain ownership and authoritative nameservers",
      "Each planned DNS record and propagation",
      "HTTPS certificate for public and admin origins",
      "Public and admin routing",
      "Same-origin /api behavior on the public site",
      "Application /api/health/ready response",
      "Canonical apex/www redirect",
      "Recorded DNS rollback values and named operator",
    ],
    operators: { dnsOperator: plan.dnsOperator, launchOwner: plan.launchOwner },
  };
}

const readinessLabels: Record<keyof ClientStackReadinessInput, string> = {
  ownership: "Domain ownership",
  authoritativeDns: "Authoritative DNS",
  certificate: "HTTPS certificate",
  publicRouting: "Public routing",
  adminRouting: "Admin routing",
  sameOriginApi: "Same-origin /api behavior",
  applicationHealth: "Application readiness",
  canonicalRedirect: "Canonical redirect",
  rollbackPlan: "Rollback plan",
};

export function evaluateClientStackReadiness(
  input: ClientStackReadinessInput,
): ClientStackReadinessResult {
  const checks = clientStackReadinessSchema.parse(input);
  const result: ClientStackReadinessResult = {
    status: "ready",
    passed: [],
    pending: [],
    failed: [],
  };
  for (const [key, state] of Object.entries(checks) as Array<
    [keyof ClientStackReadinessInput, z.infer<typeof readinessStateSchema>]
  >) {
    const label = readinessLabels[key];
    if (state === "pass") result.passed.push(label);
    if (state === "pending") result.pending.push(label);
    if (state === "fail") result.failed.push(label);
  }
  if (result.failed.length) result.status = "blocked";
  else if (result.pending.length) result.status = "pending";
  return result;
}
