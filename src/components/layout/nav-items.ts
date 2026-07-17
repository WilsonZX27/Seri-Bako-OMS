import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Factory,
  Gauge,
  GitPullRequest,
  PackageCheck,
  MapPin,
  ListChecks,
  ReceiptText,
  Scale,
  RotateCcw,
  ShoppingCart,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/types/database";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[] | "all";
  keywords?: string[];
  disabled?: boolean;
  badgeKey?: string;
  attention?: boolean;
  permission?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  icon?: LucideIcon;
  roles?: UserRole[] | "all";
  items: NavItem[];
};

const ownerRoles: UserRole[] = ["super_admin", "admin"];
const administratorRoles: UserRole[] = ["operations_admin", ...ownerRoles];
const allRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "finance", "purchasing", "kitchen_staff", "kitchen", "viewer"];
const procurementRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "purchasing", "finance", "kitchen_staff", "kitchen"];
const inventoryRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "kitchen_staff", "kitchen", "purchasing", "finance"];
const reportsRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "finance", "purchasing"];
const masterDataRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "purchasing"];
const productionRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "kitchen_staff", "kitchen"];

export const navGroups: NavGroup[] = [
  {
    id: "operations",
    label: "Operations",
    roles: "all",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge, roles: "all", permission: "dashboard.view", keywords: ["home", "alerts", "approvals"] },
      { href: "/production/jobs", label: "Production Jobs", icon: Factory, roles: productionRoles, permission: "production.view", badgeKey: "productionJobs", keywords: ["production", "jobs"] },
      { href: "/outlet-daily-records", label: "Outlet Daily Records", icon: ClipboardList, roles: allRoles, permission: "outlet_daily_record.view", keywords: ["outlet", "receiving", "wastage", "daily"] },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    roles: procurementRoles,
    items: [
      { href: "/purchase-requests", label: "Purchase Requests", icon: GitPullRequest, roles: procurementRoles, permission: "purchase_request.read", badgeKey: "purchaseRequests", attention: true, keywords: ["pr", "request"] },
      { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: procurementRoles, permission: "purchase_order.read", badgeKey: "purchaseOrders", keywords: ["po", "supplier"] },
      { href: "/goods-receivings", label: "Goods Receiving", icon: ClipboardCheck, roles: procurementRoles, permission: "goods_receiving.read", badgeKey: "dispatchBoard", keywords: ["grn", "receive"] },
      { href: "/purchase-returns", label: "Purchase Returns", icon: RotateCcw, roles: procurementRoles, permission: "purchase_return.view", keywords: ["return", "supplier"] },
      { href: "/supplier-invoices", label: "Supplier Invoices", icon: ReceiptText, roles: ["super_admin", "operations_admin", "admin", "finance", "purchasing", "manager"], permission: "supplier_invoice.view", badgeKey: "invoices", keywords: ["invoice", "ap", "payment"] },
      { href: "/suppliers", label: "Suppliers", icon: Users, roles: masterDataRoles, permission: "suppliers.view", keywords: ["suppliers"] },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    roles: inventoryRoles,
    items: [
      { href: "/items", label: "Items / SKU Master", icon: PackageCheck, roles: masterDataRoles, permission: "items.view", keywords: ["items", "sku"] },
      { href: "/products", label: "Products", icon: Boxes, roles: productionRoles, permission: "production.view", keywords: ["finished goods", "products"] },
      { href: "/recipes", label: "Recipes", icon: ClipboardList, roles: productionRoles, permission: "recipes.view", keywords: ["recipes", "bom", "production"] },
      { href: "/stock-balance", label: "Stock Balance", icon: Boxes, roles: inventoryRoles, permission: "stock_balance.read", badgeKey: "stockBalanceAlerts", attention: true, keywords: ["stock", "balance"] },
      { href: "/stock-transactions", label: "Movement Ledger", icon: Activity, roles: inventoryRoles, permission: "stock_transactions.read", keywords: ["ledger", "movement"] },
      { href: "/stock-transfers", label: "Stock Transfers", icon: PackageCheck, roles: inventoryRoles, permission: "stock_transfer.read", badgeKey: "stockTransfers", keywords: ["transfer"] },
      { href: "/stock-counts", label: "Stock Count", icon: ClipboardCheck, roles: inventoryRoles, permission: "stock_count.read", badgeKey: "stockCounts", keywords: ["count"] },
      { href: "/stock-wastage", label: "Stock Wastage", icon: Scale, roles: inventoryRoles, permission: "stock_wastage.read", badgeKey: "stockWastage", attention: true, keywords: ["wastage"] },
      { href: "/low-stock", label: "Low Stock", icon: AlertTriangle, roles: inventoryRoles, permission: "low_stock.view", keywords: ["reorder", "low stock"] },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    roles: allRoles,
    items: [
      { href: "/reports", label: "Reports", icon: ClipboardList, roles: reportsRoles, permission: "reports.view", keywords: ["summary", "approval", "purchase"] },
      { href: "/activity", label: "Activity Log", icon: Activity, roles: ["super_admin", "admin", "operations_admin", "manager", "finance", "purchasing"], permission: "reports.view", keywords: ["activity", "log"] },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    roles: administratorRoles,
    items: [
      { href: "/company", label: "Company Profile", icon: Building2, roles: administratorRoles, permission: "company.read", keywords: ["company", "logo"] },
      { href: "/branches", label: "Branches / Outlets", icon: Building2, roles: administratorRoles, permission: "branches.read", keywords: ["branches", "outlets"] },
      { href: "/locations", label: "Locations", icon: MapPin, roles: administratorRoles, permission: "locations.read", keywords: ["storage", "locations"] },
      { href: "/administration/master-data-cleanup", label: "Master Data Cleanup", icon: ListChecks, roles: [...administratorRoles, "manager"], permission: "items.view", keywords: ["master data", "cleanup", "duplicates", "data quality"] },
      { href: "/roles", label: "Users & Roles", icon: UserCog, roles: administratorRoles, permission: "roles.read", badgeKey: "staffManagement", keywords: ["roles", "permissions", "staff", "users"] },
      { href: "/staffs", label: "Staff Management", icon: Users, roles: administratorRoles, permission: "staffs.read", badgeKey: "staffManagement", keywords: ["staff", "users", "invite"] },
      { href: "/administration/imports", label: "Import Data", icon: ClipboardList, roles: administratorRoles, permission: "imports.create", keywords: ["import", "csv", "xlsx", "setup"] },
    ],
  },
];

function roleAllowed(roles: NavItem["roles"] | NavGroup["roles"], role: UserRole) {
  return roles === "all" || !roles || roles.includes(role);
}

export function getVisibleNavGroups(role: UserRole, permissionMap?: Record<string, boolean>) {
  return navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.permission && permissionMap ? permissionMap[item.permission] : roleAllowed(item.roles, role)) }))
    .filter((group) => group.items.length > 0);
}

export const navPermissionCodes = Array.from(new Set(navGroups.flatMap((group) => group.items.flatMap((item) => item.permission ? [item.permission] : []))));

export function getFlatNavItems(role: UserRole) {
  return getVisibleNavGroups(role).flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));
}

export const navItems = getFlatNavItems("admin");

export const searchableNavItems = [
  ...navGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))),
  { href: "/purchase-requests/new", label: "New Purchase Request", group: "Procurement", permission: "purchase_request.create", keywords: ["request", "needed by", "priority"] },
  { href: "/outlet-daily-records/new", label: "New Outlet Daily Record", group: "Operations", permission: "outlet_daily_record.create", keywords: ["outlet", "morning", "wastage"] },
  { href: "/account", label: "My Profile", group: "Account", keywords: ["profile", "password", "avatar"] },
] as const;
