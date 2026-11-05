/** Current catalogue units are a comparison target, never proof of a historical unit. */
export function verifiedPlanningUnit(row: { quantity_unit_verified?: unknown; quantity_unit_snapshot?: unknown } | null | undefined, currentUnit: string): boolean {
  const unit = currentUnit.trim().toUpperCase();
  return !!unit && row?.quantity_unit_verified === true && typeof row.quantity_unit_snapshot === "string" && row.quantity_unit_snapshot.trim().toUpperCase() === unit;
}
export const PLANNING_UNIT_REVIEW = "Automatic quantity unavailable: historical quantities or saved planning rules have no verified matching unit. Enter a manager quantity; existing plans and settings are unchanged.";
