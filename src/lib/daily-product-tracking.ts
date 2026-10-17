export const dailyTrackingLabels = { food_daily: "Foods (Expiry: Daily)", food_carryover: "Foods (Expiry: Next day)", beverage: "Beverage", packaging: "Packaging" } as const;
export type DailyTracking = keyof typeof dailyTrackingLabels;
export function dailyTracking(product: { category: string; daily_tracking?: string | null }, snapshot?: unknown): DailyTracking {
  const value = snapshot ?? product.daily_tracking;
  if (typeof value === "string" && value in dailyTrackingLabels) return value as DailyTracking;
  return product.category.trim().toLowerCase() === "packaging" ? "packaging" : "food_daily";
}
