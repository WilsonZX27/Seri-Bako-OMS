import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { getPermissionMap } from "@/server/auth/permissions";
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
  attentionHrefs: string[];
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

export const getCurrentUserPendingActionSnapshot = cache(async function getCurrentUserPendingActionSnapshot(limit = 5, includeOutletDaily = true, includeDetails = true, includeTotal = true): Promise<PendingActionSnapshot> {
  const scope = await getCurrentUserScope();
  if (!scope) return { items: [], attentionHrefs: [], total: null, unavailable: true };

  const permissions = await getPermissionMap([
    "pr.admin_review", "pr.purchasing_review", "pr.manager_approve", "pr.finance_review",
    "pr.convert_to_po", "pr.view_all", "schedule.approve", "outlet_daily_record.post", "assets.maintenance",
  ]);
  const canAdminReview = permissions["pr.admin_review"];
  const canPurchasingReview = permissions["pr.purchasing_review"];
  const canManagerApprove = permissions["pr.manager_approve"];
  const canFinanceReview = permissions["pr.finance_review"];
  const canConvertPo = permissions["pr.convert_to_po"];
  const canViewAll = permissions["pr.view_all"];
  const canApproveSchedule = permissions["schedule.approve"];
  const canPostOutletDaily = permissions["outlet_daily_record.post"];

  const prStatusFilters: Array<{ status: PurchaseRequestStatus; allowed: boolean; step: string; title: string }> = [
    { status: "manager_review", allowed: canManagerApprove, step: "Manager Review", title: "Manager review required" },
    { status: "admin_review", allowed: canAdminReview || canPurchasingReview, step: "Purchasing Review", title: "Purchasing review required" },
    { status: "finance_review", allowed: canFinanceReview, step: "Finance Review", title: "Finance review required" },
    { status: "ready_to_convert", allowed: canConvertPo, step: "Ready to Convert", title: "Convert to PO" },
  ];

  const filters = prStatusFilters.filter((filter) => filter.allowed);
  const supabase = await createClient();
  const canSeeAllBranches = canViewAll || scope.companyWideAccess || scope.roleCode === "super_admin";

  const prResultsPromise = Promise.all(
    filters.map(async (filter) => {
      let query = supabase
        .from("purchase_requests")
        .select("id, request_no, branch_id, requested_by, status, updated_at, branches(branch_name)", includeTotal ? { count: "exact" } : {})
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

      if (!data || (includeTotal && count === null)) {
        return { items: [] as PendingAction[], count: null, unavailable: true };
      }

      // The topbar displays links and workflow labels, not costs or suppliers.
      const requestIds = includeDetails ? data.map((row) => row.id) : [];
      const requesterIds = includeDetails ? [...new Set(data.map((row) => row.requested_by).filter((value): value is string => Boolean(value)))] : [];
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

  const scheduleResultPromise = (async () => {
    if (!canApproveSchedule) return { items: [] as PendingAction[], count: 0, unavailable: false };
    let query = supabase
      .from("schedule_weeks")
      .select("id,branch_id,week_start,status,updated_at,branches(branch_name)", includeTotal ? { count: "exact" } : {})
      .eq("status", "submitted")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (!scope.companyWideAccess && scope.roleCode !== "super_admin") {
      if (!scope.branchIds.length) return { items: [] as PendingAction[], count: 0, unavailable: false };
      query = query.in("branch_id", scope.branchIds);
    }
    const { data, error, count } = await query;
    if (error || !data || (includeTotal && count === null)) {
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

  const outletDailyResultPromise = (async () => {
    if (!includeOutletDaily || !canPostOutletDaily) return { items: [] as PendingAction[], count: 0, unavailable: false };
    let query = supabase
      .from("outlet_daily_records")
      .select("id,branch_id,record_date,updated_at,branch:branches!outlet_daily_records_branch_id_fkey(branch_name)", includeTotal ? { count: "exact" } : {})
      .eq("status", "evening_completed")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (!canSeeAllBranches) {
      if (!scope.branchIds.length) return { items: [] as PendingAction[], count: 0, unavailable: false };
      query = query.in("branch_id", scope.branchIds);
    }
    const { data, error, count } = await query;
    if (error || !data || (includeTotal && count === null)) {
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

  const maintenanceResultPromise = (async () => {
    if (!permissions["assets.maintenance"]) return { items: [] as PendingAction[], count: 0, unavailable: false };
    const { data, error } = await looseSupabase(supabase).rpc("get_my_maintenance_actions", { p_limit: limit });
    if (error || !data) {
      if (error) logServerWarning(error, { source: "pending-actions.maintenance" });
      return { items: [] as PendingAction[], count: null, unavailable: true };
    }
    const snapshot = data as { total: number; items: { id: string; created_at: string; location: string }[] };
    return { count: snapshot.total, unavailable: false, items: snapshot.items.map(row => ({
      id: `maintenance-${row.id}`, document_no: "Repair request", title: "Maintenance follow-up",
      href: `/asset-management/maintenance/${row.id}`, step: "Repair", branch_name: row.location,
      age_label: ageLabel(row.created_at), updated_at: row.created_at, supplier_names: [], line_count: 0,
      submitted_by_name: null, estimated_total: 0,
    } satisfies PendingAction)) };
  })();

  const [prResults, scheduleResult, outletDailyResult, maintenanceResult] = await Promise.all([prResultsPromise, scheduleResultPromise, outletDailyResultPromise, maintenanceResultPromise]);
  const results = [...prResults, maintenanceResult, scheduleResult, ...(includeOutletDaily ? [outletDailyResult] : [])];
  const unavailable = results.some((result) => result.unavailable);
  const attentionHrefs = [...new Set(results.flatMap((result) => result.items.slice(0, 1).map((item) => item.href)))];
  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);
  return {
    items,
    attentionHrefs,
    total: unavailable || !includeTotal ? null : results.reduce((sum, result) => sum + (result.count ?? 0), 0),
    unavailable,
  };
});

export const getCurrentUserPendingActions = cache(async function getCurrentUserPendingActions(limit = 5): Promise<PendingAction[]> {
  const snapshot = await getCurrentUserPendingActionSnapshot(limit, true, false, false);
  if (snapshot.unavailable) throw new Error("Pending actions are temporarily unavailable.");
  return snapshot.items;
});
