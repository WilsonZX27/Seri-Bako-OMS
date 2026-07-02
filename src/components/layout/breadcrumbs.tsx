"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

type Crumb = {
  label: string;
  href?: string;
};

const sectionMap: Record<string, { label: string; parent?: Crumb }> = {
  dashboard: { label: "Dashboard" },
  "quick-tools": { label: "Quick Tools" },
  company: { label: "Company", parent: { label: "Settings", href: "/settings" } },
  branches: { label: "Branches", parent: { label: "Settings", href: "/settings" } },
  locations: { label: "Locations", parent: { label: "Settings", href: "/settings" } },
  staffs: { label: "Staff", parent: { label: "Settings", href: "/settings" } },
  roles: { label: "Roles", parent: { label: "Settings", href: "/settings" } },
  settings: { label: "Settings" },
  "purchase-requests": { label: "Purchase Requests", parent: { label: "Procurement", href: "/procurement" } },
  "purchase-orders": { label: "Purchase Orders", parent: { label: "Procurement", href: "/procurement" } },
  suppliers: { label: "Suppliers", parent: { label: "Procurement", href: "/procurement" } },
  "goods-receivings": { label: "Goods Receiving", parent: { label: "Daily Operations", href: "/daily-operations" } },
  "stock-counts": { label: "Stock Count", parent: { label: "Inventory", href: "/inventory" } },
  "stock-transfers": { label: "Stock Transfer", parent: { label: "Inventory", href: "/inventory" } },
  "stock-wastage": { label: "Stock Wastage", parent: { label: "Inventory", href: "/inventory" } },
  "stock-transactions": { label: "Manual Stock Movement", parent: { label: "Inventory", href: "/inventory" } },
  "stock-balance": { label: "Stock Balance", parent: { label: "Inventory", href: "/inventory" } },
  "stock-card": { label: "Stock Card", parent: { label: "Inventory", href: "/inventory" } },
  items: { label: "Items", parent: { label: "Inventory", href: "/inventory" } },
  procurement: { label: "Procurement" },
  inventory: { label: "Inventory" },
  "daily-operations": { label: "Daily Operations" },
  production: { label: "Production" },
  documents: { label: "Documents" },
  reports: { label: "Reports" },
};

function titleize(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isOpaqueId(segment: string) {
  return /^[0-9a-f-]{20,}$/i.test(segment);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (!first) return null;

  const root = sectionMap[first];
  const crumbs: Crumb[] = [];

  if (root?.parent) crumbs.push(root.parent);
  crumbs.push({ label: root?.label ?? titleize(first), href: segments.length > 1 ? `/${first}` : undefined });

  if (segments[1]) {
    if (segments[1] === "new") {
      crumbs.push({ label: `New ${root?.label ?? titleize(first)}` });
    } else if (segments[1] === "scan") {
      crumbs.push({ label: "Scan" });
    } else if (!isOpaqueId(segments[1])) {
      crumbs.push({ label: titleize(segments[1]) });
    } else {
      crumbs.push({ label: "Details" });
    }
  }

  return (
    <div className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground md:flex">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
          {crumb.href ? <Link href={crumb.href} className="truncate hover:text-foreground">{crumb.label}</Link> : <span className="truncate">{crumb.label}</span>}
          {index < crumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : null}
        </span>
      ))}
    </div>
  );
}
