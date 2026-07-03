import {
  Boxes,
  ClipboardList,
  Factory,
  FileText,
  Gauge,
  LayoutGrid,
  Settings,
  ShoppingCart,
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
};

export type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[] | "all";
  items: NavItem[];
};

const ownerRoles: UserRole[] = ["super_admin", "admin"];
const administratorRoles: UserRole[] = ["operations_admin", ...ownerRoles];
const allRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "finance", "purchasing", "kitchen_staff", "kitchen", "viewer"];
const opsRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "kitchen_staff", "kitchen", "purchasing"];
const procurementRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "purchasing", "finance", "kitchen_staff", "kitchen"];
const inventoryRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "kitchen_staff", "kitchen", "purchasing", "finance"];
const reportsRoles: UserRole[] = ["super_admin", "operations_admin", "admin", "manager", "finance", "purchasing"];

export const navGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Gauge,
    roles: "all",
    items: [{ href: "/dashboard", label: "Dashboard", icon: Gauge, roles: "all", keywords: ["home", "alerts", "approvals"] }],
  },
  {
    id: "daily",
    label: "Daily Operations",
    icon: LayoutGrid,
    roles: opsRoles,
    items: [{ href: "/daily-operations", label: "Daily Operations", icon: LayoutGrid, roles: opsRoles, keywords: ["count", "receive", "wastage", "scan"] }],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    roles: procurementRoles,
    items: [{ href: "/procurement", label: "Procurement", icon: ShoppingCart, roles: procurementRoles, keywords: ["purchase", "supplier", "receiving"] }],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Boxes,
    roles: inventoryRoles,
    items: [{ href: "/inventory", label: "Inventory", icon: Boxes, roles: inventoryRoles, keywords: ["stock", "ledger", "barcode"] }],
  },
  {
    id: "production",
    label: "Production",
    icon: Factory,
    roles: ["super_admin", "operations_admin", "admin", "manager", "kitchen_staff", "kitchen"],
    items: [{ href: "/production", label: "Production", icon: Factory, roles: ["super_admin", "operations_admin", "admin", "manager", "kitchen_staff", "kitchen"], keywords: ["recipes", "production jobs"] }],
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    roles: allRoles,
    items: [{ href: "/documents", label: "Documents", icon: FileText, roles: allRoles, keywords: ["approvals", "attachments"] }],
  },
  {
    id: "reports",
    label: "Reports",
    icon: ClipboardList,
    roles: reportsRoles,
    items: [{ href: "/reports", label: "Reports", icon: ClipboardList, roles: reportsRoles, keywords: ["summary", "approval", "purchase"] }],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    roles: administratorRoles,
    items: [{ href: "/settings", label: "Settings", icon: Settings, roles: administratorRoles, keywords: ["company", "staff", "roles"] }],
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
  { href: "/goods-receivings", label: "Goods Receiving", group: "Daily Operations", keywords: ["grn", "receive"] },
  { href: "/stock-counts", label: "Stock Counts", group: "Daily Operations", keywords: ["count", "branch"] },
  { href: "/stock-transfers", label: "Stock Transfers", group: "Daily Operations", keywords: ["transfer", "branch"] },
  { href: "/stock-wastage", label: "Stock Wastage", group: "Daily Operations", keywords: ["waste", "branch"] },
  { href: "/items", label: "Items", group: "Inventory", keywords: ["barcode", "sku"] },
  { href: "/stock-balance", label: "Stock Balance", group: "Inventory", keywords: ["branch", "location", "ledger"] },
  { href: "/stock-card", label: "Stock Card", group: "Inventory", keywords: ["ledger", "movement"] },
  { href: "/company", label: "Company", group: "Settings", keywords: ["logo", "branding"] },
  { href: "/branches", label: "Branches", group: "Settings", keywords: ["default store", "location"] },
  { href: "/locations", label: "Locations", group: "Settings", keywords: ["store", "default"] },
  { href: "/staffs", label: "Staff", group: "Settings", keywords: ["invite", "roles"] },
  { href: "/roles", label: "Roles", group: "Settings", keywords: ["permission"] },
  { href: "/settings/backups", label: "System Backup", group: "Settings", keywords: ["backup", "export", "owner"] },
  { href: "/account", label: "My Profile", group: "Account", keywords: ["profile", "password", "avatar"] },
] as const;
