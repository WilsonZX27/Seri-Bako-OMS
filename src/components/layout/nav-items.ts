import {
  Activity, AlertTriangle, Archive, Boxes, Building2, ClipboardCheck, ClipboardList,
  Factory, Gauge, GitPullRequest, MapPin, ReceiptText, RotateCcw, Scale, ShoppingCart,
  Upload, UserCog, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getVisibleIaItems, iaGroupLabels, informationArchitecture, type IaIcon } from "@/lib/information-architecture";
import type { UserRole } from "@/types/database";

const icons: Record<IaIcon, LucideIcon> = {
  activity: Activity, alert: AlertTriangle, archive: Archive, boxes: Boxes, building: Building2,
  check: ClipboardCheck, clipboard: ClipboardList, factory: Factory, gauge: Gauge, map: MapPin,
  receipt: ReceiptText, request: GitPullRequest, rotate: RotateCcw, scale: Scale, shopping: ShoppingCart,
  upload: Upload, userCog: UserCog, users: Users,
};

export type NavItem = Omit<(typeof informationArchitecture)[number], "icon" | "roles"> & { icon: LucideIcon };
export type NavGroup = { id: string; label: string; items: NavItem[] };

export function getVisibleNavGroups(role: UserRole, permissionMap?: Record<string, boolean>): NavGroup[] {
  const visible = getVisibleIaItems(role, permissionMap);
  return Object.entries(iaGroupLabels)
    .map(([id, label]) => ({ id, label, items: visible.filter((item) => item.group === id).map(({ icon, roles, ...item }) => {
      void roles;
      return { ...item, icon: icons[icon] };
    }) }))
    .filter((group) => group.items.length > 0);
}

export const navPermissionCodes = Array.from(new Set(informationArchitecture.map((item) => item.permission)));
export function getFlatNavItems(role: UserRole) { return getVisibleNavGroups(role).flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))); }
export const navItems = getFlatNavItems("super_admin");
export const searchableNavItems = [
  ...informationArchitecture.map(({ icon, roles, ...item }) => {
    void roles;
    return { ...item, icon: icons[icon], group: iaGroupLabels[item.group] };
  }),
  { href: "/purchase-requests/new", label: "New Purchase Request", group: "Procurement", permission: "purchase_request.create", keywords: ["request", "needed by", "priority"] },
  { href: "/outlet-daily-records/new", label: "New Outlet Daily Record", group: "Operations", permission: "outlet_daily_record.create", keywords: ["outlet", "daily"] },
  { href: "/account", label: "My Profile", group: "Account", keywords: ["profile", "password"] },
] as const;
