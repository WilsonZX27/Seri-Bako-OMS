import type { Allocation, ProductionLine } from "./types";

export type PlanReviewCheck = { category: "configuration" | "quantities" | "reasons" | "balance"; productId: string; branchId?: string; message: string };
const validQuantity = (value: number | null): value is number => value !== null && Number.isFinite(value) && value >= 0 && value <= 1_000_000;

/** Operator guidance mirrors quantity/reason gates; database checks remain authoritative. */
export function planReviewChecks(allocations: Allocation[], production: ProductionLine[]): PlanReviewCheck[] {
  const checks: PlanReviewCheck[] = [];
  for (const line of allocations) {
    const location = {productId: line.product_id, branchId: line.branch_id};
    if (!validQuantity(line.approved_qty) || !Number.isInteger(line.approved_qty)) checks.push({...location, category: "quantities", message: "Enter a whole quantity; zero is valid."});
    if (!validQuantity(line.minimum_qty)) checks.push({...location, category: "configuration", message: "Confirm the outlet minimum in Settings, then recalculate."});
    if (!validQuantity(line.approved_qty)) continue;
    if (line.approved_qty < line.event_qty) checks.push({...location, category: "quantities", message: "Include the full confirmed event quantity."});

  }
  for (const line of production) {
    const location = {productId: line.product_id};
    const yieldReady = validQuantity(line.yield_per_tray) && line.yield_per_tray > 0;
    const traysReady = validQuantity(line.trays) && Number.isInteger(line.trays);
    const retentionReady = validQuantity(line.retained_qty) && Number.isInteger(line.retained_qty);
    if (!yieldReady) checks.push({...location, category: "configuration", message: "Set the tray yield in Settings, then recalculate."});
    if (!traysReady) checks.push({...location, category: "quantities", message: line.tray_mode==="automatic"?"Complete outlet quantities and tray yield to calculate production.":"Enter a whole number of trays; zero is valid."});
    if (!retentionReady) checks.push({...location, category: "quantities", message: "Enter a valid quantity to keep in the kitchen."});
    const destinations = allocations.filter(item => item.product_id === line.product_id);
    if (!yieldReady || !traysReady || !retentionReady || destinations.some(item => !validQuantity(item.approved_qty))) continue;
    const allocated = destinations.reduce((sum, item) => sum + item.approved_qty!, 0) + line.event_qty;
    const remainder = line.trays! * line.yield_per_tray! - allocated - line.retained_qty;
    if (Math.abs(remainder) > 1e-8) checks.push({...location, category: "balance", message: remainder > 0 ? `${remainder} remaining output is unallocated. Adjust trays, demand or schedule; do not force extra stock into high-wastage outlets.` : "Allocation exceeds production; adjust trays or quantities."});
  }
  return checks;
}

export const REVIEW_CHECK_GROUPS = [
  { category: "configuration", label: "Complete Settings" },
  { category: "quantities", label: "Enter quantities" },
  { category: "reasons", label: "Add Manager reasons" },
  { category: "balance", label: "Balance production" },
] as const;
