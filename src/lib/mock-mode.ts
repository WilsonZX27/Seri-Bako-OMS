import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Database, UserRole } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];
type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
type ViewName = keyof Database["public"]["Views"];
type ViewRow<T extends ViewName> = Database["public"]["Views"][T]["Row"];

type MockProfile = {
  id: string;
  company_id: string;
  full_name: string;
  role: UserRole;
  role_code: UserRole;
  created_at: string;
  updated_at: string;
};

export function isMockMode() {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true" && !hasSupabaseEnv();
}

export const mockProfile: MockProfile = {
  id: "mock-user-admin",
  company_id: "mock-company",
  full_name: "Mock Admin",
  role: "admin" as const,
  role_code: "admin" as const,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

export const mockCompany: Row<"companies"> = {
  id: "mock-company",
  company_code: "MOCK",
  company_name: "Mock Company",
  registration_no: null,
  tax_no: null,
  phone: null,
  email: null,
  address: null,
  logo_url: null,
  logo_path: null,
  status: "active" as const,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
  created_by: null,
  updated_by: null,
  deleted_at: null,
};

export const mockBranches: Row<"branches">[] = [];
export const mockSuppliers: Row<"suppliers">[] = [];
export const mockItems: Row<"items">[] = [];
export const mockLocations: Row<"locations">[] = [];
export const mockRoles: Row<"roles">[] = [];
export const mockPermissions: Row<"permissions">[] = [];
export const mockStaffs: Row<"staffs">[] = [];
export const mockStaffRoles: Row<"staff_roles">[] = [];
export const mockStaffBranches: Row<"staff_branches">[] = [];
export const mockStaffLocations: Row<"staff_locations">[] = [];
export const mockDocumentSequences: Row<"document_sequences">[] = [];
export const mockDocuments: Row<"documents">[] = [];
export const mockDocumentComments: Row<"document_comments">[] = [];
export const mockDocumentRevisions: Row<"document_revisions">[] = [];
export const mockAttachments: Row<"attachments">[] = [];
export const mockApprovals: Row<"approvals">[] = [];
export const mockApprovalSteps: Row<"approval_steps">[] = [];
export const mockPurchaseRequests: Row<"purchase_requests">[] = [];
export const mockPurchaseRequestLines: Row<"purchase_request_lines">[] = [];
export const mockPurchaseOrders: Row<"purchase_orders">[] = [];
export const mockPurchaseOrderLines: Row<"purchase_order_lines">[] = [];
export const mockGoodsReceivings: Row<"goods_receivings">[] = [];
export const mockGoodsReceivingLines: Row<"goods_receiving_lines">[] = [];
export const mockProducts: Row<"products">[] = [];
export const mockProductPackaging: Row<"product_packaging">[] = [];
export const mockUomConversions: Row<"uom_conversions">[] = [];
export const mockSupplierItems: Row<"supplier_items">[] = [];
export const mockBarcodeMappings: Row<"barcode_mappings">[] = [];
export const mockRecipes: Row<"recipes">[] = [];
export const mockRecipeLines: Row<"recipe_lines">[] = [];
export const mockRecipeCostSnapshots: Row<"recipe_cost_snapshots">[] = [];
export const mockStockCounts: Row<"stock_counts">[] = [];
export const mockStockCountLines: Row<"stock_count_lines">[] = [];
export const mockStockTransfers: Row<"stock_transfers">[] = [];
export const mockStockTransferLines: Row<"stock_transfer_lines">[] = [];
export const mockStockWastage: Row<"stock_wastage">[] = [];
export const mockStockWastageLines: Row<"stock_wastage_lines">[] = [];
export const mockStockTransactions: Row<"stock_transactions">[] = [];

export function getMockStockBalances(): ViewRow<"stock_balances_view">[] {
  return [];
}

export function getMockLowStockItems(): ViewRow<"low_stock_items">[] {
  return [];
}
