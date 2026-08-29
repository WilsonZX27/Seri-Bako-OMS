"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { getIaItemForPath } from "@/lib/information-architecture";

type RouteTitle = { title: string; backHref?: string | null };

const routeTitles: Record<string, RouteTitle> = {
  "/account": { title: "My Account" },
  "/activity": { title: "Activity Log" },
  "/administration": { title: "Administration" },
  "/compliance": { title: "Compliance" },
  "/administration/backups": { title: "System Backup", backHref: "/administration" },
  "/administration/master-data-cleanup": { title: "Master Data Cleanup", backHref: "/administration" },
  "/branches": { title: "Branches / Outlets" },
  "/company": { title: "Company Profile" },
  "/document-sequences": { title: "Document Sequences", backHref: "/administration" },
  "/documents": { title: "Documents" },
  "/inventory": { title: "Inventory" },
  "/opening-stock/import": { title: "Import Opening Stock", backHref: "/inventory" },
  "/procurement": { title: "Procurement" },
  "/production": { title: "Production" },
  "/production/planning": { title: "Production Planning", backHref: "/production/jobs" },
  "/production/variance": { title: "Demand Variance", backHref: "/production/jobs" },
  "/reports": { title: "Reports" },
  "/reports/costing-readiness": { title: "Costing Readiness", backHref: "/reports" },
  "/reports/demand-trends": { title: "Demand Trends", backHref: "/reports" },
  "/reports/procurement-variance": { title: "Procurement Variance", backHref: "/reports" },
  "/reports/product-margin": { title: "Product Margin", backHref: "/reports" },
  "/reports/recipe-costing": { title: "Recipe Costing", backHref: "/reports" },
  "/recipes/edit": { title: "Recipe / BOM", backHref: "/recipes" },
  "/stock-card": { title: "Stock Card" },
  "/stock-balances": { title: "Stock Balance", backHref: "/stock-balance" },
  "/stock-count": { title: "Stock Count" },
  "/stock-transfer": { title: "Stock Transfer" },
  "/stock-wastage": { title: "Stock Wastage" },
  "/supplier-invoices/aging": { title: "AP Aging", backHref: "/supplier-invoices" },
  "/supplier-invoices/cash-flow": { title: "Cash Flow Forecast", backHref: "/supplier-invoices" },
  "/supplier-items": { title: "Supplier Items" },
  "/uom-conversions": { title: "UOM Conversions" },
};

function pageContext(pathname: string) {
  if (pathname === "/dashboard") {
    return { title: "Today", backHref: null };
  }
  const matchedRoute = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (matchedRoute) {
    const route = routeTitles[matchedRoute];
    return {
      title: route.title,
      backHref: pathname === matchedRoute ? route.backHref ?? "/dashboard" : matchedRoute,
    };
  }
  const item = getIaItemForPath(pathname);
  if (item) {
    return {
      title: item.label,
      backHref: pathname === item.href ? "/dashboard" : item.href,
    };
  }

  return {
    title: "Dashboard",
    backHref: "/dashboard",
  };
}

export function MobileContextBack() {
  const pathname = usePathname();
  const context = pageContext(pathname);

  if (!context.backHref) return <span className="block h-12 w-12" aria-hidden="true" />;

  return (
    <Link
      href={context.backHref}
      className="flex h-12 w-12 items-center justify-start text-[var(--sb-green-950)]"
      aria-label={`Back to ${context.title}`}
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

export function MobileContextTitle() {
  const pathname = usePathname();
  return <p data-mobile-page-title className="truncate text-center text-[15px] font-semibold text-[var(--sb-green-950)]">{pageContext(pathname).title}</p>;
}
