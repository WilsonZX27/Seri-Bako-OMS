import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SYSTEM_ROLE_CODES, roleDisplayLabels } from "@/lib/roles";
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
  has_staff_role: true;
  created_at: string;
  updated_at: string;
};

export function isMockMode() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true" && !hasSupabaseEnv();
}

export const mockProfile: MockProfile = {
  id: "mock-user-owner",
  company_id: "mock-company",
  full_name: "Mock Owner",
  role: "super_admin" as const,
  role_code: "super_admin" as const,
  has_staff_role: true,
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

export const mockBranches: Row<"branches">[] = [{
  id: "mock-branch-low-stock",
  company_id: mockCompany.id,
  branch_code: "MOCK-OUTLET",
  branch_name: "Mock Outlet",
  branch_type: "outlet",
  phone: null,
  email: null,
  address: null,
  status: "active",
  created_at: mockCompany.created_at,
  updated_at: mockCompany.updated_at,
  created_by: null,
  updated_by: null,
  deleted_at: null,
}];
export const mockSuppliers: Row<"suppliers">[] = [{
  id: "mock-supplier-low-stock",
  company_id: mockCompany.id,
  supplier_code: "MOCK-SUP-001",
  supplier_group: null,
  name: "Mock Supplier with a Long Trading Company Name",
  contact_person: null,
  phone: null,
  email: null,
  address: null,
  payment_terms_days: 30,
  status: "active",
  created_at: mockCompany.created_at,
  updated_at: mockCompany.updated_at,
  deleted_at: null,
}];
export const mockItems: Row<"items">[] = [
  {
    id: "mock-low-stock-long-name",
    company_id: mockCompany.id,
    item_code: "MOCK-LONG-001",
    autocount_code: null,
    item_name: "Extra Long Premium Coconut Milk Ingredient for Outlet Preparation",
    brand_name: null,
    category: "Ingredients",
    purchase_unit: "KG",
    base_unit: "KG",
    conversion_to_base_unit: 1,
    supplier_id: "mock-supplier-low-stock",
    cost: 1234.56,
    safety_stock: 1234.5,
    lead_time_days: 7,
    moq: 12,
    status: "active",
    item_image_url: null,
    created_at: mockCompany.created_at,
    updated_at: mockCompany.updated_at,
    deleted_at: null,
  },
  {
    id: "mock-low-stock-unmapped",
    company_id: mockCompany.id,
    item_code: "MOCK-OUT-002",
    autocount_code: null,
    item_name: "Unmapped packaging carton",
    brand_name: null,
    category: "Packaging",
    purchase_unit: "PCS",
    base_unit: "PCS",
    conversion_to_base_unit: 1,
    supplier_id: null,
    cost: 9.8,
    safety_stock: 250,
    lead_time_days: 0,
    moq: 50,
    status: "active",
    item_image_url: null,
    created_at: mockCompany.created_at,
    updated_at: mockCompany.updated_at,
    deleted_at: null,
  },
];
export const mockRoles: Row<"roles">[] = SYSTEM_ROLE_CODES.map((roleCode) => ({
  id: `mock-role-${roleCode}`,
  company_id: mockCompany.id,
  role_code: roleCode,
  role_name: roleDisplayLabels[roleCode],
  description: null,
  status: "active",
  created_at: mockCompany.created_at,
  updated_at: mockCompany.updated_at,
  created_by: null,
  updated_by: null,
  deleted_at: null,
}));
export const mockPermissions: Row<"permissions">[] = [];
export const mockStaffs: Row<"staffs">[] = [];
export const mockStaffRoles: Row<"staff_roles">[] = [];
export const mockStaffBranches: Row<"staff_branches">[] = [];
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
export const mockSupplierInvoices: Row<"supplier_invoices">[] = [];
export const mockSupplierInvoiceLines: Row<"supplier_invoice_lines">[] = [];
export const mockProducts: Row<"products">[] = [];
export const mockProductPackaging: Row<"product_packaging">[] = [];
export const mockUomConversions: Row<"uom_conversions">[] = [];
export const mockSupplierItems: Row<"supplier_items">[] = [];
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
  return [
    {
      item_id: "mock-low-stock-long-name",
      item_code: "MOCK-LONG-001",
      item_name: "Extra Long Premium Coconut Milk Ingredient for Outlet Preparation",
      category: "Ingredients",
      base_unit: "KG",
      supplier_id: "mock-supplier-low-stock",
      supplier_name: "Mock Supplier with a Long Trading Company Name",
      current_stock: 2.5,
      safety_stock: 1234.5,
      shortage_quantity: 1232,
      moq: 12,
      lead_time_days: 7,
      cost: 1234.56,
    },
    {
      item_id: "mock-low-stock-unmapped",
      item_code: "MOCK-OUT-002",
      item_name: "Unmapped packaging carton",
      category: "Packaging",
      base_unit: "PCS",
      supplier_id: null,
      supplier_name: null,
      current_stock: 0,
      safety_stock: 250,
      shortage_quantity: 250,
      moq: 50,
      lead_time_days: 0,
      cost: 9.8,
    },
  ];
}
