import { describe, expect, it } from "vitest";
import { requiresAtomicInventoryStockGuard } from "../services/ecommerce-inventory.service";

describe("ecommerce inventory service", () => {
  it("requires an atomic stock guard only for tracked inventory without backorders", () => {
    expect(requiresAtomicInventoryStockGuard({ trackInventory: true, allowBackorder: false })).toBe(
      true,
    );
    expect(requiresAtomicInventoryStockGuard({ trackInventory: true, allowBackorder: true })).toBe(
      false,
    );
    expect(
      requiresAtomicInventoryStockGuard({ trackInventory: false, allowBackorder: false }),
    ).toBe(false);
  });
});
