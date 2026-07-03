import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getVisibleRecentActivitiesForCurrentUser } from "@/server/queries/dashboard";

export const dynamic = "force-dynamic";

function activityHref(activity: { entity_type: string; entity_id: string }) {
  if (activity.entity_type === "document") return `/documents/${activity.entity_id}`;
  if (activity.entity_type === "stock_transaction") return "/stock-transactions";
  if (activity.entity_type === "supplier") return `/suppliers/${activity.entity_id}`;
  if (activity.entity_type === "item") return `/items/${activity.entity_id}`;
  if (activity.entity_type === "staff") return `/staffs/${activity.entity_id}`;
  return null;
}

export default async function ActivityPage() {
  const activities = await getVisibleRecentActivitiesForCurrentUser(50);

  return (
    <>
      <PageHeader title="Activity" description="Recent operational updates and system actions visible to your role." />
      <div className="p-5">
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {activities.map((activity) => {
                const href = activityHref(activity);
                return (
                  <div key={activity.id} className="flex items-start gap-3 px-5 py-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    {href ? (
                      <Link href={href} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                );
              })}
              {!activities.length ? (
                <div className="p-5 text-sm text-muted-foreground">No recent activity is available for your role.</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
