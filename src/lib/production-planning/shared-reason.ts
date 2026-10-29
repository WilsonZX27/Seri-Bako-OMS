import type { Allocation, ProductionLine } from "./types";
import { planReviewChecks } from "./review-checks";

/** An explicit draft edit: fill only missing required reasons, preserving quantities and prior explanations. */
export function applySharedPlanningReason(allocations:Allocation[],production:ProductionLine[],reason:string) {
  const value=reason.trim();
  if(!value) throw new Error("Enter a reason before applying it.");
  const required=planReviewChecks(allocations,production).filter(check=>check.category==="reasons");
  const outletKeys=new Set(required.filter(check=>check.branchId).map(check=>`${check.productId}:${check.branchId}`));
  const productionKeys=new Set(required.filter(check=>!check.branchId).map(check=>check.productId));
  return {
    allocations:allocations.map(line=>outletKeys.has(`${line.product_id}:${line.branch_id}`)&&!line.reason.trim()?{...line,reason:value}:line),
    production:production.map(line=>productionKeys.has(line.product_id)&&!line.reason.trim()?{...line,reason:value}:line),
    count:outletKeys.size+productionKeys.size,
  };
}
