import { ClipboardList, FileDigit, PackageCheck, PlusCircle, ShoppingCart, Truck } from "lucide-react";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const procurementSections = [
  {
    title: "Requesting",
    description: "Raise branch purchase needs before purchasing turns them into supplier orders.",
    items: [
      { href: "/purchase-requests", title: "Purchase Requests", description: "Create, review, and convert branch purchase requests.", icon: ClipboardList, recommendedFor: "kitchen and purchasing" },
      { href: "/purchase-requests/new", title: "Create PR", description: "Start a new branch-first request with item lines and needed-by date.", icon: PlusCircle, recommendedFor: "all operations" },
    ],
  },
  {
    title: "Ordering",
    description: "Prepare and monitor supplier orders after requests are approved.",
    items: [
      { href: "/purchase-orders", title: "Purchase Orders", description: "Prepare supplier orders and follow approval status.", icon: ShoppingCart, recommendedFor: "purchasing" },
    ],
  },
  {
    title: "Receiving",
    description: "Record goods received against purchase orders and post stock safely.",
    items: [
      { href: "/goods-receivings", title: "Goods Receiving", description: "Create and post GRNs from approved or sent purchase orders.", icon: PackageCheck, recommendedFor: "receiving" },
    ],
  },
  {
    title: "Supplier Master Data",
    description: "Maintain supplier records and supplier item costing used by purchase orders.",
    items: [
      { href: "/suppliers", title: "Suppliers", description: "Maintain supplier records, contacts, and terms.", icon: Truck, recommendedFor: "purchasing" },
      { href: "/supplier-items", title: "Supplier Items", description: "Supplier-specific item codes, costs, UOM, MOQ, and lead times.", icon: FileDigit, recommendedFor: "purchasing" },
      { href: "/imports/supplier-items", title: "Import Supplier Items", description: "Upload supplier pricing and item references with preview validation.", icon: FileDigit, recommendedFor: "admin and purchasing" },
    ],
  },
];

export default function ProcurementPage() {
  return (
    <>
      <PageHeader title="Procurement" description="Supplier, purchasing, and receiving work grouped in one place." action={{ href: "/purchase-requests/new", label: "Create PR" }} />
      <div className="space-y-5 p-5">
        {procurementSections.map((section) => (
          <Card key={section.title} className="border-primary/10 bg-[var(--sb-muted)]">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="sb-section-label">{section.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              </div>
              <CategoryCardGrid items={section.items} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
