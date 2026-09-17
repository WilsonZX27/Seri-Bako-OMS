import { createClient } from "@/lib/supabase/server";
import { todayInKualaLumpur } from "@/lib/business-date";
import { looseSupabase, type LooseSupabase } from "@/lib/supabase/loose";
import { getCurrentUserScope, getVisibleNotificationsForCurrentUser } from "@/server/queries/notifications";
import { getCurrentUserPendingActionSnapshot } from "@/server/queries/pending-actions";
import { getPayablesAttention } from "@/server/queries/ap-aging";
import { getRoleDisplayLabel } from "@/lib/roles";
import { getOutletComplianceIssueCount } from "@/server/queries/compliance";
import { getOutletDailyCompletionMatrix, getOutletDailyDemandTrend } from "@/server/queries/outlet-daily-records";
import { getLowStockCount } from "@/server/queries/inventory";
import { logServerWarning } from "@/server/observability/logger";
import {
  getMockLowStockItems,
  getMockStockBalances,
  isMockMode,
  mockBranches,
  mockItems,
  mockDocuments,
  mockPurchaseOrders,
  mockPurchaseRequests,
  mockStockTransactions,
  mockSuppliers,
} from "@/lib/mock-mode";

function warnOptionalQuery(name: string, error: { message?: string } | null | undefined) {
  if (error) logServerWarning(error, { source: `dashboard.optional.${name}` });
}

function warnOptionalQueryResult<T extends { error?: { message?: string } | null }>(name: string, result: T) {
  warnOptionalQuery(name, result.error);
}

/**
 * The dashboard RPC is the preferred read path, but a newly deployed branch
 * can briefly be ahead of the database migration that defines it. Keep the
 * workdesk useful by replaying the same read-only aggregates through the
 * existing RLS-scoped tables until the RPC is available again.
 */
