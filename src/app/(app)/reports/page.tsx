import { BarChart3, ClipboardCheck, FileText, PackageCheck, PackageSearch, ShoppingCart, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceSectionPanel, type WorkspaceSection, type WorkspaceThemeName } from "@/components/workspace-panels";
import type { LucideIcon } from "lucide-react";

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
      { href: "/documents?status=pending_approval", title: "Approval Queue", description: "Documents waiting for review.", icon: ClipboardCheck },
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

export default function ReportsPage() {
  const sections: WorkspaceSection[] = reportCategories.map((category) => ({
    title: category.title,
    description: category.description,
    icon: category.reports[0]?.icon ?? FileText,
    theme: category.theme,
    actions: category.reports.map((report) => ({
      href: report.href,
      title: report.title,
      description: report.description,
      icon: report.icon,
      badge: report.badge,
      disabled: report.disabled,
    })),
  }));

  return (
    <>
      <PageHeader title="Reports" description="Compact report directory for operational review and audit." />
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <WorkspaceSectionPanel key={section.title} section={section} />
          ))}
        </div>
      </div>
    </>
  );
}
