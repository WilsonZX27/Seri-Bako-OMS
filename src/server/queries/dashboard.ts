import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentUserScope, getVisibleNotificationsForCurrentUser, getVisibleRecentActivitiesForCurrentUser } from "@/server/queries/notifications";
import { getCurrentUserPendingActions } from "@/server/queries/pending-actions";
import { getPayablesAttention } from "@/server/queries/ap-aging";
import { getOperationsControlCenterSummary } from "@/server/queries/outlet-daily-records";
import { getProductionHubSummary } from "@/server/queries/production-jobs";
import { getRoleDisplayLabel } from "@/lib/roles";
import { logServerError, logServerWarning } from "@/server/observability/logger";
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

export async function getDashboardSummary() {
  if (isMockMode()) {
    const balances = getMockStockBalances();
    const itemById = new Map<string, (typeof mockItems)[number]>(mockItems.map((item) => [item.id, item]));

    return {
      role: "super_admin",
      roleLabel: "Super Admin / Owner",
      scopeLabel: "Company-wide",
      totalItems: mockItems.length,
      totalSuppliers: mockSuppliers.length,
      lowStockCount: balances.filter((row) => row.is_low_stock).length,
      totalStockValue: balances.reduce((sum, row) => sum + Number(row.current_stock ?? 0), 0),
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
  const [balances, lowStock, transactions, stockItems, suppliers, items, urgentRequests, purchaseRequests, purchaseOrders, pendingApprovals, documents, notifications, recentActivities, productionSummary, outletToday, todayReceiving, stockCountDue, wastageAttention, receivingFollowup] = await Promise.all([
    needsInventory ? supabase.from("stock_balances_view").select("item_id, current_stock, is_low_stock") : Promise.resolve(empty),
    needsInventory ? supabase.from("low_stock_items").select("*").limit(5) : Promise.resolve(empty),
    needsInventory ? supabase
      .from("stock_transactions")
      .select("id, item_id, transaction_date, transaction_type, quantity_in, quantity_out")
      .order("created_at", { ascending: false })
      .limit(6) : Promise.resolve(empty),
    needsInventory ? supabase.from("items").select("id, item_name, base_unit") : Promise.resolve(empty),
    (isOwner || isFinance || isPurchasing) ? supabase.from("suppliers").select("id", { count: "exact", head: true }) : Promise.resolve(empty),
    (isOwner || isFinance || isPurchasing) ? supabase.from("items").select("id", { count: "exact", head: true }) : Promise.resolve(empty),
    needsProcurement ? supabase
      .from("purchase_requests")
      .select("id, request_no, status, priority, needed_by_date")
      .in("priority", ["urgent", "critical"])
      .is("deleted_at", null)
      .order("needed_by_date", { ascending: true, nullsFirst: false })
      .limit(5) : Promise.resolve(empty),
    needsProcurement ? supabase.from("purchase_requests").select("id, request_no, status, priority").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5) : Promise.resolve(empty),
    needsProcurement ? supabase.from("purchase_orders").select("id, po_no, status, priority").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5) : Promise.resolve(empty),
    getCurrentUserPendingActions(5),
    (isOwner || isFinance || isPurchasing || isKitchen) ? supabase.from("documents").select("id, document_no, document_type").order("updated_at", { ascending: false }).limit(6) : Promise.resolve(empty),
    getVisibleNotificationsForCurrentUser(),
    (isOwner || isFinance || isManager) ? getVisibleRecentActivitiesForCurrentUser() : Promise.resolve([]),
    needsProduction ? getProductionHubSummary().catch(() => null) : Promise.resolve(null),
    isOutlet ? db.from("outlet_daily_records").select("id, status, record_date, branch_id").eq("record_date", today).order("updated_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    needsProcurement ? db.from("goods_receivings").select("id", { count: "exact", head: true }).eq("received_date", today).is("deleted_at", null) : Promise.resolve(empty),
    needsInventory ? db.from("stock_counts").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted", "reviewed", "approved"]).is("deleted_at", null) : Promise.resolve(empty),
    needsInventory ? db.from("stock_wastage").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted"]).is("deleted_at", null) : Promise.resolve(empty),
    needsProcurement ? db.from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["sent", "partial_received"]).is("deleted_at", null) : Promise.resolve(empty),
  ]);

  warnOptionalQuery("stock balances", balances.error);
  warnOptionalQuery("low stock items", lowStock.error);
  warnOptionalQuery("today receiving", todayReceiving.error);
  warnOptionalQuery("stock counts due", stockCountDue.error);
  warnOptionalQuery("wastage attention", wastageAttention.error);
  warnOptionalQuery("receiving follow-up", receivingFollowup.error);

  for (const result of [transactions, stockItems, suppliers, items, urgentRequests, purchaseRequests, purchaseOrders, documents]) {
    if (result.error) throw new Error(result.error.message);
  }

  const itemById = new Map((stockItems.data ?? []).map((item) => [item.id, item]));
  let payablesAttention: Awaited<ReturnType<typeof getPayablesAttention>> | null = null;
  let payablesAttentionUnavailable = false;
  if (isOwner || isFinance) {
    try {
      payablesAttention = await getPayablesAttention();
    } catch {
      payablesAttentionUnavailable = true;
      logServerError("AP Aging unavailable; rendering the remaining dashboard.", { source: "dashboard.payablesAttention" });
    }
  }
  let operationsControl: Awaited<ReturnType<typeof getOperationsControlCenterSummary>> | null = null;
  if (needsOperations) {
    try {
      operationsControl = await getOperationsControlCenterSummary();
    } catch {
      logServerError("Operations control summaries unavailable; rendering the remaining dashboard.", { source: "dashboard.operationsControl" });
    }
  }

  return {
    role,
    roleLabel: getRoleDisplayLabel(role),
    scopeLabel: scope.companyWideAccess ? "Company-wide" : scope.branchIds.length ? "Assigned branches" : "Assigned workspace",
    totalItems: items.count ?? 0,
    totalSuppliers: suppliers.count ?? 0,
    lowStockCount: balances.error ? 0 : balances.data?.filter((row) => row.is_low_stock).length ?? 0,
    totalStockValue:
      balances.error ? 0 : balances.data?.reduce((sum, row) => sum + Number(row.current_stock ?? 0), 0) ?? 0,
    lowStockItems: lowStock.error ? [] : lowStock.data ?? [],
    urgentRequests: urgentRequests.data ?? [],
    recentTransactions: (transactions.data ?? []).map((transaction) => ({
      ...transaction,
      item: itemById.get(transaction.item_id) ?? null,
    })),
    pendingApprovals,
    purchaseRequests: purchaseRequests.data ?? [],
    purchaseOrders: purchaseOrders.data ?? [],
    recentDocuments: documents.data ?? [],
    recentActivities,
    notifications: notifications.slice(0, 6),
    today: {
      goodsReceiving: todayReceiving.error ? 0 : todayReceiving.count ?? 0,
      stockCountDue: stockCountDue.error ? 0 : stockCountDue.count ?? 0,
      production: productionSummary?.todayPosted ?? 0,
      deliveries: 0,
    },
    wastageAttention: wastageAttention.error ? 0 : wastageAttention.count ?? 0,
    financeForecast: {
      upcomingPayables: 0,
      pendingPoValue: 0,
      receivingNotInvoiced: receivingFollowup.error ? 0 : receivingFollowup.count ?? 0,
    },
    payablesAttention,
    payablesAttentionUnavailable,
    operationsControl,
    productionSummary,
    outletToday: outletToday.data ?? null,
  };
}
