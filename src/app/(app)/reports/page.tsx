import Link from "next/link";
import { BarChart3, ClipboardCheck, FileText, PackageCheck, PackageSearch, ShoppingCart, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceQuickInsights, type WorkspaceInsight, type WorkspaceThemeName } from "@/components/workspace-panels";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const reportInsights: WorkspaceInsight[] = [
  { label: "Inventory Reports", value: 3, icon: PackageSearch, theme: "blue" },
  { label: "Procurement Reports", value: 3, icon: ShoppingCart, theme: "amber" },
  { label: "Production Reports", value: 1, icon: BarChart3, theme: "teal" },
  { label: "Finance / Others", value: 2, icon: FileText, theme: "neutral" },
];

type ReportLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
};

type ReportCategory = {
  title: string;
  description: string;
  theme: WorkspaceThemeName;
  reports: ReportLink[];
};

const categoryStyles: Record<WorkspaceThemeName, string> = {
  green: "border-emerald-100 bg-emerald-50/30",
  blue: "border-blue-100 bg-blue-50/30",
  amber: "border-amber-100 bg-amber-50/30",
  purple: "border-purple-100 bg-purple-50/30",
  teal: "border-teal-100 bg-teal-50/30",
  neutral: "border-slate-200 bg-slate-50/40",
  red: "border-red-100 bg-red-50/30",
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
    ],
  },
  {
    title: "Procurement Reports",
    description: "Supplier orders, receiving progress, and approval queues.",
    theme: "amber",
    reports: [
      { href: "/purchase-orders", title: "PO Status", description: "Open, sent, received, and closed purchase orders.", icon: ShoppingCart },
      { href: "/goods-receivings", title: "Receiving Summary", description: "GRN progress and posted receiving records.", icon: PackageCheck },
      { href: "/documents?approval_status=pending", title: "Approval Queue", description: "Documents waiting for review.", icon: ClipboardCheck },
    ],
  },
  {
    title: "Production Reports",
    description: "Production and yield reporting for future kitchen job workflows.",
    theme: "teal",
    reports: [
      { href: "/stock-wastage", title: "Wastage Review", description: "Production-loss and wastage document review.", icon: TriangleAlert },
      { href: "/reports", title: "Yield Report", description: "Coming with production jobs.", icon: BarChart3, badge: "Coming soon", disabled: true },
    ],
  },
  {
    title: "Finance / Others",
    description: "Document register and audit-friendly operational history.",
    theme: "neutral",
    reports: [
      { href: "/documents", title: "Document Register", description: "Complete document search and history.", icon: FileText },
      { href: "/documents?status=posted", title: "Posted Documents", description: "Completed documents and attachments.", icon: ClipboardCheck },
      { href: "/reports", title: "Finance Reports", description: "Finance outputs are not enabled yet.", icon: BarChart3, badge: "Coming soon", disabled: true },
    ],
  },
];

function ReportCategoryCard({ category }: { category: ReportCategory }) {
  return (
    <Card className={cn("border shadow-sm", categoryStyles[category.theme])}>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">{category.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        </div>
        <div className="grid gap-3">
          {category.reports.map((report) => {
            const Icon = report.icon;
            const content = (
              <div className={cn("flex items-start gap-3 rounded-lg border bg-white/85 p-3", report.disabled ? "opacity-70" : "transition-colors hover:border-primary/30 hover:bg-white")}>
                <div className="sb-icon-tile">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{report.title}</p>
                    {report.badge ? <Badge variant="secondary">{report.badge}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{report.description}</p>
                </div>
              </div>
            );
            return report.disabled ? <div key={report.title}>{content}</div> : <Link key={report.title} href={report.href}>{content}</Link>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Compact report directory for operational review and audit." />
      <div className="space-y-5 p-5">
        <WorkspaceQuickInsights insights={reportInsights} />
        <div className="grid gap-4 xl:grid-cols-2">
          {reportCategories.map((section) => (
            <ReportCategoryCard key={section.title} category={section} />
          ))}
        </div>
      </div>
    </>
  );
}
