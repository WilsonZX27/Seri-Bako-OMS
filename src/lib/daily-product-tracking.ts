import { sortProductsForDisplay, type DisplayOrderedProduct } from "@/lib/product-order";

export const dailyTrackingLabels = { food_daily: "Foods (Expiry: Daily)", food_carryover: "Foods (Expiry: Next day)", beverage: "Beverage", packaging: "Packaging" } as const;
export type DailyTracking = keyof typeof dailyTrackingLabels;
export const dailyTrackingOrder = Object.keys(dailyTrackingLabels) as DailyTracking[];
export function dailyTracking(product: { category: string; daily_tracking?: string | null }, snapshot?: unknown): DailyTracking {
  const value = snapshot ?? product.daily_tracking;
  if (typeof value === "string" && value in dailyTrackingLabels) return value as DailyTracking;
  return product.category.trim().toLowerCase() === "packaging" ? "packaging" : "food_daily";
}

type DailyProduct = DisplayOrderedProduct & { category: string; daily_tracking?: string | null };

// Entry, download and print all consume these groups. Classification always
// takes precedence over the product-code family and configured display order.
export function groupDailyProducts<T extends DailyProduct>(
  products: T[],
  resolveTracking: (product: T) => DailyTracking = dailyTracking,
) {
  const ordered = sortProductsForDisplay(products);
  return dailyTrackingOrder.map((tracking) => ({
    tracking,
    label: dailyTrackingLabels[tracking],
    products: ordered.filter((product) => resolveTracking(product) === tracking),
  })).filter((group) => group.products.length > 0);
}
