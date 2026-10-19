"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getIaItemForPath, iaGroupLabels } from "@/lib/information-architecture";

type Crumb = {
  label: string;
  href?: string;
};

const sectionMap: Record<string, { label: string; href?: string; parent?: Crumb }> = {
  dashboard: { label: "Dashboard" },
  administration: { label: "Administration" },
  compliance: { label: "Compliance & People Operations" },
  company: { label: "Company", parent: { label: "Administration", href: "/administration" } },
  branches: { label: "Branches", parent: { label: "Administration", href: "/administration" } },
  staffs: { label: "Employees", href: "/people" },
  roles: { label: "Roles & Permissions", parent: { label: "Administration", href: "/administration" } },
  settings: { label: "Administration", href: "/administration" },
  "purchase-requests": { label: "Purchase Requests", parent: { label: "Procurement", href: "/procurement" } },
  "purchase-orders": { label: "Purchase Orders", parent: { label: "Procurement", href: "/procurement" } },
  "purchase-returns": { label: "Purchase Returns", parent: { label: "Procurement", href: "/procurement" } },
  "supplier-invoices": { label: "Supplier Invoices", parent: { label: "Procurement", href: "/procurement" } },
  suppliers: { label: "Suppliers", parent: { label: "Procurement", href: "/procurement" } },
  "goods-receivings": { label: "Goods Receiving", parent: { label: "Procurement", href: "/procurement" } },
  "stock-counts": { label: "Stock Count", parent: { label: "Inventory", href: "/inventory" } },
  "stock-transfers": { label: "Stock Transfer", parent: { label: "Inventory", href: "/inventory" } },
  "stock-wastage": { label: "Stock Wastage", parent: { label: "Inventory", href: "/inventory" } },
  "stock-transactions": { label: "Movement Ledger", parent: { label: "Inventory", href: "/inventory" } },
  "stock-balance": { label: "Stock Balance", parent: { label: "Inventory", href: "/inventory" } },
  "stock-card": { label: "Stock Card", parent: { label: "Inventory", href: "/inventory" } },
  "low-stock": { label: "Low Stock", parent: { label: "Inventory", href: "/inventory" } },
  "opening-stock": { label: "Opening Stock", href: "/opening-stock/import", parent: { label: "Inventory", href: "/inventory" } },
  items: { label: "Items", parent: { label: "Inventory", href: "/inventory" } },
  products: { label: "Products", parent: { label: "Inventory", href: "/inventory" } },
  recipes: { label: "Recipes", parent: { label: "Inventory", href: "/inventory" } },
  procurement: { label: "Procurement" },
  inventory: { label: "Inventory" },
  "outlet-daily-records": { label: "Outlet Daily Records" },
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
  const [documentLabel, setDocumentLabel] = useState<string | null>(null);
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  useEffect(() => {
    setDocumentLabel(null);
    const readLabel = () => {
      const label = document.querySelector<HTMLElement>("[data-document-breadcrumb]")?.dataset.documentBreadcrumb;
      setDocumentLabel(label ?? null);
    };
    readLabel();
    const observer = new MutationObserver(readLabel);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  if (!first) return null;

  const iaItem = getIaItemForPath(pathname);
  const canonicalGroupHrefs = {
    procurement: "/procurement",
    inventory: "/inventory",
    administration: "/administration",
  } as const;
  const iaParent = iaItem && iaItem.group in canonicalGroupHrefs
    ? { label: iaGroupLabels[iaItem.group], href: canonicalGroupHrefs[iaItem.group as keyof typeof canonicalGroupHrefs] }
    : undefined;
  const root = iaItem ? { label: iaItem.label, parent: iaParent } : sectionMap[first];
  const crumbs: Crumb[] = [];

  if (root?.parent) crumbs.push(root.parent);
  crumbs.push({ label: root?.label ?? titleize(first), href: segments.length > 1 ? root?.href ?? `/${first}` : undefined });

  if (segments[1]) {
    if (segments[1] === "new") {
      crumbs.push({ label: `New ${root?.label ?? titleize(first)}` });
    } else if (!isOpaqueId(segments[1])) {
      crumbs.push({ label: titleize(segments[1]) });
    } else {
      crumbs.push({ label: documentLabel ?? "Details" });
    }
  }

  return (
    <div className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground md:flex">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
          {crumb.href ? (
            <Link href={crumb.href} className="truncate hover:text-foreground">{crumb.label}</Link>
          ) : (
            <span className="truncate border-b-2 border-primary pb-1 font-semibold text-foreground">{crumb.label}</span>
          )}
          {index < crumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : null}
        </span>
      ))}
    </div>
  );
}
