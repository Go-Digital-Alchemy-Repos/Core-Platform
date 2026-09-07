import { describe, it, expect, vi } from "vitest";
vi.mock("../db", () => ({ db: {} }));
import {
  readAuthorizedEasyPostTestCredentials,
  readEasyPostQuoteAuthorizationReadiness,
  type ShippingCredentialTx,
} from "./ecommerce-shipping-credential-authorization.service";
describe("shipping authorization read failure boundary", () => {
  it.each([readAuthorizedEasyPostTestCredentials, readEasyPostQuoteAuthorizationReadiness])(
    "sanitizes unavailable queries without claiming invalid configuration",
    async (read) => {
      const tx = {
        execute: vi.fn().mockRejectedValue(new Error("secret connection details")),
      } as unknown as ShippingCredentialTx;
      const error = await read(tx).catch((error) => error);
      expect(error.code).toBe("authorization_unavailable");
      expect(error.message).not.toContain("secret");
    },
  );
});
