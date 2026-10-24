import type { UserRole } from "@/types/database";

export type IaGroupId = "operations" | "outlet_management" | "people" | "procurement" | "inventory" | "analytics" | "administration";
export type IaIcon = "activity" | "alert" | "archive" | "arrowLeftRight" | "barChart" | "bookOpen" | "boxes" | "building" | "calendar" | "check" | "clipboard" | "factory" | "file" | "gauge" | "layers" | "list" | "package" | "receipt" | "request" | "rotate" | "scale" | "shopping" | "users" | "userCog" | "upload";

export type IaItem = {
  href: string;
  label: string;
  group: IaGroupId;
  icon: IaIcon;
  permission: string;
  roles: readonly UserRole[];
  keywords?: readonly string[];
  attention?: boolean;
  administrationCard?: string;
  defaultFor?: readonly UserRole[];
};

export const iaGroupLabels: Record<IaGroupId, string> = {
  operations: "Operations",
  outlet_management: "Outlet Management",
  people: "People",
  procurement: "Procurement",
  inventory: "Inventory",
  analytics: "Analytics",
  administration: "Administration",
};

const ALL: readonly UserRole[] = ["super_admin", "people_operations", "finance", "manager", "purchasing", "chef", "kitchen", "outlet_supervisor", "outlet_staff"];
const NON_KITCHEN: readonly UserRole[] = ["super_admin", "people_operations", "finance", "manager", "purchasing", "chef", "outlet_supervisor", "outlet_staff"];
const PROCUREMENT: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing", "chef"];
const INVENTORY: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing", "chef"];
const PRODUCTION: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing", "chef"];
const REPORTS: readonly UserRole[] = ["super_admin", "finance", "manager", "purchasing"];
const MASTER_DATA: readonly UserRole[] = ["super_admin", "finance", "purchasing"];
const OWNER: readonly UserRole[] = ["super_admin"];
const BRANCH_READERS: readonly UserRole[] = ["super_admin", "people_operations", "finance", "manager", "purchasing"];
const SEQUENCE_MANAGERS: readonly UserRole[] = ["super_admin", "finance"];