async function getDashboardCoreSnapshotFallback(db: LooseSupabase, today: string) {
  const [
    items,
    suppliers,
    balances,
    lowStockBalances,
    negativeBalances,
    urgentRequests,
    purchaseRequests,
    purchaseOrders,
    recentDocuments,
    todayReceiving,
    stockCountDue,
    wastageAttention,
    receivingFollowup,
    productionTodayPosted,
    productionPendingApproval,
    productionReadyToPost,
    productionIngredientShortages,
    outletMissingEvening,
    outletNeedsReview,
    lastStockCount,
  ] = await Promise.all([
    db.from("items").select("id", { count: "exact", head: true }),
    db.from("suppliers").select("id", { count: "exact", head: true }),
    db.from("stock_balances_summary").select("inventory_value, is_low_stock", { count: "exact" }),
    db.from("stock_balances_summary").select("item_id", { count: "exact", head: true }).eq("status", "active").eq("is_low_stock", true),
    db.from("stock_balances_summary").select("item_id", { count: "exact", head: true }).lt("current_qty", 0),
    db.from("purchase_requests").select("id, request_no, status, priority, needed_by_date").in("priority", ["urgent", "critical"]).is("deleted_at", null).order("needed_by_date", { ascending: true }).limit(5),
    db.from("purchase_requests").select("id, request_no, status, priority").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5),
    db.from("purchase_orders").select("id, po_no, status, priority").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5),
    db.from("documents").select("id, document_no, document_type").order("updated_at", { ascending: false }).limit(6),
    db.from("goods_receivings").select("id", { count: "exact", head: true }).eq("received_date", today).is("deleted_at", null),
    db.from("stock_counts").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted", "reviewed", "approved"]).is("deleted_at", null),
    db.from("stock_wastage").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted"]).is("deleted_at", null),
    db.from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["sent", "partial_received"]).is("deleted_at", null),
    db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", "posted").eq("production_date", today).is("deleted_at", null),
    db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", "submitted").is("deleted_at", null),
    db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", "approved").is("deleted_at", null),
    db.from("production_job_ingredient_lines").select("id", { count: "exact", head: true }).lt("stock_available_qty", 0),
    db.from("outlet_daily_records").select("id", { count: "exact", head: true }).eq("record_date", today).in("status", ["draft", "morning_recorded", "evening_completed"]),
    db.from("outlet_daily_records").select("id", { count: "exact", head: true }).eq("status", "evening_completed"),
    db.from("stock_counts").select("count_no, count_date, status").eq("status", "posted").is("deleted_at", null).order("count_date", { ascending: false }).order("posted_at", { ascending: false }).limit(1),
  ]);

  const results = [
    items,
    suppliers,
    balances,
    lowStockBalances,
    negativeBalances,
    urgentRequests,
    purchaseRequests,
    purchaseOrders,
    recentDocuments,
    todayReceiving,
    stockCountDue,
    wastageAttention,
    receivingFollowup,
    productionTodayPosted,
    productionPendingApproval,
    productionReadyToPost,
    productionIngredientShortages,
    outletMissingEvening,
    outletNeedsReview,
    lastStockCount,
  ];
  const error = results.find((result) => result.error)?.error;
  if (error) warnOptionalQuery("core snapshot fallback", error);

  const unavailable = {
    inventory: Boolean(
      balances.error || balances.count === null || lowStockBalances.error || lowStockBalances.count === null ||
      negativeBalances.error || negativeBalances.count === null,
    ),
    procurement: Boolean(
      urgentRequests.error || urgentRequests.data === null || purchaseRequests.error || purchaseRequests.data === null ||
      purchaseOrders.error || purchaseOrders.data === null,
    ),
    receiving: Boolean(todayReceiving.error || todayReceiving.count === null),
    stockCount: Boolean(stockCountDue.error || stockCountDue.count === null || lastStockCount.error || lastStockCount.data === null),
    wastage: Boolean(wastageAttention.error || wastageAttention.count === null),
    receivingFollowup: Boolean(receivingFollowup.error || receivingFollowup.count === null),
    production: Boolean(
      productionTodayPosted.error || productionTodayPosted.count === null || productionPendingApproval.error ||
      productionPendingApproval.count === null || productionReadyToPost.error || productionReadyToPost.count === null ||
      productionIngredientShortages.error || productionIngredientShortages.count === null,
    ),
    operations: Boolean(
      outletMissingEvening.error || outletMissingEvening.count === null || outletNeedsReview.error || outletNeedsReview.count === null,
    ),
  };

  // Head-count reads legitimately return data=null, so count null is the
  // unavailable signal there. Row reads use data=null as their signal.
  const count = (result: { count?: number | null; data?: unknown[] | null }) =>
    result.count === null ? null : Number(result.count ?? result.data?.length ?? 0);
  const rows = <T,>(result: { data?: unknown[] | null }) => (result.data === null ? null : (result.data ?? []) as T[]);
  const balanceRows = rows<{ inventory_value?: number | string | null; is_low_stock?: boolean | null }>(balances) ?? [];

  return {
    snapshot: {
      total_items: count(items),
      total_suppliers: count(suppliers),
      inventory_value: balances.data === null ? null : balanceRows.reduce((total, row) => total + Number(row.inventory_value ?? 0), 0),
      low_stock_items_count: count(lowStockBalances),
      negative_stock: count(negativeBalances),
      urgent_requests: rows(urgentRequests) ?? [],
      purchase_requests: rows(purchaseRequests) ?? [],
      purchase_orders: rows(purchaseOrders) ?? [],
      recent_documents: rows(recentDocuments) ?? [],
      today_receiving: count(todayReceiving),
      stock_count_due: count(stockCountDue),
      wastage_attention: count(wastageAttention),
      receiving_followup: count(receivingFollowup),
      production_today_posted: count(productionTodayPosted),
      production_pending_approval: count(productionPendingApproval),
      production_ready_to_post: count(productionReadyToPost),
      production_ingredient_shortages: count(productionIngredientShortages),
      outlet_missing_evening: count(outletMissingEvening),
      outlet_needs_review: count(outletNeedsReview),
      last_stock_count: rows(lastStockCount)?.[0] ?? null,
    } as DashboardCoreSnapshot,
    unavailable,
  };
}

