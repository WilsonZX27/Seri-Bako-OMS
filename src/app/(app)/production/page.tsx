import { AlertTriangle, ClipboardList, Factory, PackageCheck, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceQuickInsights, WorkspaceSectionPanel, type WorkspaceInsight, type WorkspaceSection } from "@/components/workspace-panels";
import { getProductionHubSummary } from "@/server/queries/production-jobs";

const productionSections: WorkspaceSection[] = [
  {
    title: "Production Jobs",
    description: "Create, approve, and post recipe-based production for central kitchen work.",
    icon: Factory,
    theme: "teal",
    actions: [
      { href: "/production/jobs/new", title: "New Production Job", description: "Create a draft from an active recipe. Stock changes only after posting.", icon: Factory, recommendedFor: "kitchen" },
      { href: "/production/jobs", title: "View Production Jobs", description: "Review draft, submitted, approved, and posted production jobs.", icon: PackageCheck, recommendedFor: "managers" },
      { href: "/production/planning", title: "Production Planning", description: "Review planning references from reliable outlet demand; check incomplete records before producing.", icon: ClipboardList, recommendedFor: "HQ and managers" },
      { href: "/production/variance", title: "Demand Variance", description: "Review outlet movement, leftovers, wastage, and low-confidence signals by product.", icon: Scale, recommendedFor: "HQ and managers" },
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
    title: "Approvals and Posting",
    description: "Approve submitted jobs and post finished production into inventory.",
    icon: PackageCheck,
    theme: "blue",
    actions: [
      { href: "/production/jobs?status=submitted", title: "Pending Approval", description: "Submitted production jobs waiting for Manager/Admin approval.", icon: PackageCheck, recommendedFor: "manager" },
      { href: "/production/jobs?status=approved", title: "Ready to Post", description: "Approved production jobs ready to deduct ingredients and add output stock.", icon: Scale, recommendedFor: "admin" },
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

export default async function ProductionPage() {
  const summary = await getProductionHubSummary();
  const productionInsights: WorkspaceInsight[] = [
    { label: "Posted Today", value: summary.todayPosted, icon: Factory, theme: "teal" },
    { label: "Active Recipes", value: summary.activeRecipes, icon: ClipboardList, theme: "green" },
    { label: "Pending Approval", value: summary.pendingApproval, icon: PackageCheck, theme: "amber" },
    { label: "Shortage Warnings", value: summary.ingredientShortages, icon: AlertTriangle, theme: summary.ingredientShortages ? "red" : "green" },
  ];

  return (
    <>
      <PageHeader title="Production" description="Recipe-based production jobs and finished goods stock posting for Seri Bako kitchen operations." />
      <div className="space-y-5 p-5">
        <WorkspaceQuickInsights insights={productionInsights} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {productionSections.map((section) => (
            <WorkspaceSectionPanel key={section.title} section={section} />
          ))}
        </div>
      </div>
    </>
  );
}
