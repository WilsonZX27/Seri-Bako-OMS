import { ClipboardList, FileDigit, PackageCheck, ShoppingCart, Truck } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";

const procurementTools = [
  { href: "/purchase-requests", title: "Purchase Requests", description: "Create, review, and convert branch purchase requests.", icon: ClipboardList, recommendedFor: "kitchen and purchasing" },
  { href: "/purchase-orders", title: "Purchase Orders", description: "Prepare supplier orders and follow approval status.", icon: ShoppingCart, recommendedFor: "purchasing" },
  { href: "/goods-receivings", title: "Goods Receiving", description: "Create and post GRNs from approved or sent purchase orders.", icon: PackageCheck, recommendedFor: "receiving" },
  { href: "/suppliers", title: "Suppliers", description: "Maintain supplier records, contacts, and terms.", icon: Truck, recommendedFor: "purchasing" },
  { href: "/supplier-items", title: "Supplier Items", description: "Supplier-specific item codes, costs, UOM, MOQ, and lead times.", icon: FileDigit, recommendedFor: "purchasing" },
  { href: "/imports/supplier-items", title: "Import Supplier Items", description: "Upload supplier pricing and item references with preview validation.", icon: FileDigit, recommendedFor: "admin and purchasing" },
];

export default function ProcurementPage() {
  return (
    <>
      <PageHeader title="Procurement" description="Supplier, purchasing, and receiving work grouped in one place." action={{ href: "/purchase-requests/new", label: "Create PR" }} />
      <div className="space-y-5 p-5">
        <p className="sb-section-label">Purchasing tools</p>
        <CategoryCardGrid items={procurementTools} />
      </div>
    </>
  );
}
