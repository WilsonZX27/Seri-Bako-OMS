import type { UserRole } from "@/types/database";

export type IaGroupId = "operations" | "procurement" | "inventory" | "analytics" | "administration";
export type IaIcon = "activity" | "alert" | "archive" | "boxes" | "building" | "check" | "clipboard" | "factory" | "gauge" | "receipt" | "request" | "rotate" | "scale" | "shopping" | "users" | "userCog" | "upload";

export type IaItem = {
  href: string;
  label: string;
  group: IaGroupId;
  icon: IaIcon;
  permission: string;
  roles: readonly UserRole[];
  keywords?: readonly string[];
  badgeKey?: string;
  attention?: boolean;
  administrationCard?: string;
  defaultFor?: readonly UserRole[];
};

export const iaGroupLabels: Record<IaGroupId, string> = {
  operations: "Operations",
  procurement: "Procurement",
  inventory: "Inventory",
  analytics: "Analytics",
  administration: "Administration",
};

const ALL: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing", "kitchen", "outlet_staff"];
const PROCUREMENT: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing", "kitchen"];
const INVENTORY: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing", "kitchen"];
const PRODUCTION: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing", "kitchen"];
const REPORTS: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing"];
const MASTER_DATA: readonly UserRole[] = ["super_admin", "finance", "purchasing"];
const OWNER: readonly UserRole[] = ["super_admin"];
const BRANCH_READERS: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing"];
const STAFF_MANAGERS: readonly UserRole[] = ["super_admin", "finance"];

