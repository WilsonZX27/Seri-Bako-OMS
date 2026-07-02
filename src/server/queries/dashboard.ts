import { createClient } from "@/lib/supabase/server";
import {
  getMockLowStockItems,
  getMockStockBalances,
  isMockMode,
  mockItems,
  mockDocuments,
  mockPurchaseOrders,
  mockPurchaseRequests,
  mockStockTransactions,
  mockSuppliers,
} from "@/lib/mock-mode";

export async function getDashboardSummary() {
  if (isMockMode()) {
    const balances = getMockStockBalances();
    const itemById = new Map<string, (typeof mockItems)[number]>(mockItems.map((item) => [item.id, item]));

    return {
      totalItems: mockItems.length,
      totalSuppliers: mockSuppliers.length,
      lowStockCount: balances.filter((row) => row.is_low_stock).length,
      totalStockValue: balances.reduce((sum, row) => sum + Number(row.current_stock ?? 0), 0),
      lowStockItems: getMockLowStockItems().slice(0, 5),
      pendingApprovals: mockDocuments.filter((document) => document.approval_status === "pending").slice(0, 5),
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
        { id: "note-1", title: "Stock count due tonight", message: "Dry Store and Freezer counts are due before closing." },
        { id: "note-2", title: "Invoice pending matching", message: "INV-00031 is waiting for receiving confirmation." },
      ],
      today: {
        goodsReceiving: 2,
        stockCountDue: 3,
        production: 4,
        deliveries: 2,
      },
      recentTransactions: mockStockTransactions.slice(0, 6).map((transaction) => ({
        ...transaction,
        item: itemById.get(transaction.item_id) ?? null,
      })),
    };
  }

  const supabase = await createClient();
  const [balances, lowStock, transactions, stockItems, suppliers, items, urgentRequests, purchaseRequests, purchaseOrders, pendingApprovals, documents, activities] = await Promise.all([
    supabase.from("stock_balances_view").select("item_id, current_stock, is_low_stock"),
    supabase.from("low_stock_items").select("*").limit(5),
    supabase
      .from("stock_transactions")
      .select("id, item_id, transaction_date, transaction_type, quantity_in, quantity_out")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("items").select("id, item_name, base_unit"),
    supabase.from("suppliers").select("id", { count: "exact", head: true }),
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase
      .from("purchase_requests")
      .select("id, request_no, status, priority, needed_by_date")
      .in("priority", ["urgent", "critical"])
      .is("deleted_at", null)
      .order("needed_by_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase.from("purchase_requests").select("id, request_no, status, priority").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5),
    supabase.from("purchase_orders").select("id, po_no, status, priority").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5),
    supabase.from("documents").select("id, document_no, title, approval_status").eq("approval_status", "pending").order("updated_at", { ascending: false }).limit(5),
    supabase.from("documents").select("id, document_no, document_type").order("updated_at", { ascending: false }).limit(6),
    supabase.from("activity_logs").select("id, message, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  for (const result of [balances, lowStock, transactions, stockItems, suppliers, items, urgentRequests, purchaseRequests, purchaseOrders, pendingApprovals, documents, activities]) {
    if (result.error) throw new Error(result.error.message);
  }

  const itemById = new Map((stockItems.data ?? []).map((item) => [item.id, item]));

  return {
    totalItems: items.count ?? 0,
    totalSuppliers: suppliers.count ?? 0,
    lowStockCount: balances.data?.filter((row) => row.is_low_stock).length ?? 0,
    totalStockValue:
      balances.data?.reduce((sum, row) => sum + Number(row.current_stock ?? 0), 0) ?? 0,
    lowStockItems: lowStock.data ?? [],
    urgentRequests: urgentRequests.data ?? [],
    recentTransactions: (transactions.data ?? []).map((transaction) => ({
      ...transaction,
      item: itemById.get(transaction.item_id) ?? null,
    })),
    pendingApprovals: pendingApprovals.data ?? [],
    purchaseRequests: purchaseRequests.data ?? [],
    purchaseOrders: purchaseOrders.data ?? [],
    recentDocuments: documents.data ?? [],
    recentActivities: activities.data ?? [],
    notifications: [],
    today: {
      goodsReceiving: 0,
      stockCountDue: 0,
      production: 0,
      deliveries: 0,
    },
  };
}
