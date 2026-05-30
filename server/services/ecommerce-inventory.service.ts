export function requiresAtomicInventoryStockGuard(input: {
  trackInventory: boolean;
  allowBackorder: boolean;
}): boolean {
  return input.trackInventory && !input.allowBackorder;
}
