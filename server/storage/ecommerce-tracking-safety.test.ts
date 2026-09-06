import { expect, it, vi } from "vitest";
const writes = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn(), transaction: vi.fn() }));
vi.mock("../db", () => ({ db: writes }));
import { EcommerceStorage } from "./ecommerce.storage";
import { inferCarrierTrackingUrl } from "../services/ecommerce-shipping-carrier.service";
it("rejects unsafe values before any direct storage mutation or transaction", async () => {
  const storage = new EcommerceStorage(),
    data = { orderId: "order", trackingUrl: "javascript:alert(1)" };
  await expect(storage.createShipment(data)).rejects.toThrow();
  await expect(storage.createShipmentAndMarkOrderShipped(data)).rejects.toThrow();
  await expect(storage.updateShipment("shipment", data)).rejects.toThrow();
  await expect(storage.createFulfillment(data, [])).rejects.toThrow();
  expect(writes.insert).not.toHaveBeenCalled();
  expect(writes.update).not.toHaveBeenCalled();
  expect(writes.transaction).not.toHaveBeenCalled();
});
it("carrier inference never forwards unsafe explicit URLs and retains generated carrier links", () => {
  expect(
    inferCarrierTrackingUrl({
      carrier: "UPS",
      trackingNumber: "1Z123",
      trackingUrl: "javascript:alert(1)",
    }),
  ).toBeNull();
  expect(inferCarrierTrackingUrl({ carrier: "UPS", trackingNumber: "1Z123" })).toBe(
    "https://www.ups.com/track?tracknum=1Z123",
  );
});
