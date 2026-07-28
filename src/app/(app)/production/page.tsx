import { AlertTriangle, ClipboardList, Factory, PackageCheck, Scale } from "lucide-react";
import { OperationalHub } from "@/components/operational-hub";
import { PageHeader } from "@/components/ui/page-header";
import { getProductionHubSummary } from "@/server/queries/production-jobs";

export default async function ProductionPage() {
  const summary = await getProductionHubSummary();

  return (
    <>
      <PageHeader title="Production" description="Recipe-based production jobs and finished goods stock posting for Seri Bako kitchen operations." />
      <div className="p-3 pb-24 sm:p-5 sm:pb-24 md:pb-5">
        <OperationalHub
          eyebrow="Today’s production"
          summary="Create from an active recipe, complete the kitchen run, then post stock when quantities are confirmed."
          primaryAction={{ href: "/production/jobs/new", label: "Start production job" }}
          metrics={[
            { label: "Posted today", value: summary.todayPosted },
            { label: "Awaiting approval", value: summary.pendingApproval, tone: summary.pendingApproval ? "warning" : "default" },
            { label: "Active recipes", value: summary.activeRecipes },
            { label: "Shortage warnings", value: summary.ingredientShortages, tone: summary.ingredientShortages ? "danger" : "default" },
          ]}
          queueTitle="Production queue"
          queueDescription="The work that needs attention before the next stock posting."
          queue={[
            {
              href: "/production/jobs?status=submitted",
              title: "Pending approval",
              description: "Submitted jobs waiting for a manager",
              value: summary.pendingApproval,
              icon: PackageCheck,
              tone: summary.pendingApproval ? "warning" : "default",
            },
            {
              href: "/production/jobs?status=approved",
              title: "Ready to post",
              description: "Approved jobs ready for inventory posting",
              value: summary.readyToPost,
              icon: Factory,
            },
            {
              href: "/stock-balance",
              title: "Ingredient shortages",
              description: "Review availability before starting a batch",
              value: summary.ingredientShortages,
              icon: AlertTriangle,
              tone: summary.ingredientShortages ? "danger" : "default",
            },
          ]}
          toolsTitle="Production tools"
          tools={[
            { href: "/production/jobs", title: "All production jobs", description: "Draft to posted", icon: Factory },
            { href: "/production/planning", title: "Production planning", description: "Demand references", icon: ClipboardList },
            { href: "/production/variance", title: "Demand variance", description: "Movement and confidence", icon: Scale },
            { href: "/recipes", title: "Recipes / BOM", description: "Versions and ingredients", icon: ClipboardList },
            { href: "/stock-wastage", title: "Wastage review", description: "Loss and expiry records", icon: AlertTriangle },
          ]}
        />
      </div>
    </>
  );
}
