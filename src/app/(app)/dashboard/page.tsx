import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getDashboardSummary } from "@/server/queries/dashboard";
import { getCurrentProfile } from "@/server/queries/common";
import type { UserRole } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const [summary, profile] = await Promise.all([getDashboardSummary(), getCurrentProfile()]);
    const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
    const role = profileRole?.role_code ?? profileRole?.role ?? "viewer";

    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Seri Bako operational workspace for approvals, stock, purchasing, production, documents, and notifications."
          action={{ href: "/purchase-requests/new", label: "Create PR" }}
          secondaryAction={{ href: "/stock-count/scan", label: "Stock Count" }}
        />
        <DashboardWorkspace summary={summary} role={role} />
      </>
    );
  } catch (error) {
    console.error(error);
    return (
      <>
        <PageHeader title="Dashboard" description="Seri Bako operational workspace for approvals, stock, purchasing, production, documents, and notifications." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              The dashboard could not load completely right now. Please refresh in a moment or continue from the sidebar.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
}
