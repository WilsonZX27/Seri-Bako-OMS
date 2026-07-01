import { Barcode, ClipboardCheck, ClipboardList, PackageCheck, ScanLine, Search, TriangleAlert } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";

const dailyTools = [
  { href: "/purchase-requests/new", title: "Create Purchase Request", description: "Request ingredients or packaging from a quick branch-first form.", icon: ClipboardList, recommendedFor: "kitchen" },
  { href: "/stock-counts/scan", title: "Open Stock Count", description: "Use a USB scanner or manual entry to count items during daily checks.", icon: ClipboardCheck, recommendedFor: "kitchen" },
  { href: "/goods-receivings/scan", title: "Scan Receiving", description: "Scan delivered items and prepare receiving lines for GRN work.", icon: PackageCheck, recommendedFor: "operations" },
  { href: "/stock-wastage/new", title: "Report Wastage", description: "Record damaged, expired, missing, or claimable stock by branch.", icon: TriangleAlert, recommendedFor: "kitchen" },
  { href: "/stock-transfers/new", title: "Transfer Stock", description: "Move stock between branches while default locations are handled automatically.", icon: ScanLine, recommendedFor: "operations" },
  { href: "/items", title: "Find Item", description: "Search item code, name, category, supplier, or barcode.", icon: Search, recommendedFor: "all staff" },
  { href: "/stock-count/scan", title: "Barcode Lookup", description: "Scan or type a barcode to find linked items or products.", icon: Barcode, recommendedFor: "counter and kitchen" },
];

export default function DailyOperationsPage() {
  return (
    <>
      <PageHeader title="Daily Operations" description="Fast tools for kitchen and operations staff. Branch-first forms keep location details automatic unless needed." />
      <div className="space-y-5 p-5">
        <p className="sb-section-label">Quick work</p>
        <CategoryCardGrid items={dailyTools} />
      </div>
    </>
  );
}
