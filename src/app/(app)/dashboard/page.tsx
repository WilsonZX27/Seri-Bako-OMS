import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { getDashboardSummary } from "@/server/queries/dashboard";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Seri Bako operational workspace for approvals, stock, purchasing, production, documents, and notifications."
        action={{ href: "/purchase-requests/new", label: "Create PR" }}
        secondaryAction={{ href: "/stock-count/scan", label: "Stock Count" }}
      />
      <DashboardWorkspace summary={summary} />
    </>
  );
}
