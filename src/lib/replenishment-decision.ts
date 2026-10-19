export type ReplenishmentDecision = "buy_now" | "fix_supplier" | "monitor";

export type ReplenishmentDecisionInput = {
  currentStock: number;
  safetyStock: number;
  suggestedReorderQty: number;
  stockStatus: "out_of_stock" | "low_stock" | "sufficient";
  supplierId?: string | null;
  supplierName?: string | null;
  baseUnit?: string | null;
};

export type ReplenishmentDecisionResult = {
  decision: ReplenishmentDecision;
  label: string;
  reason: string;
  blocked: boolean;
};

/**
 * Converts a low-stock signal into one accountable next action.
 * The inputs are intentionally the same values shown in the low-stock table,
 * so an operator can audit the recommendation without trusting a hidden score.
 */
export function getReplenishmentDecision(input: ReplenishmentDecisionInput): ReplenishmentDecisionResult {
  const unit = input.baseUnit ?? "unit";
  const suggested = Math.max(0, input.suggestedReorderQty);
  const shortage = Math.max(0, input.safetyStock - input.currentStock);

  if (!input.supplierId) {
    return {
      decision: "fix_supplier",
      label: "Fix supplier first",
      reason: "No supplier is mapped, so a purchase request cannot be routed safely.",
      blocked: true,
    };
  }

  if (input.stockStatus === "out_of_stock" || input.currentStock <= input.safetyStock) {
    const quantity = suggested || shortage;
    return {
      decision: "buy_now",
      label: "Buy now",
      reason: `Below safety by ${shortage} ${unit}; suggested ${quantity} ${unit} from ${input.supplierName ?? "the mapped supplier"}.`,
      blocked: false,
    };
  }

  return {
    decision: "monitor",
    label: "Monitor",
    reason: `Supplier mapped; keep watching the ${unit} balance before opening a request.`,
    blocked: false,
  };
}
