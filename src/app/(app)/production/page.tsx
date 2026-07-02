import { AlertTriangle, ClipboardList, Factory, PackageCheck, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceQuickInsights, WorkspaceSectionPanel, type WorkspaceInsight, type WorkspaceSection } from "@/components/workspace-panels";

const productionInsights: WorkspaceInsight[] = [
  { label: "Production Jobs Today", value: 0, icon: Factory, theme: "teal" },
  { label: "Active Recipes", value: 0, icon: ClipboardList, theme: "green" },
  { label: "Yield Alerts", value: 0, icon: Scale, theme: "amber" },
  { label: "Wastage Reviews", value: 0, icon: AlertTriangle, theme: "red" },
];

const productionSections: WorkspaceSection[] = [
  {
    title: "Production Actions",
    description: "Operational production workflows for the central kitchen.",
    icon: Factory,
    theme: "teal",
    actions: [
      { href: "/documents?document_type=production_job", title: "Production Jobs", description: "Production job workflow is coming in Sprint 7.", icon: Factory, recommendedFor: "kitchen", badge: "Coming soon", disabled: true },
    ],
  },
  {
    title: "Recipes / BOM",
    description: "Recipe versions, ingredient lines, costing snapshots, and approvals.",
    icon: ClipboardList,
    theme: "green",
    actions: [
      { href: "/recipes", title: "Recipes", description: "Manage recipe versions, ingredient lines, costing snapshots, and approvals.", icon: ClipboardList, recommendedFor: "kitchen and admin" },
    ],
  },
  {
    title: "Production Orders",
    description: "Future job planning and kitchen execution documents.",
    icon: PackageCheck,
    theme: "blue",
    actions: [
      { href: "/documents?document_type=production_job", title: "Production Documents", description: "Review production documents when the workflow is enabled.", icon: PackageCheck, recommendedFor: "kitchen", badge: "Coming soon", disabled: true },
    ],
  },
  {
    title: "Yield / Wastage",
    description: "Review production loss and wastage documents linked to kitchen work.",
    icon: Scale,
    theme: "amber",
    actions: [
      { href: "/stock-wastage", title: "Wastage Review", description: "Track damaged, expired, missing, or production-loss stock.", icon: AlertTriangle, recommendedFor: "managers" },
    ],
  },
];

export default function ProductionPage() {
  return (
    <>
      <PageHeader title="Production" description="Recipe and future production job tools for Seri Bako kitchen operations." />
      <div className="space-y-5 p-5">
        <WorkspaceQuickInsights insights={productionInsights} />
        <div className="grid gap-5 xl:grid-cols-2">
          {productionSections.map((section) => (
            <WorkspaceSectionPanel key={section.title} section={section} />
          ))}
        </div>
      </div>
    </>
  );
}
