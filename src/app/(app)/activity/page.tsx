import Link from "next/link";
import { Activity, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getVisibleRecentActivitiesForCurrentUser } from "@/server/queries/notifications";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const params = await searchParams;
  const activities = await getVisibleRecentActivitiesForCurrentUser(50);
  const selected = activities.find((activity) => activity.id === params.selected) ?? activities[0] ?? null;
  const selectedHref = selected?.href || null;

  return (
    <>
      <PageHeader title="Activity" description="Recent operational updates and system actions visible to your role." />
      <WorkspaceGrid
        rightRail={
          selected ? (
            <>
              <ConsoleSection title="Selected Activity">
                <div className="space-y-2 text-xs">
                  <p className="text-xs font-medium">{selected.message}</p>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Actor</span><strong>{selected.created_by_name ?? "System"}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Type</span><strong>{selected.activity_type}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">When</span><strong>{new Date(selected.created_at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Related</span><strong>{selected.entity_type}</strong></div>
                </div>
                {selectedHref ? (
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link href={selectedHref}>Open Record <ArrowRight className="h-3 w-3" /></Link>
                  </Button>
                ) : null}
              </ConsoleSection>
              <ConsoleSection title="Timeline Context">
                <p className="text-xs text-muted-foreground">Activity rows are role-filtered and sorted by latest visible operational event.</p>
              </ConsoleSection>
            </>
          ) : (
            <ConsoleSection title="Activity Detail">
              <p className="text-xs text-muted-foreground">Select an activity to view details.</p>
            </ConsoleSection>
          )
        }
      >
        <div className="overflow-hidden border bg-card">
            <div className="divide-y">
              {activities.map((activity) => {
                const href = activity.href || null;
                const active = selected?.id === activity.id;
                const actor = activity.created_by_name ?? "System";
                const messageIncludesActor = activity.message.toLocaleLowerCase().startsWith(`${actor.toLocaleLowerCase()}:`);
                return (
                  <Link key={activity.id} href={`/activity?selected=${activity.id}`} className={`grid gap-3 px-3 py-2.5 hover:bg-secondary/50 md:grid-cols-[32px_minmax(0,1fr)_150px_120px_auto] md:items-center ${active ? "bg-primary/5" : ""}`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{activity.message}</p>
                      {!messageIncludesActor ? <p className="mt-0.5 text-xs text-muted-foreground">{actor}</p> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><FileText className="h-3 w-3" /> {activity.entity_type}</p>
                    {href ? <span className="text-xs font-medium text-primary">Details</span> : <span className="text-xs text-muted-foreground">Details</span>}
                  </Link>
                );
              })}
              {!activities.length ? (
                <div className="p-4 text-sm text-muted-foreground">No recent activity is available for your role.</div>
              ) : null}
            </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
