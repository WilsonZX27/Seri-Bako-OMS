import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentUserScope } from "@/server/queries/notifications";
import type { PurchaseRequestStatus } from "@/lib/status-contracts";
import { logServerWarning } from "@/server/observability/logger";
import { cache } from "react";

export type PendingAction = {
  id: string;
  document_no: string;
  title: string;
  href: string;
  step: string;
  branch_name: string | null;
  age_label: string;
};

function ageLabel(updatedAt?: string | null) {
  if (!updatedAt) return "Age unknown";
  const days = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export const getCurrentUserPendingActions = cache(async function getCurrentUserPendingActions(limit = 5): Promise<PendingAction[]> {
  const scope = await getCurrentUserScope();
  if (!scope) return [];

  const [canAdminReview, canPurchasingReview, canManagerApprove, canFinanceReview, canConvertPo, canViewAll] = await Promise.all([
    hasPermission("pr.admin_review"),
    hasPermission("pr.purchasing_review"),
    hasPermission("pr.manager_approve"),
    hasPermission("pr.finance_review"),
    hasPermission("pr.convert_to_po"),
    hasPermission("pr.view_all"),
  ]);

  const prStatusFilters: Array<{ status: PurchaseRequestStatus; allowed: boolean; step: string; title: string }> = [
    { status: "manager_review", allowed: canManagerApprove, step: "Manager Review", title: "Manager review required" },
    { status: "admin_review", allowed: canAdminReview || canPurchasingReview, step: "Purchasing Review", title: "Purchasing review required" },
    { status: "finance_review", allowed: canFinanceReview, step: "Finance Review", title: "Finance review required" },
    { status: "ready_to_convert", allowed: canConvertPo, step: "Ready to Convert", title: "Convert to PO" },
  ];

  const filters = prStatusFilters.filter((filter) => filter.allowed);
  if (!filters.length) return [];

  const supabase = await createClient();
  const canSeeAllBranches = canViewAll || scope.companyWideAccess || scope.roleCode === "super_admin";

  const results = await Promise.all(
    filters.map(async (filter) => {
      let query = supabase
        .from("purchase_requests")
        .select("id, request_no, branch_id, status, updated_at, branches(branch_name)")
        .eq("status", filter.status)
        .is("deleted_at", null)
        .order("updated_at", { ascending: true })
        .limit(limit);

      if (!canSeeAllBranches) {
        if (!scope.branchIds.length) return [] as PendingAction[];
        query = query.in("branch_id", scope.branchIds);
      }

      const { data, error } = await query;
      if (error) {
        logServerWarning(error, { source: "pending-actions.getCurrentUserPendingActions", });
        return [] as PendingAction[];
      }

      return (data ?? []).map((row) => {
        const branch = row.branches as { branch_name?: string | null } | { branch_name?: string | null }[] | null;
        const branchName = Array.isArray(branch) ? branch[0]?.branch_name : branch?.branch_name;
        return {
          id: `pr-${filter.status}-${row.id}`,
          document_no: row.request_no,
          title: filter.title,
          href: `/purchase-requests/${row.id}`,
          step: filter.step,
          branch_name: branchName ?? null,
          age_label: ageLabel(row.updated_at),
        };
      });
    }),
  );

  return results
    .flat()
    .sort((a, b) => {
      const aDays = Number.parseInt(a.age_label, 10) || 0;
      const bDays = Number.parseInt(b.age_label, 10) || 0;
      return bDays - aDays;
    })
    .slice(0, limit);
});
