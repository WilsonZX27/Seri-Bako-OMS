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
  updated_at: string;
  supplier_names: string[];
  line_count: number;
  submitted_by_name: string | null;
  estimated_total: number;
};

export type PendingActionSnapshot = {
  items: PendingAction[];
  total: number | null;
  unavailable: boolean;
};

function ageLabel(updatedAt?: string | null) {
  if (!updatedAt) return "Age unknown";
  const days = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export const getCurrentUserPendingActionSnapshot = cache(async function getCurrentUserPendingActionSnapshot(limit = 5): Promise<PendingActionSnapshot> {
  const scope = await getCurrentUserScope();
  if (!scope) return { items: [], total: null, unavailable: true };

  const [canAdminReview, canPurchasingReview, canManagerApprove, canFinanceReview, canConvertPo, canViewAll, canApproveSchedule, canPostOutletDaily] = await Promise.all([
    hasPermission("pr.admin_review"),
    hasPermission("pr.purchasing_review"),
    hasPermission("pr.manager_approve"),
    hasPermission("pr.finance_review"),
    hasPermission("pr.convert_to_po"),
    hasPermission("pr.view_all"),
    hasPermission("schedule.approve"),
    hasPermission("outlet_daily_record.post"),
  ]);

  const prStatusFilters: Array<{ status: PurchaseRequestStatus; allowed: boolean; step: string; title: string }> = [
    { status: "manager_review", allowed: canManagerApprove, step: "Manager Review", title: "Manager review required" },
    { status: "admin_review", allowed: canAdminReview || canPurchasingReview, step: "Purchasing Review", title: "Purchasing review required" },
    { status: "finance_review", allowed: canFinanceReview, step: "Finance Review", title: "Finance review required" },
    { status: "ready_to_convert", allowed: canConvertPo, step: "Ready to Convert", title: "Convert to PO" },
  ];

  const filters = prStatusFilters.filter((filter) => filter.allowed);
  const supabase = await createClient();
  const canSeeAllBranches = canViewAll || scope.companyWideAccess || scope.roleCode === "super_admin";

  const prResults = await Promise.all(
    filters.map(async (filter) => {
      let query = supabase
        .from("purchase_requests")
        .select("id, request_no, branch_id, requested_by, status, updated_at, branches(branch_name)", { count: "exact" })
        .eq("status", filter.status)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (!canSeeAllBranches) {
        if (!scope.branchIds.length) return { items: [] as PendingAction[], count: 0, unavailable: false };
        query = query.in("branch_id", scope.branchIds);
      }

      const { data, error, count } = await query;
      if (error) {
        logServerWarning(error, { source: "pending-actions.getCurrentUserPendingActions", });
        return { items: [] as PendingAction[], count: 0, unavailable: true };
      }

      if (!data || count === null) {
        return { items: [] as PendingAction[], count: null, unavailable: true };
      }

      const requestIds = data.map((row) => row.id);
      const requesterIds = [...new Set(data.map((row) => row.requested_by).filter((value): value is string => Boolean(value)))];
      const [lineResult, requesterResult] = await Promise.all([
        requestIds.length ? supabase.from("purchase_request_lines").select("purchase_request_id, qty, estimated_unit_cost, suggested_supplier_id").in("purchase_request_id", requestIds) : Promise.resolve({ data: [], error: null }),
        requesterIds.length ? supabase.from("staffs").select("id, full_name").in("id", requesterIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (lineResult.error) logServerWarning(lineResult.error, { source: "pending-actions.lines" });
      if (requesterResult.error) logServerWarning(requesterResult.error, { source: "pending-actions.requesters" });
      const lines = lineResult.data ?? [];
      const supplierIds = [...new Set(lines.map((line) => line.suggested_supplier_id).filter((value): value is string => Boolean(value)))];
      const supplierResult = supplierIds.length ? await supabase.from("suppliers").select("id, name").in("id", supplierIds) : { data: [], error: null };
      if (supplierResult.error) logServerWarning(supplierResult.error, { source: "pending-actions.suppliers" });
      const supplierById = new Map((supplierResult.data ?? []).map((supplier) => [supplier.id, supplier.name]));
      const requesterById = new Map((requesterResult.data ?? []).map((staff) => [staff.id, staff.full_name]));

      const items = data.map((row) => {
        const branch = row.branches as { branch_name?: string | null } | { branch_name?: string | null }[] | null;
        const branchName = Array.isArray(branch) ? branch[0]?.branch_name : branch?.branch_name;
        const requestLines = lines.filter((line) => line.purchase_request_id === row.id);
        return {
          id: `pr-${filter.status}-${row.id}`,
          document_no: row.request_no,
          title: filter.title,
          href: `/purchase-requests/${row.id}`,
          step: filter.step,
          branch_name: branchName ?? null,
          age_label: ageLabel(row.updated_at),
          updated_at: row.updated_at,
          supplier_names: [...new Set(requestLines.map((line) => line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id) : null).filter((value): value is string => Boolean(value)))],
          line_count: requestLines.length,
          submitted_by_name: row.requested_by ? requesterById.get(row.requested_by) ?? null : null,
          estimated_total: requestLines.reduce((sum, line) => sum + Number(line.qty) * Number(line.estimated_unit_cost), 0),
        };
      });
      return { items, count, unavailable: false };
    }),
  );

  const scheduleResult = await (async () => {
    if (!canApproveSchedule) return { items: [] as PendingAction[], count: 0, unavailable: false };
    let query = supabase
      .from("schedule_weeks")
      .select("id,branch_id,week_start,status,updated_at,branches(branch_name)", { count: "exact" })
      .eq("status", "submitted")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (!scope.companyWideAccess && scope.roleCode !== "super_admin") {
      if (!scope.branchIds.length) return { items: [] as PendingAction[], count: 0, unavailable: false };
      query = query.in("branch_id", scope.branchIds);
    }
    const { data, error, count } = await query;
    if (error || !data || count === null) {
      if (error) logServerWarning(error, { source: "pending-actions.schedule" });
      return { items: [] as PendingAction[], count: null, unavailable: true };
    }
    return {
      count,
      unavailable: false,
      items: data.map((row) => {
        const branch = row.branches as { branch_name?: string | null } | { branch_name?: string | null }[] | null;
        const branchName = Array.isArray(branch) ? branch[0]?.branch_name : branch?.branch_name;
        const branchId = String(row.branch_id);
        const weekStart = String(row.week_start);
        const updatedAt = String(row.updated_at);
        return {
          id: `schedule-${row.id}`,
          document_no: `Week of ${weekStart}`,
          title: "Schedule approval required",
          href: `/attendance/schedule?branch=${encodeURIComponent(branchId)}&week=${weekStart}`,
          step: "Manager Approval",
          branch_name: branchName ?? null,
          age_label: ageLabel(updatedAt),
          updated_at: updatedAt,
          supplier_names: [],
          line_count: 0,
          submitted_by_name: null,
          estimated_total: 0,
        } satisfies PendingAction;
      }),
    };
  })();

  const outletDailyResult = await (async () => {
    if (!canPostOutletDaily) return { items: [] as PendingAction[], count: 0, unavailable: false };
    let query = supabase
      .from("outlet_daily_records")
      .select("id,branch_id,record_date,updated_at,branch:branches!outlet_daily_records_branch_id_fkey(branch_name)", { count: "exact" })
      .eq("status", "evening_completed")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (!canSeeAllBranches) {
      if (!scope.branchIds.length) return { items: [] as PendingAction[], count: 0, unavailable: false };
      query = query.in("branch_id", scope.branchIds);
    }
    const { data, error, count } = await query;
    if (error || !data || count === null) {
      if (error) logServerWarning(error, { source: "pending-actions.outlet-daily" });
      return { items: [] as PendingAction[], count: null, unavailable: true };
    }
    return {
      count,
      unavailable: false,
      items: data.map((row) => {
        const branch = row.branch as { branch_name?: string | null } | { branch_name?: string | null }[] | null;
        const branchName = Array.isArray(branch) ? branch[0]?.branch_name : branch?.branch_name;
        const updatedAt = String(row.updated_at);
        return {
          id: `outlet-daily-${row.id}`,
          document_no: String(row.record_date),
          title: "Outlet daily record ready to post",
          href: `/outlet-daily-records/${row.id}`,
          step: "Ready to Post",
          branch_name: branchName ?? null,
          age_label: ageLabel(updatedAt),
          updated_at: updatedAt,
          supplier_names: [],
          line_count: 0,
          submitted_by_name: null,
          estimated_total: 0,
        } satisfies PendingAction;
      }),
    };
  })();

  const results = [...prResults, scheduleResult, outletDailyResult];
  const unavailable = results.some((result) => result.unavailable);
  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);
  return {
    items,
    total: unavailable ? null : results.reduce((sum, result) => sum + (result.count ?? 0), 0),
    unavailable,
  };
});

export const getCurrentUserPendingActions = cache(async function getCurrentUserPendingActions(limit = 5): Promise<PendingAction[]> {
  return (await getCurrentUserPendingActionSnapshot(limit)).items;
});
