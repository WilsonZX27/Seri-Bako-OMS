import { normalizeUom } from "@/lib/uom";

/** Only immutable, verified line snapshots can establish a historical unit.
 * Current product.selling_unit is deliberately not a fallback. The existing
 * database has no such snapshot, so its rows correctly remain unavailable.
 */
export function dailyQuantityBasis(lines: readonly { quantity_unit_snapshot?: string | null; quantity_unit_verified?: boolean; daily_tracking?: string | null }[]) {
  const units = new Set<string>();
  for (const line of lines) {
    const unit = normalizeUom(line.quantity_unit_snapshot);
    if (!["food_daily", "food_carryover"].includes(line.daily_tracking ?? "")) return { available: false, unit: null };
    if (line.quantity_unit_verified !== true || !unit) return { available: false, unit: null };
    units.add(unit);
  }
  return units.size === 1 ? { available: true, unit: [...units][0] } : { available: false, unit: null };
}

export const DAILY_UNIT_UNAVAILABLE = "Historical units are unverified. Combined quantities and wastage rates are unavailable; review individual product lines.";
