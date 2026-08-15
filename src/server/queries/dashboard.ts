import { createClient } from "@/lib/supabase/server";
import { looseSupabase, type LooseSupabase } from "@/lib/supabase/loose";
import { getCurrentUserScope, getVisibleNotificationsForCurrentUser } from "@/server/queries/notifications";
import { getCurrentUserPendingActionSnapshot } from "@/server/queries/pending-actions";
import { getPayablesAttention } from "@/server/queries/ap-aging";
import { getRoleDisplayLabel } from "@/lib/roles";
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
    db.from("outlet_daily_records").select("id", { count: "exact", head: true }).eq("record_date", today).in("status", ["draft", "morning_recorded"]),
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
    inventory: Boolean(balances.error || lowStockBalances.error || negativeBalances.error),
    procurement: Boolean(urgentRequests.error || purchaseRequests.error || purchaseOrders.error),
    receiving: Boolean(todayReceiving.error),
    stockCount: Boolean(stockCountDue.error || lastStockCount.error),
    wastage: Boolean(wastageAttention.error),
    receivingFollowup: Boolean(receivingFollowup.error),
    production: Boolean(productionTodayPosted.error || productionPendingApproval.error || productionReadyToPost.error || productionIngredientShortages.error),
    operations: Boolean(outletMissingEvening.error || outletNeedsReview.error),
  };

  const count = (result: { count?: number | null; data?: unknown[] | null }) => Number(result.count ?? result.data?.length ?? 0);
  const rows = <T,>(result: { data?: unknown[] | null }) => (result.data ?? []) as T[];
  const balanceRows = rows<{ inventory_value?: number | string | null; is_low_stock?: boolean | null }>(balances);

  return {
    snapshot: {
      total_items: count(items),
      total_suppliers: count(suppliers),
      inventory_value: balanceRows.reduce((total, row) => total + Number(row.inventory_value ?? 0), 0),
      low_stock_items_count: count(lowStockBalances),
      negative_stock: count(negativeBalances),
      urgent_requests: rows(urgentRequests),
      purchase_requests: rows(purchaseRequests),
      purchase_orders: rows(purchaseOrders),
      recent_documents: rows(recentDocuments),
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
      last_stock_count: rows(lastStockCount)[0] ?? null,
    } as DashboardCoreSnapshot,
    unavailable,
  };
}

