import {
  Activity,
  Boxes,
  Building2,
  ClipboardList,
  ClipboardCheck,
  Factory,
  Gauge,
  GitPullRequest,
  PackageCheck,
  ReceiptText,
  Scale,
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
      { href: "/dashboard", label: "Dashboard", icon: Gauge, roles: "all", keywords: ["home", "alerts", "approvals"] },
      { href: "/production/jobs", label: "Production Jobs", icon: Factory, roles: productionRoles, badgeKey: "productionJobs", keywords: ["production", "jobs"] },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    roles: procurementRoles,
    items: [
      { href: "/purchase-requests", label: "Purchase Requests", icon: GitPullRequest, roles: procurementRoles, badgeKey: "purchaseRequests", attention: true, keywords: ["pr", "request"] },
      { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: procurementRoles, badgeKey: "purchaseOrders", keywords: ["po", "supplier"] },
      { href: "/goods-receivings", label: "Goods Receiving", icon: ClipboardCheck, roles: procurementRoles, badgeKey: "dispatchBoard", keywords: ["grn", "receive"] },
      { href: "/supplier-invoices", label: "Supplier Invoices", icon: ReceiptText, roles: ["super_admin", "operations_admin", "admin", "finance", "purchasing", "manager"], badgeKey: "invoices", keywords: ["invoice", "ap", "payment"] },
      { href: "/suppliers", label: "Suppliers", icon: Users, roles: masterDataRoles, keywords: ["suppliers"] },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    roles: inventoryRoles,
    items: [
      { href: "/stock-balance", label: "Stock Balance", icon: Boxes, roles: inventoryRoles, badgeKey: "stockBalanceAlerts", attention: true, keywords: ["stock", "balance"] },
      { href: "/stock-counts", label: "Stock Count", icon: ClipboardCheck, roles: inventoryRoles, badgeKey: "stockCounts", keywords: ["count"] },
      { href: "/stock-transfers", label: "Stock Transfers", icon: PackageCheck, roles: inventoryRoles, badgeKey: "stockTransfers", keywords: ["transfer"] },
      { href: "/stock-wastage", label: "Stock Wastage", icon: Scale, roles: inventoryRoles, badgeKey: "stockWastage", attention: true, keywords: ["wastage"] },
      { href: "/stock-transactions", label: "Movement Ledger", icon: Activity, roles: inventoryRoles, keywords: ["ledger", "movement"] },
      { href: "/items", label: "Items / SKU Master", icon: PackageCheck, roles: masterDataRoles, keywords: ["items", "sku"] },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    roles: allRoles,
    items: [
      { href: "/reports", label: "Reports", icon: ClipboardList, roles: reportsRoles, keywords: ["summary", "approval", "purchase"] },
      { href: "/activity", label: "Activity Log", icon: Activity, roles: ["super_admin", "admin", "operations_admin", "manager", "finance", "purchasing"], keywords: ["activity", "log"] },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    roles: administratorRoles,
    items: [
      { href: "/company", label: "Company Profile", icon: Building2, roles: administratorRoles, keywords: ["company", "logo"] },
      { href: "/roles", label: "Users & Roles", icon: UserCog, roles: administratorRoles, badgeKey: "staffManagement", keywords: ["roles", "permissions", "staff", "users"] },
      { href: "/staffs", label: "Staff Management", icon: Users, roles: administratorRoles, badgeKey: "staffManagement", keywords: ["staff", "users", "invite"] },
    ],
  },
];

function roleAllowed(roles: NavItem["roles"] | NavGroup["roles"], role: UserRole) {
  return roles === "all" || !roles || roles.includes(role);
}

export function getVisibleNavGroups(role: UserRole) {
  return navGroups
    .filter((group) => roleAllowed(group.roles, role))
    .map((group) => ({ ...group, items: group.items.filter((item) => roleAllowed(item.roles, role)) }))
    .filter((group) => group.items.length > 0);
}

export function getFlatNavItems(role: UserRole) {
  return getVisibleNavGroups(role).flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));
}

export const navItems = getFlatNavItems("admin");

export const searchableNavItems = [
  ...navItems,
  { href: "/purchase-requests", label: "Purchase Requests", group: "Procurement", keywords: ["pr", "urgent", "priority"] },
  { href: "/purchase-requests/new", label: "New Purchase Request", group: "Procurement", keywords: ["request", "needed by", "priority"] },
  { href: "/purchase-orders", label: "Purchase Orders", group: "Procurement", keywords: ["po", "supplier"] },
  { href: "/goods-receivings", label: "Goods Receiving", group: "Procurement", keywords: ["grn", "receive"] },
  { href: "/supplier-invoices", label: "Supplier Invoices", group: "Procurement", keywords: ["invoice", "ap", "payment"] },
  { href: "/suppliers", label: "Suppliers", group: "Procurement", keywords: ["supplier"] },
  { href: "/stock-counts", label: "Stock Count", group: "Inventory", keywords: ["count", "branch"] },
  { href: "/stock-transfers", label: "Stock Transfers", group: "Inventory", keywords: ["transfer", "branch"] },
  { href: "/stock-wastage", label: "Stock Wastage", group: "Inventory", keywords: ["waste", "branch"] },
  { href: "/items", label: "Items / SKU Master", group: "Inventory", keywords: ["sku"] },
  { href: "/stock-balance", label: "Stock Balance", group: "Inventory", keywords: ["branch", "location", "ledger"] },
  { href: "/reports", label: "Reports", group: "Analytics", keywords: ["summary", "approval", "purchase"] },
  { href: "/activity", label: "Activity Log", group: "Analytics", keywords: ["activity", "log"] },
  { href: "/company", label: "Company Profile", group: "Administration", keywords: ["logo", "branding"] },
  { href: "/roles", label: "Users & Roles", group: "Administration", keywords: ["permission", "staff", "users"] },
  { href: "/account", label: "My Profile", group: "Account", keywords: ["profile", "password", "avatar"] },
] as const;
