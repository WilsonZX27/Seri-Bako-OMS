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

const allRoles: UserRole[] = ["admin", "finance", "purchasing", "kitchen", "viewer"];
const opsRoles: UserRole[] = ["admin", "kitchen", "purchasing"];
const procurementRoles: UserRole[] = ["admin", "purchasing", "finance", "kitchen"];
const inventoryRoles: UserRole[] = ["admin", "kitchen", "purchasing", "finance"];
const reportsRoles: UserRole[] = ["admin", "finance", "purchasing"];

export const navGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Gauge,
    roles: "all",
    items: [{ href: "/dashboard", label: "Dashboard", icon: Gauge, roles: "all", keywords: ["home", "quick tools"] }],
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
    roles: ["admin", "kitchen"],
    items: [{ href: "/production", label: "Production", icon: Factory, roles: ["admin", "kitchen"], keywords: ["recipes", "production jobs"] }],
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
    roles: ["admin"],
    items: [{ href: "/settings", label: "Settings", icon: Settings, roles: ["admin"], keywords: ["company", "staff", "roles"] }],
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
