/** Thresholds compare only the selected base UOM; never mix units or convert. */
export function matchesStockThreshold(quantity: number, baseUnit: string, threshold?: string, unit?: string) {
  if (!threshold?.trim()) return true;
  const limit = Number(threshold);
  if (!Number.isFinite(limit) || limit < 0 || !unit?.trim()) return true;
  return baseUnit.trim().toLowerCase() === unit.trim().toLowerCase() && quantity < limit;
}
