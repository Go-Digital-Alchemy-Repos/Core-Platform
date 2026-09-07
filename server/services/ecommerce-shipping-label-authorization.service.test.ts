import { describe, it, expect, vi } from "vitest";
vi.mock("../db", () => ({ db: {} }));
import {
  configureEasyPostLabelAuthorizationSchema as schema,
  readAuthorizedEasyPostLabelPurchaseCredentials,
  readEasyPostLabelReadiness,
} from "./ecommerce-shipping-label-authorization.service";
import type { ShippingCredentialTx } from "./ecommerce-shipping-credential-authorization.service";
const input = {
  version: 1,
  expectedGenerationId: "fa253ff6-2838-4b2b-9e94-a91099413524",
  expectedRevision: 0,
  purchaseEnabled: false,
  labelApproval: "unchanged",
  evidenceReference: "private-approval-1",
};
describe("label authorization boundary", () => {
  it("accepts a bounded strict operator request", () => expect(schema.parse(input)).toEqual(input));
  it.each([
    { expectedRevision: 2147483647 },
    { expectedRevision: -1 },
    { purchaseEnabled: "true" },
    { apiKey: "forbidden" },
    { evidenceReference: "approval\u0085" },
    { evidenceReference: "a\n" },
    { evidenceReference: " " },
    { evidenceReference: "x".repeat(257) },
  ])("rejects unsafe request %j", (patch) =>
    expect(schema.safeParse({ ...input, ...patch }).success).toBe(false),
  );
  it("does not expose purchase credentials before implementation", async () => {
    await expect(
      readAuthorizedEasyPostLabelPurchaseCredentials({} as ShippingCredentialTx),
    ).rejects.toMatchObject({ code: "not_implemented" });
  });
  it("sanitizes readiness infrastructure errors", async () => {
    const error = await readEasyPostLabelReadiness({
      execute: vi.fn().mockRejectedValue(new Error("private connection value")),
    } as unknown as ShippingCredentialTx).catch((error) => error);
    expect(error.code).toBe("authorization_unavailable");
    expect(error.message).not.toContain("private");
  });
});
