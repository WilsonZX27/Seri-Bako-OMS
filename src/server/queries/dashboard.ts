import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentUserScope, getVisibleNotificationsForCurrentUser } from "@/server/queries/notifications";
import { getCurrentUserPendingActions } from "@/server/queries/pending-actions";
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

export async function getDashboardSummary() {
  if (isMockMode()) {
    const balances = getMockStockBalances();
    const itemById = new Map<string, (typeof mockItems)[number]>(mockItems.map((item) => [item.id, item]));

    return {
      role: "super_admin",
      roleLabel: "Super Admin / Owner",
      scopeLabel: "Company-wide",
      userName: "Mock Owner",
      branchLabel: "Company-wide",
      totalItems: mockItems.length,
      totalSuppliers: mockSuppliers.length,
      lowStockCount: balances.filter((row) => row.is_low_stock).length,
      totalStockValue: balances.reduce((sum, row) => sum + Number(row.current_stock ?? 0), 0),
      lastStockCount: null,
      lowStockItems: getMockLowStockItems().slice(0, 5),
      pendingApprovals: mockPurchaseRequests
        .filter((request) => request.status === "finance_review")
        .slice(0, 5)
        .map((request) => ({
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
  const [coreSnapshotResult, pendingApprovals, notifications, recentActivities, outletToday, currentStaff, assignedBranches, payablesAttention] = await Promise.all([
    (needsProcurement || needsInventory) ? supabase.rpc("get_dashboard_core_snapshot", { p_today: today }) : Promise.resolve({ data: null, error: null }),
    getCurrentUserPendingActions(5),
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
  ]);

  warnOptionalQueryResult("core snapshot", coreSnapshotResult);
  warnOptionalQueryResult("current staff", currentStaff);
  warnOptionalQueryResult("assigned branches", assignedBranches);

  const coreSnapshot = coreSnapshotResult.data as DashboardCoreSnapshot | null;
  const coreUnavailable = (needsProcurement || needsInventory) && (Boolean(coreSnapshotResult.error) || !coreSnapshot);

  // A dashboard is a situational overview, not a transaction form. A degraded
  // optional read must not strand a signed-in operator behind a generic error
  // page when the rest of their permitted workspace is still usable.
  const payablesAttentionUnavailable = (isOwner || isFinance) && payablesAttention === null;
  const branchLabel = scope.companyWideAccess
    ? "Company-wide"
    : assignedBranches.data?.map((branch: { branch_name: string | null }) => branch.branch_name).filter(Boolean).join(", ") || "Assigned workspace";
  const inventoryUnavailable = needsInventory && coreUnavailable;

  const result = {
    role,
    roleLabel: getRoleDisplayLabel(role),
    scopeLabel: branchLabel,
    userName: currentStaff.data?.full_name?.trim() || "Team member",
    branchLabel,
    totalItems: Number(coreSnapshot?.total_items ?? 0),
    totalSuppliers: Number(coreSnapshot?.total_suppliers ?? 0),
    lowStockCount: inventoryUnavailable ? 0 : Number(coreSnapshot?.low_stock_items_count ?? 0),
    lastStockCount: coreSnapshot?.last_stock_count ?? null,
    totalStockValue: inventoryUnavailable ? 0 : Number(coreSnapshot?.inventory_value ?? 0),
    lowStockItems: [],
    inventoryUnavailable,
    urgentRequests: coreSnapshot?.urgent_requests ?? [],
    // Transaction history is intentionally loaded only from Inventory drill-down
    // routes. The owner workdesk must remain a summary read, not a ledger scan.
    recentTransactions: [],
    pendingApprovals,
    purchaseRequests: coreSnapshot?.purchase_requests ?? [],
    purchaseOrders: coreSnapshot?.purchase_orders ?? [],
    recentDocuments: coreSnapshot?.recent_documents ?? [],
    recentActivities,
    notifications: notifications.slice(0, 6),
    today: {
      goodsReceiving: Number(coreSnapshot?.today_receiving ?? 0),
      stockCountDue: Number(coreSnapshot?.stock_count_due ?? 0),
      production: needsProduction && !coreUnavailable ? Number(coreSnapshot?.production_today_posted ?? 0) : 0,
      deliveries: 0,
    },
    todayReceivingUnavailable: coreUnavailable,
    stockCountDueUnavailable: coreUnavailable,
    wastageAttention: Number(coreSnapshot?.wastage_attention ?? 0),
    wastageUnavailable: coreUnavailable,
    financeForecast: {
      upcomingPayables: 0,
      pendingPoValue: 0,
      receivingNotInvoiced: Number(coreSnapshot?.receiving_followup ?? 0),
    },
    receivingFollowupUnavailable: coreUnavailable,
    payablesAttention,
    payablesAttentionUnavailable,
    operationsControl: needsOperations && !coreUnavailable ? {
      outlet: {
        missing_evening: Number(coreSnapshot?.outlet_missing_evening ?? 0),
        needs_review: Number(coreSnapshot?.outlet_needs_review ?? 0),
      },
      demand: null,
      variance: null,
      planning: null,
      unavailable: { outlet: false, demand: true },
    } : null,
    productionSummary: needsProduction && !coreUnavailable ? {
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
