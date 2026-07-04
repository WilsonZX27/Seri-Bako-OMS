import { isMockMode } from "@/lib/mock-mode";
import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";

export type SidebarCounts = Record<string, number>;

async function safeCount(
  query: PromiseLike<{ count?: number | null; error?: { message?: string } | null }>,
) {
  try {
    const result = await query;
    if (result.error) return 0;
    return result.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getSidebarCounts(): Promise<SidebarCounts> {
  if (isMockMode()) {
    return {
      productionJobs: 0,
      outletRequests: 0,
      purchaseRequests: 0,
      purchaseOrders: 0,
      stockBalanceAlerts: 0,
      stockTransfers: 0,
      stockWastage: 0,
      staffManagement: 0,
    };
  }

  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const [
    productionJobs,
    outletRequests,
    purchaseRequests,
    managerApprovals,
    adminReview,
    financeReview,
    purchaseOrders,
    supplierSending,
    invoices,
    stockBalanceAlerts,
    stockCounts,
    stockTransfers,
    stockWastage,
    dispatchBoard,
    staffManagement,
  ] = await Promise.all([
    safeCount(db.from("production_jobs").select("id", { count: "exact", head: true }).in("status", ["submitted", "approved"]).is("deleted_at", null)),
    safeCount(db.from("purchase_requests").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted", "manager_review", "admin_review"]).is("deleted_at", null)),
    safeCount(db.from("purchase_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "manager_review", "admin_review", "finance_review", "approved"]).is("deleted_at", null)),
    safeCount(db.from("purchase_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "manager_review"]).is("deleted_at", null)),
    safeCount(db.from("purchase_requests").select("id", { count: "exact", head: true }).eq("status", "admin_review").is("deleted_at", null)),
    safeCount(db.from("purchase_requests").select("id", { count: "exact", head: true }).eq("status", "finance_review").is("deleted_at", null)),
    safeCount(db.from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["draft", "pending_approval", "approved", "sent", "partial_received"]).is("deleted_at", null)),
    safeCount(db.from("purchase_orders").select("id", { count: "exact", head: true }).eq("status", "approved").is("deleted_at", null)),
    safeCount(supabase.from("documents").select("id", { count: "exact", head: true }).ilike("document_type", "%invoice%")),
    safeCount(supabase.from("low_stock_items").select("item_id", { count: "exact", head: true })),
    safeCount(db.from("stock_counts").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted", "reviewed", "approved"]).is("deleted_at", null)),
    safeCount(db.from("stock_transfers").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted", "in_transit"]).is("deleted_at", null)),
    safeCount(db.from("stock_wastage").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted", "approved"]).is("deleted_at", null)),
    safeCount(db.from("goods_receivings").select("id", { count: "exact", head: true }).in("status", ["draft", "posted"]).is("deleted_at", null)),
    safeCount(supabase.from("staffs").select("id", { count: "exact", head: true }).in("invitation_status", ["invited", "pending"])),
  ]);

  return {
    productionJobs,
    outletRequests,
    dispatchBoard,
    purchaseRequests,
    managerApprovals,
    adminReview,
    financeReview,
    purchaseOrders,
    supplierSending,
    invoices,
    stockBalanceAlerts,
    stockCounts,
    stockTransfers,
    stockWastage,
    staffManagement,
  };
}