type DashboardCoreSnapshot = {
  total_items: number | null;
  total_suppliers: number | null;
  inventory_value: number | null;
  low_stock_items_count: number | null;
  negative_stock: number | null;
  urgent_requests: Array<{ id: string; request_no: string; status: string; priority: string; needed_by_date: string | null }>;
  purchase_requests: Array<{ id: string; request_no: string; status: string; priority: string }>;
  purchase_orders: Array<{ id: string; po_no: string; status: string; priority: string }>;
  recent_documents: Array<{ id: string; document_no: string; document_type: string }>;
  today_receiving: number | null;
  stock_count_due: number | null;
  wastage_attention: number | null;
  receiving_followup: number | null;
  production_today_posted: number | null;
  production_pending_approval: number | null;
  production_ready_to_post: number | null;
  production_ingredient_shortages: number | null;
  outlet_missing_evening: number | null;
  outlet_needs_review: number | null;
  last_stock_count: { count_no: string; count_date: string; status: string } | null;
};

export type DashboardAttentionSource =
  | "pending_approvals"
  | "low_stock"
  | "stock_count_due"
  | "wastage"
  | "overdue_payables";

export type DashboardAttentionSummary = {
  state: "complete" | "unavailable";
  total: number | null;
  unavailableSources: DashboardAttentionSource[];
  sources: Record<DashboardAttentionSource, number | null>;
};

function createDashboardAttentionSummary(input: {
  pendingApprovals: number;
  lowStock: number;
  stockCountDue: number;
  wastage: number;
  overduePayables: number;
  inventoryUnavailable: boolean;
  stockCountDueUnavailable: boolean;
  wastageUnavailable: boolean;
  payablesAttentionUnavailable: boolean;
  pendingApprovalsUnavailable: boolean;
}): DashboardAttentionSummary {
  const unavailableSources: DashboardAttentionSource[] = [];
  if (input.pendingApprovalsUnavailable) unavailableSources.push("pending_approvals");
  if (input.inventoryUnavailable) unavailableSources.push("low_stock");
  if (input.stockCountDueUnavailable) unavailableSources.push("stock_count_due");
  if (input.wastageUnavailable) unavailableSources.push("wastage");
  if (input.payablesAttentionUnavailable) unavailableSources.push("overdue_payables");

  const sources: DashboardAttentionSummary["sources"] = {
    pending_approvals: input.pendingApprovalsUnavailable ? null : input.pendingApprovals,
    low_stock: input.inventoryUnavailable ? null : input.lowStock,
    stock_count_due: input.stockCountDueUnavailable ? null : input.stockCountDue,
    wastage: input.wastageUnavailable ? null : input.wastage,
    overdue_payables: input.payablesAttentionUnavailable ? null : input.overduePayables,
  };

  if (unavailableSources.length > 0) {
    return { state: "unavailable", total: null, unavailableSources, sources };
  }

  return {
    state: "complete",
    total: input.pendingApprovals + input.lowStock + input.stockCountDue + input.wastage + input.overduePayables,
    unavailableSources,
    sources,
  };
}

