import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardList, FileDigit, PackageCheck, Plus, ReceiptText, ShoppingCart, Truck, Upload, Users } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceQuickInsights, WorkspaceSectionPanel, type WorkspaceInsight, type WorkspaceSection } from "@/components/workspace-panels";
import { getProcurementWorkspaceInsights } from "@/server/queries/procurement";

const procurementSections: WorkspaceSection[] = [
  {
    title: "Requesting",
    description: "Raise branch purchase needs before purchasing turns them into supplier orders.",
    icon: ClipboardList,
    theme: "green",
    actions: [
      { href: "/purchase-requests", title: "Purchase Requests", description: "Create, review, and convert branch purchase requests.", icon: ClipboardList, recommendedFor: "kitchen and purchasing" },
      { href: "/purchase-requests/new", title: "Create PR", description: "Start a new branch-first request with item lines and needed-by date.", icon: Plus, recommendedFor: "all operations" },
    ],
  },
  {
    title: "Ordering",
    description: "Prepare and monitor supplier orders after requests are approved.",
    icon: ShoppingCart,
    theme: "amber",
    actions: [
      { href: "/purchase-orders", title: "Purchase Orders", description: "Prepare supplier orders and follow approval status.", icon: ShoppingCart, recommendedFor: "purchasing" },
    ],
  },
  {
    title: "Receiving",
    description: "Record goods received against purchase orders and post stock safely.",
    icon: PackageCheck,
    theme: "blue",
    actions: [
      { href: "/goods-receivings", title: "Goods Receiving", description: "Create and post GRNs from approved or sent purchase orders.", icon: PackageCheck, recommendedFor: "receiving" },
      { href: "/supplier-invoices", title: "Supplier Invoices", description: "Track posted GRN invoices and simple payment status.", icon: ReceiptText, recommendedFor: "finance" },
    ],
  },
  {
    title: "Supplier Master Data",
    description: "Maintain supplier records and supplier item costing used by purchase orders.",
    icon: Users,
    theme: "purple",
    actions: [
      { href: "/suppliers", title: "Suppliers", description: "Maintain supplier records, contacts, and terms.", icon: Truck, recommendedFor: "purchasing" },
      { href: "/supplier-items", title: "Supplier Items", description: "Supplier-specific item codes, costs, UOM, MOQ, and lead times.", icon: FileDigit, recommendedFor: "purchasing" },
      { href: "/imports/supplier-items", title: "Import Supplier Items", description: "Upload supplier pricing and item references with preview validation.", icon: Upload, recommendedFor: "Purchasing" },
    ],
  },
];

export default async function ProcurementPage() {
  const insights = await getProcurementWorkspaceInsights();
  const procurementInsights: WorkspaceInsight[] = [
    { label: "Draft PO", value: insights.draftPo, icon: ShoppingCart, theme: "amber" },
    { label: "Open PO", value: insights.openPo, icon: ClipboardList, theme: "blue" },
    { label: "Receiving Today", value: insights.receivingToday, icon: PackageCheck, theme: "green" },
    { label: "PRs Awaiting Approval", value: insights.pendingPr, icon: AlertTriangle, theme: "red" },
  ];

  return (
    <>
      <PageHeader title="Procurement" description="Supplier, purchasing, and receiving work grouped in one place." />
      <WorkspaceGrid
        className="pt-4"
        rightRail={
          <ConsoleSection title="Actions">
            <div className="grid gap-2">
              <Button asChild size="sm" className="w-full">
                <Link href="/purchase-requests/new">Create PR</Link>
              </Button>
            </div>
          </ConsoleSection>
        }
      >
        <div className="space-y-5">
          <WorkspaceQuickInsights insights={procurementInsights} action={{ href: "/reports", label: "View all reports", icon: ArrowRight }} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {procurementSections.map((section) => (
              <WorkspaceSectionPanel key={section.title} section={section} />
            ))}
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
