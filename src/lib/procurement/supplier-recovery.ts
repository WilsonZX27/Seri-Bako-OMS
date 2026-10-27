// Exact375 production installation independently verified2026-10-27; no business test calls.
export const supplierRecoveryInstalled = true;

export function canRecoverPurchaseRequestSupplier(input: {
  role: string; canReview: boolean; status: string; supplierId: string | null;
  catalogLines: number; unresolvedLines: number;
}) {
  return ["super_admin", "purchasing"].includes(input.role) && input.canReview
    && input.status === "admin_review" && !input.supplierId
    && input.catalogLines === 0 && input.unresolvedLines > 0;
}
