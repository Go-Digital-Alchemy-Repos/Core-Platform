// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { addCartItem, clearCart, getCartItemCount, readCart } from "./cart-store";

describe("ecommerce cart store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("aggregates matching product and variant lines", () => {
    addCartItem({ productId: "prod-1", variantId: "variant-1", name: "Journal", slug: "journal", unitPrice: 2400, quantity: 1 });
    addCartItem({ productId: "prod-1", variantId: "variant-1", name: "Journal", slug: "journal", unitPrice: 2400, quantity: 2 });

    const cart = readCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
    expect(getCartItemCount(cart)).toBe(3);
  });

  it("notifies the navbar when the cart changes", () => {
    const listener = vi.fn();
    window.addEventListener("ecommerce-cart-changed", listener);

    addCartItem({ productId: "prod-2", name: "Toolkit", slug: "toolkit", unitPrice: 8900, quantity: 1 });
    clearCart();

    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener("ecommerce-cart-changed", listener);
  });

  it("notifies the mini cart when a product is added", () => {
    const listener = vi.fn();
    window.addEventListener("ecommerce-cart-item-added", listener);

    addCartItem({ productId: "prod-3", name: "Cards", slug: "cards", unitPrice: 2900, quantity: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({
      detail: expect.objectContaining({ productId: "prod-3" }),
    });
    window.removeEventListener("ecommerce-cart-item-added", listener);
  });
});
