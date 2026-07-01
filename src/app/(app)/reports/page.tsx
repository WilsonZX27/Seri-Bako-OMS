import { ClipboardCheck, FileText, PackageCheck, PackageSearch, ShoppingCart, TriangleAlert } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";

const reportTools = [
  { href: "/stock-balance", title: "Stock Balance", description: "Branch-level stock balance with optional location drill-down.", icon: PackageSearch, recommendedFor: "managers and finance" },
  { href: "/purchase-orders", title: "Purchase Summary", description: "Review order status, supplier activity, and open PO work.", icon: ShoppingCart, recommendedFor: "purchasing and finance" },
  { href: "/goods-receivings", title: "Receiving Summary", description: "Review GRN progress and posted receiving records.", icon: PackageCheck, recommendedFor: "finance and operations" },
  { href: "/stock-wastage", title: "Wastage Summary", description: "Track wastage documents by reason, branch, and approval status.", icon: TriangleAlert, recommendedFor: "managers" },
  { href: "/documents?approval_status=pending", title: "Approval Summary", description: "Open documents that still need review or approval.", icon: ClipboardCheck, recommendedFor: "managers" },
  { href: "/documents", title: "Document Register", description: "Search all operational documents and activity history.", icon: FileText, recommendedFor: "finance" },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Operational views for stock, procurement, receiving, wastage, and approvals." />
      <div className="space-y-5 p-5">
        <p className="sb-section-label">Report views</p>
        <CategoryCardGrid items={reportTools} />
      </div>
    </>
  );
}