export const informationArchitecture: readonly IaItem[] = [
  { href: "/dashboard", label: "Dashboard", group: "operations", icon: "gauge", roles: ALL, permission: "dashboard.view", defaultFor: ["super_admin","finance","manager","purchasing","chef", "kitchen","outlet_supervisor","outlet_staff"], keywords: ["home", "alerts", "approvals"] },
  { href: "/production/jobs", label: "Production Jobs", group: "operations", icon: "factory", roles: PRODUCTION, permission: "production.view" },
  { href: "/production/planning", label: "Production Planning", group: "operations", icon: "clipboard", roles: ["super_admin", "manager", "chef"], permission: "production_planning.view" },
  { href: "/asset-management", label: "Asset Management", group: "operations", icon: "boxes", roles: ["super_admin", "manager", "finance", "purchasing", "chef", "kitchen", "outlet_supervisor", "outlet_staff"], permission: "assets.view", keywords: ["assets", "maintenance", "transfers", "checklist"] },
  { href: "/outlet-daily-records", label: "Outlet Daily Records", group: "outlet_management", icon: "clipboard", roles: NON_KITCHEN, permission: "outlet_daily_record.view" },
  { href: "/outlet-packaging", label: "Packaging Stock", group: "outlet_management", icon: "package", roles: ["super_admin", "manager", "purchasing"], permission: "outlet_daily_record.view_all", keywords: ["packaging", "usage", "balance", "warehouse"] },
  { href: "/outlet-compliance", label: "Outlet Compliance", group: "outlet_management", icon: "check", roles: ["super_admin","people_operations","manager","purchasing","chef"], permission: "outlet_compliance.read", attention: true, keywords: ["bomba", "permit", "expiry", "inspection"] },
  { href: "/people", label: "Employees", group: "people", icon: "users", roles: ["super_admin","people_operations","manager"], permission: "people.read", defaultFor: ["people_operations"] },
  { href: "/people/ro", label: "RO Management", group: "people", icon: "rotate", roles: ["super_admin","people_operations","manager"], permission: "comp_time.read", keywords: ["time off", "OT", "balance"] },
  { href: "/attendance", label: "Attendance", group: "people", icon: "calendar", roles: ["super_admin","people_operations","manager","outlet_supervisor","outlet_staff"], permission: "attendance.read", attention: true, keywords: ["roster", "shift", "punch", "NGTeco"] },
  { href: "/attendance/my-schedule", label: "My Schedule", group: "people", icon: "calendar", roles: ["kitchen"], permission: "schedule.read", keywords: ["personal shifts", "schedule"] },

  { href: "/purchase-requests", label: "Purchase Requests", group: "procurement", icon: "request", roles: PROCUREMENT, permission: "purchase_request.read", attention: true },
  { href: "/purchase-orders", label: "Purchase Orders", group: "procurement", icon: "shopping", roles: PROCUREMENT, permission: "purchase_order.read" },
  { href: "/goods-receivings", label: "Goods Receiving", group: "procurement", icon: "check", roles: PROCUREMENT, permission: "goods_receiving.read" },
  { href: "/purchase-returns", label: "Purchase Returns", group: "procurement", icon: "rotate", roles: PROCUREMENT, permission: "purchase_return.view" },
  { href: "/supplier-invoices", label: "Supplier Invoices", group: "procurement", icon: "receipt", roles: ["super_admin", "finance"], permission: "supplier_invoice.view" },
  { href: "/suppliers", label: "Suppliers", group: "procurement", icon: "users", roles: MASTER_DATA, permission: "suppliers.view" },

  { href: "/items", label: "Items / SKU Master", group: "inventory", icon: "layers", roles: MASTER_DATA, permission: "items.view" },
  { href: "/uom-conversions", label: "UOM Conversions", group: "inventory", icon: "scale", roles: MASTER_DATA, permission: "uom_conversions.read" },
  { href: "/products", label: "Products", group: "inventory", icon: "package", roles: PRODUCTION, permission: "production.view" },
  { href: "/recipes", label: "Recipes", group: "inventory", icon: "bookOpen", roles: ["super_admin", "finance"], permission: "recipes.view" },
  { href: "/stock-balance", label: "Stock Balance", group: "inventory", icon: "boxes", roles: INVENTORY, permission: "stock_balance.read", attention: true },
  { href: "/stock-transactions", label: "Movement Ledger", group: "inventory", icon: "activity", roles: INVENTORY, permission: "stock_transactions.read" },
  { href: "/stock-card", label: "Stock Card", group: "inventory", icon: "list", roles: INVENTORY, permission: "stock_transactions.read" },
  { href: "/stock-transfers", label: "Stock Transfers", group: "inventory", icon: "arrowLeftRight", roles: INVENTORY, permission: "stock_transfer.read" },
  { href: "/stock-counts", label: "Stock Count", group: "inventory", icon: "check", roles: INVENTORY, permission: "stock_count.read" },
  { href: "/stock-wastage", label: "Stock Wastage", group: "inventory", icon: "scale", roles: INVENTORY, permission: "stock_wastage.read", attention: true },
  { href: "/low-stock", label: "Low Stock", group: "inventory", icon: "alert", roles: INVENTORY, permission: "low_stock.view" },

  { href: "/reports", label: "Reports", group: "analytics", icon: "barChart", roles: REPORTS, permission: "reports.view" },
  { href: "/activity", label: "Activity Log", group: "analytics", icon: "activity", roles: NON_KITCHEN, permission: "dashboard.view" },

  { href: "/company", label: "Company Profile", group: "administration", icon: "building", roles: OWNER, permission: "company.read", administrationCard: "Maintain legal identity, contact details, logo, and branding." },
  { href: "/branches", label: "Branches / Outlets", group: "administration", icon: "building", roles: BRANCH_READERS, permission: "branches.read", administrationCard: "Review operating branches and outlet structure." },
  { href: "/roles", label: "Roles & Permissions", group: "administration", icon: "userCog", roles: OWNER, permission: "roles.read", administrationCard: "Review system roles and their permissions." },
  { href: "/document-sequences", label: "Document Sequences", group: "administration", icon: "receipt", roles: SEQUENCE_MANAGERS, permission: "document_sequences.read", administrationCard: "Manage controlled document numbering." },
  { href: "/administration/master-data-cleanup", label: "Master Data Cleanup", group: "administration", icon: "check", roles: MASTER_DATA, permission: "items.view", administrationCard: "Review master-data quality issues." },
  { href: "/imports", label: "Imports", group: "administration", icon: "upload", roles: MASTER_DATA, permission: "imports.create", administrationCard: "Import approved master-data templates with validation." },
  { href: "/administration/backups", label: "System Backup", group: "administration", icon: "archive", roles: OWNER, permission: "settings.manage", administrationCard: "Download an owner-only local ZIP export." },
  { href: "/administration/system-health", label: "System Health", group: "administration", icon: "gauge", roles: OWNER, permission: "settings.manage", administrationCard: "Review reliability signals, automatic recovery, and unresolved incidents." },
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
  return informationArchitecture
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
