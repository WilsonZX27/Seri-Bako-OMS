import { BarChart3, ClipboardCheck, FileText, PackageCheck, PackageSearch, ShoppingCart, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceQuickInsights, WorkspaceSectionPanel, type WorkspaceInsight, type WorkspaceSection } from "@/components/workspace-panels";

const reportInsights: WorkspaceInsight[] = [
  { label: "Inventory Reports", value: 3, icon: PackageSearch, theme: "blue" },
  { label: "Procurement Reports", value: 3, icon: ShoppingCart, theme: "amber" },
  { label: "Production Reports", value: 1, icon: BarChart3, theme: "teal" },
  { label: "Finance / Others", value: 2, icon: FileText, theme: "neutral" },
];

const reportSections: WorkspaceSection[] = [
  {
    title: "Inventory Reports",
    description: "Stock balances, stock cards, wastage, and ledger movement review.",
    icon: PackageSearch,
    theme: "blue",
    actions: [
      { href: "/stock-balance", title: "Stock Balance", description: "Branch-level stock balance with optional location drill-down.", icon: PackageSearch, recommendedFor: "managers and finance" },
      { href: "/stock-card", title: "Stock Card", description: "Trace item movement through the posted stock ledger.", icon: FileText, recommendedFor: "finance and operations" },
      { href: "/stock-wastage", title: "Wastage Summary", description: "Track wastage documents by reason, branch, and approval status.", icon: TriangleAlert, recommendedFor: "managers" },
    ],
  },
  {
    title: "Procurement Reports",
    description: "Supplier orders, receiving progress, and approval queues.",
    icon: ShoppingCart,
    theme: "amber",
    actions: [
      { href: "/purchase-orders", title: "Purchase Summary", description: "Review order status, supplier activity, and open PO work.", icon: ShoppingCart, recommendedFor: "purchasing and finance" },
      { href: "/goods-receivings", title: "Receiving Summary", description: "Review GRN progress and posted receiving records.", icon: PackageCheck, recommendedFor: "finance and operations" },
      { href: "/documents?approval_status=pending", title: "Approval Summary", description: "Open documents that still need review or approval.", icon: ClipboardCheck, recommendedFor: "managers" },
    ],
  },
  {
    title: "Sales Reports",
    description: "Sales reporting links will appear when sales workflows are enabled.",
    icon: BarChart3,
    theme: "purple",
    actions: [
      { href: "/reports", title: "Sales Reports", description: "Sales reports are not enabled yet.", icon: BarChart3, recommendedFor: "managers", badge: "Coming soon", disabled: true },
    ],
  },
  {
    title: "Production Reports",
    description: "Production and yield reporting for future kitchen job workflows.",
    icon: BarChart3,
    theme: "teal",
    actions: [
      { href: "/stock-wastage", title: "Production Wastage", description: "Review production-loss and wastage documents.", icon: TriangleAlert, recommendedFor: "managers" },
    ],
  },
  {
    title: "Finance / Others",
    description: "Document register and audit-friendly operational history.",
    icon: FileText,
    theme: "neutral",
    actions: [
      { href: "/documents", title: "Document Register", description: "Search all operational documents and activity history.", icon: FileText, recommendedFor: "finance" },
      { href: "/documents?status=posted", title: "Posted Documents", description: "Review completed documents and attachments.", icon: ClipboardCheck, recommendedFor: "finance" },
    ],
  },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Operational views for stock, procurement, receiving, wastage, and approvals." />
      <div className="space-y-5 p-5">
        <WorkspaceQuickInsights insights={reportInsights} />
        <div className="grid gap-5 xl:grid-cols-2">
          {reportSections.map((section) => (
            <WorkspaceSectionPanel key={section.title} section={section} />
          ))}
        </div>
      </div>
    </>
  );
}