export const informationArchitecture: readonly IaItem[] = [
  { href: "/dashboard", label: "Dashboard", group: "operations", icon: "gauge", roles: ALL, permission: "dashboard.view", defaultFor: ALL, keywords: ["home", "alerts", "approvals"] },
  { href: "/production/jobs", label: "Production Jobs", group: "operations", icon: "factory", roles: PRODUCTION, permission: "production.view", badgeKey: "productionJobs" },
  { href: "/outlet-daily-records", label: "Outlet Daily Records", group: "operations", icon: "clipboard", roles: ALL, permission: "outlet_daily_record.view" },

  { href: "/purchase-requests", label: "Purchase Requests", group: "procurement", icon: "request", roles: PROCUREMENT, permission: "purchase_request.read", badgeKey: "purchaseRequests", attention: true },
  { href: "/purchase-orders", label: "Purchase Orders", group: "procurement", icon: "shopping", roles: PROCUREMENT, permission: "purchase_order.read", badgeKey: "purchaseOrders" },
  { href: "/goods-receivings", label: "Goods Receiving", group: "procurement", icon: "check", roles: PROCUREMENT, permission: "goods_receiving.read", badgeKey: "dispatchBoard" },
  { href: "/purchase-returns", label: "Purchase Returns", group: "procurement", icon: "rotate", roles: PROCUREMENT, permission: "purchase_return.view" },
  { href: "/supplier-invoices", label: "Supplier Invoices", group: "procurement", icon: "receipt", roles: ["super_admin", "finance", "purchasing"], permission: "supplier_invoice.view", badgeKey: "invoices" },
  { href: "/suppliers", label: "Suppliers", group: "procurement", icon: "users", roles: MASTER_DATA, permission: "suppliers.view" },

  { href: "/items", label: "Items / SKU Master", group: "inventory", icon: "boxes", roles: MASTER_DATA, permission: "items.view" },
  { href: "/uom-conversions", label: "UOM Conversions", group: "inventory", icon: "scale", roles: MASTER_DATA, permission: "uom_conversions.read" },
  { href: "/products", label: "Products", group: "inventory", icon: "boxes", roles: PRODUCTION, permission: "production.view" },
  { href: "/recipes", label: "Recipes", group: "inventory", icon: "clipboard", roles: ["super_admin", "finance"], permission: "recipes.view" },
  { href: "/stock-balance", label: "Stock Balance", group: "inventory", icon: "boxes", roles: INVENTORY, permission: "stock_balance.read", badgeKey: "stockBalanceAlerts", attention: true },
  { href: "/stock-transactions", label: "Movement Ledger", group: "inventory", icon: "activity", roles: INVENTORY, permission: "stock_transactions.read" },
  { href: "/stock-transfers", label: "Stock Transfers", group: "inventory", icon: "boxes", roles: INVENTORY, permission: "stock_transfer.read", badgeKey: "stockTransfers" },
  { href: "/stock-counts", label: "Stock Count", group: "inventory", icon: "check", roles: INVENTORY, permission: "stock_count.read", badgeKey: "stockCounts" },
  { href: "/stock-wastage", label: "Stock Wastage", group: "inventory", icon: "scale", roles: INVENTORY, permission: "stock_wastage.read", badgeKey: "stockWastage", attention: true },
  { href: "/low-stock", label: "Low Stock", group: "inventory", icon: "alert", roles: INVENTORY, permission: "low_stock.view" },

  { href: "/reports", label: "Reports", group: "analytics", icon: "clipboard", roles: REPORTS, permission: "reports.view" },
  { href: "/activity", label: "Activity Log", group: "analytics", icon: "activity", roles: REPORTS, permission: "reports.view" },

  { href: "/company", label: "Company Profile", group: "administration", icon: "building", roles: OWNER, permission: "company.read", administrationCard: "Maintain legal identity, contact details, logo, and branding." },
  { href: "/branches", label: "Branches / Outlets", group: "administration", icon: "building", roles: BRANCH_READERS, permission: "branches.read", administrationCard: "Review operating branches and outlet structure." },
  { href: "/staffs", label: "Users & Staff", group: "administration", icon: "users", roles: STAFF_MANAGERS, permission: "staffs.read", badgeKey: "staffManagement", administrationCard: "Manage staff status, role, default branch, and branch access." },
  { href: "/roles", label: "Roles & Permissions", group: "administration", icon: "userCog", roles: OWNER, permission: "roles.read", administrationCard: "Review the six fixed system roles and their permissions." },
  { href: "/document-sequences", label: "Document Sequences", group: "administration", icon: "receipt", roles: STAFF_MANAGERS, permission: "document_sequences.read", administrationCard: "Manage controlled document numbering." },
  { href: "/administration/master-data-cleanup", label: "Master Data Cleanup", group: "administration", icon: "check", roles: MASTER_DATA, permission: "items.view", administrationCard: "Review master-data quality issues." },
  { href: "/imports", label: "Imports", group: "administration", icon: "upload", roles: MASTER_DATA, permission: "imports.create", administrationCard: "Import approved master-data templates with validation." },
  { href: "/administration/backups", label: "System Backup", group: "administration", icon: "archive", roles: OWNER, permission: "settings.manage", administrationCard: "Download an owner-only local ZIP export." },
] as const;

export function isIaItemVisible(item: IaItem, role: UserRole, permissionMap?: Record<string, boolean>) {
  return item.roles.includes(role) && (!permissionMap || permissionMap[item.permission] === true);
}

export function getVisibleIaItems(role: UserRole, permissionMap?: Record<string, boolean>) {
  return informationArchitecture.filter((item) => isIaItemVisible(item, role, permissionMap));
}

export function getDefaultLandingRoute(role: UserRole, permissionMap?: Record<string, boolean>) {
  return getLandingIaItems(role, permissionMap)[0]?.href ?? "/access-status?reason=no-permitted-route";
}

export function getLandingIaItems(role: UserRole, permissionMap?: Record<string, boolean>) {
  return getVisibleIaItems(role, permissionMap).sort((a, b) => Number(Boolean(b.defaultFor?.includes(role))) - Number(Boolean(a.defaultFor?.includes(role))));
}

export function getIaItemForPath(pathname: string) {
  return informationArchitecture.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
