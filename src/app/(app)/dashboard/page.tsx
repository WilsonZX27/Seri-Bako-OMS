import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { formatPageError } from "@/server/actions/error-handling";
import { getDashboardSummary } from "@/server/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const summary = await getDashboardSummary();

    return <DashboardWorkspace summary={summary} renderedAt={new Date().toISOString()} />;
  } catch (error) {
    console.error(error);
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
