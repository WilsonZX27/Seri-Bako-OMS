import Link from "next/link";
import { BarChart3, ChevronRight, ClipboardCheck, FileText, PackageCheck, PackageSearch, ShoppingCart, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import type { LucideIcon } from "lucide-react";
import { getPermissionMap } from "@/server/auth/permissions";
import { getRouteAllowedRoles, getRoutePermissionCodes } from "@/server/auth/route-permissions";
import { getCurrentProfile } from "@/server/queries/common";

type ReportLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

type ReportCategory = {
  title: string;
  description: string;
  reports: ReportLink[];
};

const reportCategories: ReportCategory[] = [
  {
    title: "Inventory Reports",
    description: "Stock balances, stock cards, wastage, and ledger movement review.",
    reports: [
      { href: "/stock-balance", title: "Stock Balance", description: "Branch-level stock calculated from posted movements.", icon: PackageSearch },
      { href: "/stock-card", title: "Stock Card", description: "Item movement trace from the posted ledger.", icon: FileText },
      { href: "/low-stock", title: "Low Stock", description: "Items below safety stock threshold.", icon: TriangleAlert },
      { href: "/reports/demand-trends", title: "Demand Trend Lite", description: "Outlet-record movement, wastage, and data coverage.", icon: BarChart3 },
    ],
  },
  {
    title: "Procurement Reports",
    description: "Supplier orders, receiving progress, and approval queues.",
    reports: [
      { href: "/purchase-orders", title: "PO Status", description: "Open, sent, received, and closed purchase orders.", icon: ShoppingCart },
      { href: "/goods-receivings", title: "Receiving Summary", description: "GRN progress and posted receiving records.", icon: PackageCheck },
      { href: "/documents?status=pending_approval", title: "Approval Queue", description: "Documents waiting for review.", icon: ClipboardCheck },
      { href: "/reports/procurement-variance", title: "Procurement Variance", description: "Read-only comparison of linked PO, GRN, invoice, and supplier reference prices.", icon: BarChart3 },
    ],
  },
  {
    title: "Production Reports",
    description: "Operational production-loss review.",
    reports: [
      { href: "/stock-wastage", title: "Wastage Review", description: "Production-loss and wastage document review.", icon: TriangleAlert },
      { href: "/reports/recipe-costing", title: "Recipe Costing", description: "Read-only ingredient-cost estimates from item master costs.", icon: PackageSearch },
      { href: "/reports/product-margin", title: "Product Margin", description: "Read-only margin estimate from high-confidence recipe costs.", icon: PackageSearch },
    ],
  },
  {
      title: "Finance / Others",
    description: "Audit-friendly operational history and data readiness.",
    reports: [
      { href: "/documents", title: "Documents Register", description: "Search document status, approvals, attachments, and audit history.", icon: FileText },
      { href: "/reports/costing-readiness", title: "Costing Readiness", description: "Master-data checks before trusting future costing.", icon: PackageSearch },
    ],
  },
];

export default async function ReportsPage() {
  const permissionCodes = reportCategories.flatMap((category) => category.reports.flatMap((report) => getRoutePermissionCodes(report.href.split("?")[0]) ?? []));
  const [permissions, profile] = await Promise.all([getPermissionMap(permissionCodes), getCurrentProfile()]);
  const role = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role ?? "outlet_staff";
  const visibleCategories = reportCategories.map((category) => ({
    ...category,
    reports: category.reports.filter((report) => {
      const pathname = report.href.split("?")[0];
      const required = getRoutePermissionCodes(pathname) ?? [];
      const roles = getRouteAllowedRoles(pathname);
      return required.some((permission) => permissions[permission]) && (!roles || roles.includes(role as never));
    }),
  })).filter((category) => category.reports.length);
  const reportCount = visibleCategories.reduce((sum, category) => sum + category.reports.length, 0);
  const catalogueCount = reportCategories.reduce((sum, category) => sum + category.reports.length, 0);
  const hiddenByAccess = Math.max(0, catalogueCount - reportCount);

  return (
    <>
      <PageHeader title="Reports" description="Compact report directory for operational review and audit." />
      <WorkspaceGrid
        hideMobileConsole
        rightRail={
          <>
            <ConsoleSection title="Report Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Categories</span><strong>{visibleCategories.length}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Available</span><strong>{reportCount}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Hidden by access</span><strong>{hiddenByAccess}</strong></div>
              </div>
            </ConsoleSection>
            <ConsoleSection title="Data Freshness">
              <p className="text-xs text-muted-foreground">Reports open live operational pages. Export options appear on pages that support CSV output.</p>
            </ConsoleSection>
          </>
        }
      >
        <div className="space-y-4">
          {visibleCategories.map((category) => (
            <section key={category.title} className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card">
              <div className="border-b bg-secondary/30 px-3 py-2">
                <h2 className="text-sm font-semibold">{category.title}</h2>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
              <div className="divide-y">
                {category.reports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <Link key={report.title} href={report.href} aria-label={`Open ${report.title}: ${report.description}`} className="group grid min-h-14 grid-cols-[32px_minmax(0,1fr)_24px] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--sb-radius-control)] bg-primary/10 text-primary" aria-hidden="true">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--sb-text)]">{report.title}</p>
                        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{report.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 justify-self-end text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </WorkspaceGrid>
    </>
  );
}