type DashboardCoreSnapshot = {
  total_items: number;
  total_suppliers: number;
  inventory_value: number;
  low_stock_items_count: number;
  negative_stock: number;
  urgent_requests: Array<{ id: string; request_no: string; status: string; priority: string; needed_by_date: string | null }>;
  purchase_requests: Array<{ id: string; request_no: string; status: string; priority: string }>;
  purchase_orders: Array<{ id: string; po_no: string; status: string; priority: string }>;
  recent_documents: Array<{ id: string; document_no: string; document_type: string }>;
  today_receiving: number;
  stock_count_due: number;
  wastage_attention: number;
  receiving_followup: number;
  production_today_posted: number;
  production_pending_approval: number;
  production_ready_to_post: number;
  production_ingredient_shortages: number;
  outlet_missing_evening: number;
  outlet_needs_review: number;
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
      productionSummary: null,
      outletToday: null,
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
  const isOutlet = role === "outlet_staff";
  const needsProcurement = isOwner || isFinance || isManager || isPurchasing || isKitchen;
  const needsInventory = isOwner || isFinance || isManager || isPurchasing || isKitchen;
  const needsOperations = isOwner || isFinance || isManager;
  const needsProduction = isOwner || isFinance || isManager || isPurchasing || isKitchen;
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const empty = { data: [], error: null, count: 0 };
  const [coreSnapshotRpcResult, pendingApprovals, notifications, recentActivities, outletToday, currentStaff, assignedBranches, payablesAttention, lowStockViewResult] = await Promise.all([
    (needsProcurement || needsInventory) ? supabase.rpc("get_dashboard_core_snapshot", { p_today: today }) : Promise.resolve({ data: null, error: null }),
    getCurrentUserPendingActionSnapshot(5),
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
    // Keep the attention count on the bounded pre-aggregated inventory model.
    // The legacy stock_balances_view recomputes the entire ledger and can time
    // out even for a small dashboard count.
    needsInventory
      ? supabase.from("stock_balances_summary").select("item_id, current_qty, safety_stock, status, is_low_stock")
      : Promise.resolve({ data: [], error: null }),
  ]);

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
  const lowStockViewRows = (lowStockViewResult.data ?? []) as Array<{
    item_id: string | null;
    current_qty: number | string | null;
    safety_stock: number | string | null;
    status: string | null;
  }>;
  const lowStockViewCount = lowStockViewResult.error
    ? null
    : new Set(
        lowStockViewRows
          .filter((row) => row.status === "active")
          .filter((row) => Number(row.current_qty ?? 0) <= Number(row.safety_stock ?? 0) || Number(row.current_qty ?? 0) <= 0)
          .map((row) => row.item_id)
          .filter(Boolean),
      ).size;

  // A dashboard is a situational overview, not a transaction form. A degraded
  // optional read must not strand a signed-in operator behind a generic error
  // page when the rest of their permitted workspace is still usable.
  const payablesAttentionUnavailable = (isOwner || isFinance) && payablesAttention === null;
  const branchLabel = scope.companyWideAccess
    ? "Company-wide"
    : assignedBranches.data?.map((branch: { branch_name: string | null }) => branch.branch_name).filter(Boolean).join(", ") || "Assigned workspace";
  const inventoryUnavailable = needsInventory && (coreUnavailable || fallbackUnavailable.inventory);
  const todayReceivingUnavailable = (needsProcurement || needsInventory) && (coreUnavailable || fallbackUnavailable.receiving);
  const stockCountDueUnavailable = (needsProcurement || needsInventory) && (coreUnavailable || fallbackUnavailable.stockCount);
  const wastageUnavailable = (needsProcurement || needsInventory) && (coreUnavailable || fallbackUnavailable.wastage);
  const receivingFollowupUnavailable = (needsProcurement || needsInventory) && (coreUnavailable || fallbackUnavailable.receivingFollowup);
  const productionUnavailable = needsProduction && (coreUnavailable || fallbackUnavailable.production);
  const operationsUnavailable = needsOperations && (coreUnavailable || fallbackUnavailable.operations);
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
    totalItems: Number(coreSnapshot?.total_items ?? 0),
    totalSuppliers: Number(coreSnapshot?.total_suppliers ?? 0),
    lowStockCount: inventoryUnavailable ? 0 : (lowStockViewCount ?? Number(coreSnapshot?.low_stock_items_count ?? 0)),
    lastStockCount: coreSnapshot?.last_stock_count ?? null,
    totalStockValue: inventoryUnavailable ? 0 : Number(coreSnapshot?.inventory_value ?? 0),
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
      goodsReceiving: Number(coreSnapshot?.today_receiving ?? 0),
      stockCountDue: Number(coreSnapshot?.stock_count_due ?? 0),
      production: needsProduction && !productionUnavailable ? Number(coreSnapshot?.production_today_posted ?? 0) : 0,
      deliveries: 0,
    },
    todayReceivingUnavailable,
    stockCountDueUnavailable,
    wastageAttention: Number(coreSnapshot?.wastage_attention ?? 0),
    wastageUnavailable,
    financeForecast: {
      upcomingPayables: 0,
      pendingPoValue: 0,
      receivingNotInvoiced: Number(coreSnapshot?.receiving_followup ?? 0),
    },
    receivingFollowupUnavailable,
    payablesAttention,
    payablesAttentionUnavailable,
    attentionSummary,
    operationsControl: needsOperations && !operationsUnavailable ? {
      outlet: {
        missing_evening: Number(coreSnapshot?.outlet_missing_evening ?? 0),
        needs_review: Number(coreSnapshot?.outlet_needs_review ?? 0),
      },
      demand: null,
      variance: null,
      planning: null,
      unavailable: { outlet: false, demand: true },
    } : null,
    productionSummary: needsProduction && !productionUnavailable ? {
      todayPosted: Number(coreSnapshot?.production_today_posted ?? 0),
      pendingApproval: Number(coreSnapshot?.production_pending_approval ?? 0),
      readyToPost: Number(coreSnapshot?.production_ready_to_post ?? 0),
      activeRecipes: 0,
      ingredientShortages: Number(coreSnapshot?.production_ingredient_shortages ?? 0),
    } : null,
    outletToday: outletToday.data ?? null,
  };
  return result;
}