export async function getDashboardSummary() {
  if (isMockMode()) {
    const balances = getMockStockBalances();
    const itemById = new Map<string, (typeof mockItems)[number]>(mockItems.map((item) => [item.id, item]));
    const mockPendingApprovals = mockPurchaseRequests.filter((request) => request.status === "finance_review").slice(0, 5);
    const mockLowStockCount = balances.filter((row) => row.is_low_stock).length;

    return {
      role: "super_admin",
      roleLabel: "Super Admin / Owner",
      scopeLabel: "Company-wide",
      userName: "Mock Owner",
      branchLabel: "Company-wide",
      totalItems: mockItems.length,
      totalSuppliers: mockSuppliers.length,
      lowStockCount: mockLowStockCount,
      totalStockValue: balances.reduce((sum, row) => sum + Number(row.current_stock ?? 0), 0),
      lastStockCount: null,
      lowStockItems: getMockLowStockItems().slice(0, 5),
      pendingApprovals: mockPendingApprovals.map((request) => ({
          id: `pr-finance_review-${request.id}`,
          document_no: request.request_no,
          title: "Manager Approval required",
          href: `/purchase-requests/${request.id}`,
          step: "Manager Approval",
          branch_name: mockBranches.find((branch) => branch.id === request.branch_id)?.branch_name ?? null,
          age_label: "Today",
          updated_at: request.updated_at ?? new Date().toISOString(),
          supplier_names: [],
          line_count: 0,
          submitted_by_name: null,
          estimated_total: 0,
        })),
      purchaseRequests: mockPurchaseRequests.slice(0, 5),
      urgentRequests: mockPurchaseRequests.filter((request) => ["urgent", "critical"].includes(request.priority ?? "")).slice(0, 5),
      purchaseOrders: mockPurchaseOrders.slice(0, 5),
      recentDocuments: mockDocuments.slice(0, 6),
      recentActivities: [
        { id: "act-1", message: "PR-00001 prepared from low stock review", created_at: "2026-06-30T08:20:00.000Z" },
        { id: "act-2", message: "PO-00018 approved by manager", created_at: "2026-06-29T14:05:00.000Z" },
        { id: "act-3", message: "GRN-00009 posted to inventory", created_at: "2026-06-28T16:10:00.000Z" },
      ],
      notifications: [
        { id: "note-1", title: "Stock count due tonight", message: "Dry Store and Freezer counts are due before closing.", action_url: "/stock-counts" },
        { id: "note-2", title: "Invoice pending matching", message: "INV-00031 is waiting for receiving confirmation.", action_url: "/supplier-invoices" },
      ],
      today: {
        goodsReceiving: 2,
        stockCountDue: 3,
        production: 4,
        deliveries: 2,
      },
      wastageAttention: 0,
      financeForecast: {
        upcomingPayables: 0,
        pendingPoValue: 0,
        receivingNotInvoiced: 0,
      },
      payablesAttention: null,
      payablesAttentionUnavailable: false,
      attentionSummary: createDashboardAttentionSummary({
        pendingApprovals: mockPendingApprovals.length,
        lowStock: mockLowStockCount,
        stockCountDue: 3,
        wastage: 0,
        overduePayables: 0,
        inventoryUnavailable: false,
        stockCountDueUnavailable: false,
        wastageUnavailable: false,
        payablesAttentionUnavailable: false,
        pendingApprovalsUnavailable: false,
      }),
      coreSnapshotUnavailable: false,
      inventoryUnavailable: false,
      todayReceivingUnavailable: false,
      stockCountDueUnavailable: false,
      wastageUnavailable: false,
      receivingFollowupUnavailable: false,
      operationsControl: null,
      wastageTrend: null,
      compliance: null,
      productionSummary: null,
      outletToday: null,
      upcomingShifts: [],
      recentTransactions: mockStockTransactions.slice(0, 6).map((transaction) => ({
        ...transaction,
        item: itemById.get(transaction.item_id) ?? null,
      })),
    };
  }

  const scope = await getCurrentUserScope();
  if (!scope) throw new Error("An authenticated staff profile is required.");
  const role = scope.roleCode;
  const isOwner = role === "super_admin";
  const isFinance = role === "finance";
  const isManager = role === "manager";
  const isPurchasing = role === "purchasing";
  const isKitchen = role === "kitchen";
  const isOutlet = role === "outlet_staff" || role === "outlet_supervisor";
  const needsProcurement = isOwner || isFinance || isManager || isPurchasing || isKitchen;
  const needsInventory = isOwner || isFinance || isManager || isPurchasing || isKitchen;
  const needsOperations = isOwner || isFinance || isManager;
  const needsCompliance = isOwner || isManager || isKitchen || isOutlet || role === "people_operations";
  const needsProduction = isOwner || isFinance || isManager || isPurchasing || isKitchen;
  const today = todayInKualaLumpur();
  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const empty = { data: [], error: null, count: 0 };
  const nextWeek = new Date(`${today}T00:00:00Z`); nextWeek.setUTCDate(nextWeek.getUTCDate()+7);
  const [coreSnapshotRpcResult, pendingApprovalsSnapshot, notifications, recentActivities, outletToday, currentStaff, assignedBranches, payablesAttention, lowStockViewResult, upcomingShifts, outletCompletion, wastageTrend, complianceIssueCount] = await Promise.all([
    (needsProcurement || needsInventory) ? supabase.rpc("get_dashboard_core_snapshot", { p_today: today }) : Promise.resolve({ data: null, error: null }),
    getCurrentUserPendingActionSnapshot(5, false),
    getVisibleNotificationsForCurrentUser(),
    // Actor resolution is intentionally reserved for Activity Log and the
    // notification workspace. It is not part of the dashboard's critical path.
    Promise.resolve([]),
    isOutlet ? db.from("outlet_daily_records").select("id, status, record_date, branch_id").eq("record_date", today).order("updated_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    scope.staffId ? supabase.from("staffs").select("full_name").eq("id", scope.staffId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    !scope.companyWideAccess && scope.branchIds.length
      ? supabase.from("branches").select("branch_name").in("id", scope.branchIds).order("branch_name")
      : Promise.resolve(empty),
    (isOwner || isFinance)
      ? getPayablesAttention().catch((error) => {
          warnOptionalQuery("payables attention", error);
          return null;
        })
      : Promise.resolve(null),
    needsInventory
      ? getLowStockCount()
      : Promise.resolve({ rows: [], count: 0, unavailable: false }),
    isOutlet && scope.staffId ? db.from("shift_assignment_revisions").select("id,work_date,assignment_kind,custom_start,custom_end,shift_templates(code,name,planned_start,planned_end,crosses_midnight),schedule_weeks!shift_assignment_revisions_schedule_week_id_fkey!inner(status)").eq("staff_id",scope.staffId).eq("is_current",true).gte("work_date",today).lte("work_date",nextWeek.toISOString().slice(0,10)).in("schedule_weeks.status",["published","locked"]).order("work_date").limit(8) : Promise.resolve({data:[],error:null}),
    needsOperations ? getOutletDailyCompletionMatrix({ history_date: today }).catch((error) => { warnOptionalQuery("outlet completion", error); return null; }) : Promise.resolve(null),
    needsOperations ? getOutletDailyDemandTrend({ period: "7", history_date: today }).catch((error) => { warnOptionalQuery("outlet wastage trend", error); return null; }) : Promise.resolve(null),
    needsCompliance ? getOutletComplianceIssueCount().catch((error) => { warnOptionalQuery("outlet compliance", error); return null; }) : Promise.resolve(null),
  ]);

  // Keep the exact total for the attention summary, while showing only the
  // three newest actionable items on the dashboard command surface.
  const pendingApprovals = { ...pendingApprovalsSnapshot, items: pendingApprovalsSnapshot.items.slice(0, 3) };

  let coreSnapshot = coreSnapshotRpcResult.data as DashboardCoreSnapshot | null;
  let coreSnapshotUnavailable = Boolean(coreSnapshotRpcResult.error) || !coreSnapshot;
  let fallbackUnavailable = {
    inventory: false,
    procurement: false,
    receiving: false,
    stockCount: false,
    wastage: false,
    receivingFollowup: false,
    production: false,
    operations: false,
  };
  if ((needsProcurement || needsInventory) && coreSnapshotUnavailable) {
    const fallbackSnapshot = await getDashboardCoreSnapshotFallback(db, today);
    if (fallbackSnapshot) {
      coreSnapshot = fallbackSnapshot.snapshot;
      fallbackUnavailable = fallbackSnapshot.unavailable;
      coreSnapshotUnavailable = (needsProcurement && fallbackUnavailable.procurement) || (needsInventory && fallbackUnavailable.inventory);
    }
  }

  warnOptionalQueryResult("core snapshot", coreSnapshotRpcResult);
  warnOptionalQueryResult("current staff", currentStaff);
  warnOptionalQueryResult("assigned branches", assignedBranches);

  const coreUnavailable = (needsProcurement || needsInventory) && coreSnapshotUnavailable;
  const lowStockViewUnavailable = Boolean(needsInventory && lowStockViewResult.unavailable);
  const lowStockViewCount = lowStockViewResult.count;

  // A dashboard is a situational overview, not a transaction form. A degraded
  // optional read must not strand a signed-in operator behind a generic error
  // page when the rest of their permitted workspace is still usable.
  const payablesAttentionUnavailable = (isOwner || isFinance) && payablesAttention === null;
  const branchLabel = scope.companyWideAccess
    ? "Company-wide"
    : assignedBranches.data?.map((branch: { branch_name: string | null }) => branch.branch_name).filter(Boolean).join(", ") || "Assigned workspace";
  // A successful core snapshot does not make the secondary low-stock read
  // trustworthy. If that read failed, its old `?? 0` path used to turn a
  // transport failure into a healthy-looking zero on the dashboard.
  const inventoryUnavailable = needsInventory && (coreUnavailable || fallbackUnavailable.inventory || lowStockViewUnavailable);
  const todayReceivingUnavailable = (needsProcurement || needsInventory) && (coreUnavailable || fallbackUnavailable.receiving);
  const stockCountDueUnavailable = (needsProcurement || needsInventory) && (coreUnavailable || fallbackUnavailable.stockCount);
  const wastageUnavailable = (needsProcurement || needsInventory) && (coreUnavailable || fallbackUnavailable.wastage);
  const receivingFollowupUnavailable = (needsProcurement || needsInventory) && (coreUnavailable || fallbackUnavailable.receivingFollowup);
  const productionUnavailable = needsProduction && (coreUnavailable || fallbackUnavailable.production);
  const operationsUnavailable = needsOperations && (coreUnavailable || fallbackUnavailable.operations);
  const outletCompletionIssues = outletCompletion
    ? outletCompletion.rows.reduce((total, row) => {
        const todayCell = row.cells.find((cell) => cell.record_date === today);
        return total + (!todayCell || ["missing", "draft", "morning_recorded", "evening_completed"].includes(todayCell.status) ? 1 : 0);
      }, 0)
    : null;
  const attentionSummary = createDashboardAttentionSummary({
    pendingApprovals: pendingApprovals.total ?? 0,
    lowStock: inventoryUnavailable ? 0 : (lowStockViewCount ?? Number(coreSnapshot?.low_stock_items_count ?? 0)),
    stockCountDue: Number(coreSnapshot?.stock_count_due ?? 0),
    wastage: Number(coreSnapshot?.wastage_attention ?? 0),
    overduePayables: Number(payablesAttention?.overdue_count ?? 0),
    inventoryUnavailable,
    stockCountDueUnavailable,
    wastageUnavailable,
    payablesAttentionUnavailable,
    pendingApprovalsUnavailable: pendingApprovals.unavailable,
  });

  const result = {
    role,
    roleLabel: getRoleDisplayLabel(role),
    scopeLabel: branchLabel,
    userName: currentStaff.data?.full_name?.trim() || "Team member",
    branchLabel,
    totalItems: coreSnapshot?.total_items == null ? null : Number(coreSnapshot.total_items),
    totalSuppliers: coreSnapshot?.total_suppliers == null ? null : Number(coreSnapshot.total_suppliers),
    lowStockCount: inventoryUnavailable ? null : (lowStockViewCount ?? (coreSnapshot?.low_stock_items_count == null ? null : Number(coreSnapshot.low_stock_items_count))),
    lastStockCount: coreSnapshot?.last_stock_count ?? null,
    totalStockValue: inventoryUnavailable ? null : (coreSnapshot?.inventory_value == null ? null : Number(coreSnapshot.inventory_value)),
    lowStockItems: [],
    inventoryUnavailable,
    urgentRequests: coreSnapshot?.urgent_requests ?? [],
    // Transaction history is intentionally loaded only from Inventory drill-down
    // routes. The owner workdesk must remain a summary read, not a ledger scan.
    recentTransactions: [],
    pendingApprovals: pendingApprovals.items,
    purchaseRequests: coreSnapshot?.purchase_requests ?? [],
    purchaseOrders: coreSnapshot?.purchase_orders ?? [],
    recentDocuments: coreSnapshot?.recent_documents ?? [],
    recentActivities,
    notifications: notifications.slice(0, 6),
    coreSnapshotUnavailable: coreUnavailable,
    today: {
      goodsReceiving: todayReceivingUnavailable || coreSnapshot?.today_receiving == null ? null : Number(coreSnapshot.today_receiving),
      stockCountDue: stockCountDueUnavailable || coreSnapshot?.stock_count_due == null ? null : Number(coreSnapshot.stock_count_due),
      production: !needsProduction || productionUnavailable || coreSnapshot?.production_today_posted == null ? null : Number(coreSnapshot.production_today_posted),
      deliveries: null,
    },
    todayReceivingUnavailable,
    stockCountDueUnavailable,
    wastageAttention: wastageUnavailable || coreSnapshot?.wastage_attention == null ? null : Number(coreSnapshot.wastage_attention),
    wastageUnavailable,
    financeForecast: {
      upcomingPayables: 0,
      pendingPoValue: 0,
      receivingNotInvoiced: receivingFollowupUnavailable || coreSnapshot?.receiving_followup == null ? null : Number(coreSnapshot.receiving_followup),
    },
    receivingFollowupUnavailable,
    payablesAttention,
    payablesAttentionUnavailable,
    attentionSummary,
    compliance: needsCompliance ? { issues: complianceIssueCount, unavailable: complianceIssueCount === null } : null,
    operationsControl: needsOperations && !operationsUnavailable ? {
      outlet: {
        missing_evening: outletCompletionIssues ?? Number(coreSnapshot?.outlet_missing_evening ?? 0),
        needs_review: Number(coreSnapshot?.outlet_needs_review ?? 0),
      },
      demand: null,
      variance: null,
      planning: null,
      unavailable: { outlet: false, demand: true },
    } : null,
    wastageTrend: wastageTrend ? wastageTrend.daily.map((row) => ({ date: row.name, rate: row.wastage_percent })) : null,
    productionSummary: needsProduction && !productionUnavailable ? {
      todayPosted: Number(coreSnapshot?.production_today_posted ?? 0),
      pendingApproval: Number(coreSnapshot?.production_pending_approval ?? 0),
      readyToPost: Number(coreSnapshot?.production_ready_to_post ?? 0),
      activeRecipes: 0,
      ingredientShortages: Number(coreSnapshot?.production_ingredient_shortages ?? 0),
    } : null,
    outletToday: outletToday.data ?? null,
    upcomingShifts: upcomingShifts.error ? [] : (upcomingShifts.data ?? []) as unknown as Array<{id:string;work_date:string;assignment_kind:string;custom_start:string|null;custom_end:string|null;shift_templates:{code:string;name:string;planned_start:string;planned_end:string;crosses_midnight:boolean}|null}>,
  };
  return result;
}
