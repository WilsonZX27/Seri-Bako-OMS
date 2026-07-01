import {
  AlertTriangle,
  Barcode,
  Boxes,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileDigit,
  FileText,
  Gauge,
  MapPin,
  Package,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  Scale,
  ScanLine,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  UserCog,
  Users,
  WalletCards,
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
const adminOnly: UserRole[] = ["admin"];
const adminOwner: UserRole[] = ["admin"];
const purchasingRoles: UserRole[] = ["admin", "purchasing"];
const kitchenRoles: UserRole[] = ["admin", "kitchen"];
const financeRoles: UserRole[] = ["admin", "finance"];
const readRoles: UserRole[] = allRoles;

export const navGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Gauge,
    roles: "all",
    items: [{ href: "/dashboard", label: "Dashboard", icon: Gauge, roles: "all", keywords: ["home", "workspace"] }],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Boxes,
    roles: ["admin", "kitchen", "purchasing"],
    items: [
      { href: "/inventory", label: "Inventory Dashboard", icon: Gauge, roles: ["admin", "kitchen", "purchasing", "finance"], keywords: ["inventory value", "ledger"] },
      { href: "/items", label: "Items", icon: Boxes, roles: ["admin", "kitchen", "purchasing"], keywords: ["item master", "ingredients", "barcode"] },
      { href: "/items?category=all", label: "Categories", icon: Tags, roles: ["admin", "purchasing"] },
      { href: "/stock-counts/scan", label: "Barcode", icon: Barcode, roles: ["admin", "kitchen", "purchasing"], keywords: ["scan"] },
      { href: "/stock-transactions", label: "Stock Ledger", icon: ReceiptText, roles: ["admin", "kitchen", "purchasing", "finance"] },
      { href: "/stock-balance", label: "Stock Balance", icon: PackageSearch, roles: ["admin", "kitchen", "purchasing", "finance"] },
      { href: "/stock-card", label: "Stock Card", icon: FileText, roles: ["admin", "kitchen", "purchasing", "finance"] },
      { href: "/stock-counts", label: "Stock Count", icon: ClipboardCheck, roles: kitchenRoles },
      { href: "/stock-transfers", label: "Stock Transfer", icon: ScanLine, roles: kitchenRoles },
      { href: "/stock-wastage", label: "Stock Wastage", icon: AlertTriangle, roles: kitchenRoles },
      { href: "/stock-transactions/new", label: "Stock Adjustment", icon: ReceiptText, roles: ["admin", "kitchen"] },
    ],
  },
  {
    id: "purchasing",
    label: "Purchasing",
    icon: ShoppingCart,
    roles: ["admin", "purchasing", "kitchen"],
    items: [
      { href: "/purchase-requests", label: "Purchase Request", icon: ClipboardList, roles: ["admin", "purchasing", "kitchen"], keywords: ["PR", "request"] },
      { href: "/purchase-orders", label: "Purchase Order", icon: ShoppingCart, roles: purchasingRoles, keywords: ["PO", "order"] },
      { href: "/goods-receivings", label: "Goods Receiving", icon: PackageCheck, roles: ["admin", "purchasing", "kitchen"], keywords: ["GRN", "receiving", "delivery"] },
      { href: "/documents?document_type=supplier_invoice", label: "Supplier Invoice", icon: ReceiptText, roles: financeRoles },
      { href: "/documents?document_type=payment_schedule", label: "Payment Schedule", icon: WalletCards, roles: financeRoles },
    ],
  },
  {
    id: "production",
    label: "Production",
    icon: Factory,
    roles: ["admin", "kitchen"],
    items: [
      { href: "/recipes", label: "Recipes / BOM", icon: ClipboardList, roles: ["admin", "kitchen"], keywords: ["recipe", "bom"] },
      { href: "/documents?document_type=production_job", label: "Production Jobs", icon: Factory, roles: ["admin", "kitchen"], disabled: true },
      { href: "/documents?document_type=production_plan", label: "Production Planning", icon: ClipboardList, roles: ["admin", "kitchen"], disabled: true },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: Package,
    roles: ["admin"],
    items: [
      { href: "/products", label: "Products", icon: Package, roles: adminOnly },
      { href: "/products", label: "Menu", icon: ClipboardList, roles: adminOnly },
      { href: "/documents?document_type=customer", label: "Customers", icon: Users, roles: adminOnly, disabled: true },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    roles: ["admin", "purchasing"],
    items: [
      { href: "/suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "purchasing"], keywords: ["supplier code"] },
      { href: "/documents?document_type=customer", label: "Customers", icon: Users, roles: adminOnly, disabled: true },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    roles: ["admin", "finance"],
    items: [{ href: "/documents?document_type=report", label: "Reports", icon: FileText, roles: ["admin", "finance"], disabled: true }],
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    roles: "all",
    items: [{ href: "/documents", label: "Documents", icon: FileText, roles: readRoles, keywords: ["document number", "approval"] }],
  },
  {
    id: "administration",
    label: "Administration",
    icon: Settings,
    roles: ["admin"],
    items: [
      { href: "/company", label: "Company", icon: Building2, roles: adminOwner },
      { href: "/branches", label: "Branches", icon: MapPin, roles: adminOwner },
      { href: "/locations", label: "Locations", icon: MapPin, roles: adminOwner },
      { href: "/staffs", label: "Staff", icon: Users, roles: adminOwner },
      { href: "/roles", label: "Roles", icon: UserCog, roles: adminOwner },
      { href: "/roles", label: "Permissions", icon: UserCog, roles: adminOwner },
      { href: "/uom-conversions", label: "UOM", icon: Scale, roles: adminOwner },
      { href: "/supplier-items", label: "Supplier Items", icon: FileDigit, roles: ["admin", "purchasing"] },
      { href: "/document-sequences", label: "Document Sequences", icon: FileDigit, roles: adminOwner },
      { href: "/settings", label: "Tags", icon: Tags, roles: adminOwner, disabled: true },
      { href: "/settings", label: "Settings", icon: Settings, roles: adminOwner },
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
