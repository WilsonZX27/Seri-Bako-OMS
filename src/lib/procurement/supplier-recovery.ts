// Enable only after the exact375 installation and independent production postflight.
export const supplierRecoveryInstalled = false;

export function canRecoverPurchaseRequestSupplier(input: {
  role: string; canReview: boolean; status: string; supplierId: string | null;
  catalogLines: number; unresolvedLines: number;
}) {
  return ["super_admin", "purchasing"].includes(input.role) && input.canReview
    && input.status === "admin_review" && !input.supplierId
    && input.catalogLines === 0 && input.unresolvedLines > 0;
}
