import { describe, expect, it } from "vitest";
import {
  createClientStackDomainPlan,
  evaluateClientStackReadiness,
} from "./client-stack-onboarding.service";

const input = {
  stackId: "better-farms-foundation",
  publicDomain: "betterfarms.org",
  adminDomain: "admin.betterfarms.org",
  canonicalHost: "www" as const,
  publicRecords: [
    {
      host: "@" as const,
      type: "ALIAS" as const,
      value: "public.host.example",
      ttl: 300,
      proxyMode: "provider-managed" as const,
    },
    {
      host: "www" as const,
      type: "CNAME" as const,
      value: "public.host.example",
      ttl: 300,
      proxyMode: "provider-managed" as const,
    },
  ],
  adminRecord: {
    type: "CNAME" as const,
    value: "core.railway.app",
    ttl: 300,
    proxyMode: "dns-only" as const,
  },
  dnsOperator: "DNS operator",
  launchOwner: "Launch owner",
  routingMode: "same-origin-proxy" as const,
};

describe("client stack onboarding", () => {
  it("creates deterministic credential-free manual DNS instructions", () => {
    const plan = createClientStackDomainPlan(input);
    expect(plan).toMatchObject({
      stackId: "better-farms-foundation",
      publicOrigin: "https://www.betterfarms.org",
      adminOrigin: "https://admin.betterfarms.org",
      routingMode: "same-origin-proxy",
    });
    expect(plan.records.map((record) => record.fqdn)).toEqual([
      "betterfarms.org",
      "www.betterfarms.org",
      "admin.betterfarms.org",
    ]);
    expect(plan.manualInstructions.join(" ")).not.toContain("credential");
    expect(plan.rollbackInstructions).toHaveLength(3);
  });

  it("rejects an unsafe apex CNAME and an admin host outside the public domain", () => {
    expect(() =>
      createClientStackDomainPlan({
        ...input,
        adminDomain: "admin.other.org",
        publicRecords: [{ ...input.publicRecords[0], type: "CNAME" }, input.publicRecords[1]],
      }),
    ).toThrow();
  });

  it("requires literal addresses for A and AAAA records and hostnames for aliases", () => {
    expect(() =>
      createClientStackDomainPlan({
        ...input,
        publicRecords: [{ ...input.publicRecords[0], type: "A" }, input.publicRecords[1]],
      }),
    ).toThrow(/A records require a literal IPv4 address/);
    expect(() =>
      createClientStackDomainPlan({
        ...input,
        publicRecords: [
          { ...input.publicRecords[0], type: "A", value: "203.0.113.10" },
          { ...input.publicRecords[1], type: "CNAME", value: "203.0.113.11" },
        ],
      }),
    ).toThrow(/CNAME records require a public DNS hostname target/);
  });

  it("keeps pending propagation distinct from a failed release gate", () => {
    expect(
      evaluateClientStackReadiness({
        ownership: "pass",
        authoritativeDns: "pending",
        certificate: "pending",
        publicRouting: "pending",
        adminRouting: "pending",
        sameOriginApi: "pending",
        applicationHealth: "pass",
        canonicalRedirect: "pending",
        rollbackPlan: "pass",
      }),
    ).toMatchObject({ status: "pending", failed: [] });
    expect(
      evaluateClientStackReadiness({
        ownership: "pass",
        authoritativeDns: "pass",
        certificate: "pass",
        publicRouting: "pass",
        adminRouting: "pass",
        sameOriginApi: "fail",
        applicationHealth: "pass",
        canonicalRedirect: "pass",
        rollbackPlan: "pass",
      }),
    ).toMatchObject({ status: "blocked", failed: ["Same-origin /api behavior"] });
  });
});
