import { BarChart3, ClipboardCheck, FileText, PackageCheck, PackageSearch, ShoppingCart, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import type { WorkspaceThemeName } from "@/components/workspace-panels";
import type { LucideIcon } from "lucide-react";

type ReportLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

type ReportCategory = {
  title: string;
  description: string;
  theme: WorkspaceThemeName;
  reports: ReportLink[];
};

const reportCategories: ReportCategory[] = [
  {
    title: "Inventory Reports",
    description: "Stock balances, stock cards, wastage, and ledger movement review.",
    theme: "blue",
    reports: [
      { href: "/stock-balance", title: "Stock Balance", description: "Branch-level stock with optional location detail.", icon: PackageSearch },
      { href: "/stock-card", title: "Stock Card", description: "Item movement trace from the posted ledger.", icon: FileText },
      { href: "/low-stock", title: "Low Stock", description: "Items below safety stock threshold.", icon: TriangleAlert },
      { href: "/reports/demand-trends", title: "Demand Trend Lite", description: "Outlet-record movement, wastage, and data coverage.", icon: BarChart3 },
    ],
  },
  {
    title: "Procurement Reports",
    description: "Supplier orders, receiving progress, and approval queues.",
    theme: "amber",
    reports: [
      { href: "/purchase-orders", title: "PO Status", description: "Open, sent, received, and closed purchase orders.", icon: ShoppingCart },
      { href: "/goods-receivings", title: "Receiving Summary", description: "GRN progress and posted receiving records.", icon: PackageCheck },
      { href: "/documents?status=pending_approval", title: "Approval Queue", description: "Documents waiting for review.", icon: ClipboardCheck },
    ],
  },
  {
    title: "Production Reports",
    description: "Operational production-loss review.",
    theme: "teal",
    reports: [
      { href: "/stock-wastage", title: "Wastage Review", description: "Production-loss and wastage document review.", icon: TriangleAlert },
      { href: "/reports/recipe-costing", title: "Recipe Costing", description: "Read-only ingredient-cost estimates from item master costs.", icon: PackageSearch },
      { href: "/reports/product-margin", title: "Product Margin", description: "Read-only margin estimate from high-confidence recipe costs.", icon: PackageSearch },
    ],
  },
  {
    title: "Finance / Others",
    description: "Document register and audit-friendly operational history.",
    theme: "neutral",
    reports: [
      { href: "/documents", title: "Document Register", description: "Complete document search and history.", icon: FileText },
      { href: "/documents?status=posted", title: "Posted Documents", description: "Completed documents and attachments.", icon: ClipboardCheck },
      { href: "/reports/costing-readiness", title: "Costing Readiness", description: "Master-data checks before trusting future costing.", icon: PackageSearch },
    ],
  },
];

export default function ReportsPage() {
  const reportCount = reportCategories.reduce((sum, category) => sum + category.reports.length, 0);

  return (
    <>
      <PageHeader title="Reports" description="Compact report directory for operational review and audit." />
      <WorkspaceGrid
        rightRail={
          <>
            <ConsoleSection title="Report Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Categories</span><strong>{reportCategories.length}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Available</span><strong>{reportCount}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Total Listed</span><strong>{reportCount}</strong></div>
              </div>
            </ConsoleSection>
            <ConsoleSection title="Data Freshness">
              <p className="text-xs text-muted-foreground">Reports open live operational pages. Export options appear on pages that support CSV output.</p>
            </ConsoleSection>
          </>
        }
      >
        <div className="space-y-4">
          {reportCategories.map((category) => (
            <section key={category.title} className="overflow-hidden rounded-lg border bg-card">
              <div className="border-b bg-secondary/30 px-3 py-2">
                <h2 className="text-sm font-semibold">{category.title}</h2>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
              <div className="divide-y">
                {category.reports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <div key={report.title} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-primary/10 text-primary">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{report.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{report.description}</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="h-8 px-2 text-xs">
                        <a href={report.href}>Open</a>
                      </Button>
                    </div>
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
