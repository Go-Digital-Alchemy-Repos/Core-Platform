export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  image?: string | null;
}

const CART_KEY = "core-platform-ecommerce-cart";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("ecommerce-cart-changed"));
}

export function clearCart(): void {
  writeCart([]);
}

export function addCartItem(item: CartItem): void {
  const cart = readCart();
  const existing = cart.find((line) => line.productId === item.productId);
  if (existing) {
    existing.quantity += item.quantity;
    writeCart([...cart]);
    return;
  }
  writeCart([...cart, item]);
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
