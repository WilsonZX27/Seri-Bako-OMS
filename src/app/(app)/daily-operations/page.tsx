import { ClipboardList, PackageCheck, Search, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceSectionPanel, type WorkspaceSection } from "@/components/workspace-panels";

const dailySections: WorkspaceSection[] = [
  {
    title: "Today's Work",
    description: "Start here for shift work and replenishment requests.",
    icon: ClipboardList,
    theme: "green",
    actions: [
      { href: "/purchase-requests/new", title: "Create Purchase Request", description: "Request ingredients or packaging from a quick branch-first form.", icon: ClipboardList, recommendedFor: "kitchen" },
    ],
  },
  {
    title: "Count / Receive",
    description: "High-frequency actions with larger touch-friendly targets.",
    icon: PackageCheck,
    theme: "blue",
    actions: [
      { href: "/stock-counts/new", title: "Stock Count", description: "Create a branch stock count.", icon: PackageCheck, recommendedFor: "kitchen" },
      { href: "/goods-receivings/new", title: "Goods Receiving", description: "Prepare receiving lines for GRN work.", icon: PackageCheck, recommendedFor: "operations" },
      { href: "/stock-transfers/new", title: "Transfer Stock", description: "Move stock between branches while default locations are handled automatically.", icon: PackageCheck, recommendedFor: "operations" },
      { href: "/items", title: "Find Item", description: "Search item code, item name, category, or supplier.", icon: Search, recommendedFor: "all staff" },
    ],
  },
  {
    title: "Report Exception",
    description: "Lower-frequency exception capture for damaged, expired, missing, or claimable stock.",
    icon: TriangleAlert,
    theme: "amber",
    actions: [
      { href: "/stock-wastage/new", title: "Report Wastage", description: "Record damaged, expired, missing, or claimable stock by branch.", icon: TriangleAlert, recommendedFor: "kitchen" },
    ],
  },
];

export default function DailyOperationsPage() {
  return (
    <>
      <PageHeader title="Daily Operations" description="Fast tools for kitchen and operations staff. Branch-first forms keep location details automatic unless needed." />
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]">
          {dailySections.map((section) => (
            <WorkspaceSectionPanel key={section.title} section={section} />
          ))}
        </div>
      </div>
    </>
  );
}
