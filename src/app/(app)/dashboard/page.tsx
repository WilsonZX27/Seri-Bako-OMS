import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { formatPageError } from "@/server/actions/error-handling";
import { getDashboardSummary } from "@/server/queries/dashboard";
import { Suspense } from "react";
import Link from "next/link";
import { getPermissionMap } from "@/server/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const permissions = await getPermissionMap(["purchase_request.read", "stock_balance.read", "outlet_daily_record.read", "schedule.read"]);
  const actions = [
    { permission: "purchase_request.read", href: "/purchase-requests", label: "Purchase requests" },
    { permission: "stock_balance.read", href: "/stock-balance", label: "Stock balance" },
    { permission: "outlet_daily_record.read", href: "/outlet-daily-records", label: "Outlet Daily" },
    { permission: "schedule.read", href: "/attendance/schedule", label: "Schedule" },
  ] as const;
  return <Suspense fallback={<>
    <PageHeader title="Workdesk" description="Open your work while the latest totals load." />
    <div className="p-3 sm:p-4"><div className="erp-surface flex flex-wrap gap-2 p-3">{actions.filter(action => permissions[action.permission]).map(action => <Button key={action.href} asChild variant="outline"><Link href={action.href}>{action.label}</Link></Button>)}</div><p role="status" className="mt-3 text-xs text-muted-foreground">Loading current activity…</p></div>
  </>}><DashboardContent /></Suspense>;
}

async function DashboardContent() {
  try {
    const summary = await getDashboardSummary();

    return <DashboardWorkspace summary={summary} />;
  } catch (error) {
    return (
      <div className="p-5">
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            {formatPageError(error, "The dashboard could not load completely right now. Please refresh in a moment or continue from the sidebar.")}
          </CardContent>
        </Card>
      </div>
    );
  }
}
