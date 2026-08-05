import Link from "next/link";
import { Activity, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { PageHeader } from "@/components/ui/page-header";
import { OperationalList, OperationalListRow } from "@/components/ui/table";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getVisibleRecentActivitiesForCurrentUser } from "@/server/queries/notifications";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const params = await searchParams;
  const activities = await getVisibleRecentActivitiesForCurrentUser(50);
  const selected = params.selected ? activities.find((activity) => activity.id === params.selected) ?? null : null;
  const selectedHref = selected?.href || null;

  return (
    <>
      <PageHeader title="Activity" description="Recent operational updates and system actions visible to your role." />
      <WorkspaceGrid
        hideMobileConsole={!selected}
        rightRail={
          selected ? (
            <>
              <ConsoleSection title="Selected Activity">
                <div className="space-y-2 text-xs">
                  <p className="text-xs font-medium">{selected.message}</p>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Actor</span><strong>{selected.created_by_name ?? "System"}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Type</span><strong>{selected.activity_type}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">When</span><strong>{formatDateTime(selected.created_at)}</strong></div>
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
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <OperationalList ariaLabel="Recent activity" className="bg-card" >
            {activities.map((activity) => {
              const actor = activity.created_by_name ?? "System";
              const messageIncludesActor = activity.message.toLocaleLowerCase().startsWith(`${actor.toLocaleLowerCase()}:`);
              return <OperationalListRow
                key={activity.id}
                href={`/activity?selected=${activity.id}`}
                label={`View activity: ${activity.message}`}
                primary={activity.message}
                secondary={messageIncludesActor ? activity.entity_type : `${actor} · ${activity.entity_type}`}
                meta={formatDateTime(activity.created_at)}
              />;
            })}
            {!activities.length ? <div className="p-4 text-sm text-muted-foreground">No recent activity is available for your role.</div> : null}
          </OperationalList>
          <div data-activity-desktop-list className="hidden divide-y md:block">
              {activities.map((activity) => {
                const href = activity.href || null;
                const active = selected?.id === activity.id;
                const actor = activity.created_by_name ?? "System";
                const messageIncludesActor = activity.message.toLocaleLowerCase().startsWith(`${actor.toLocaleLowerCase()}:`);
                return (
                  <Link key={activity.id} href={`/activity?selected=${activity.id}`} className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5 px-3 py-2 hover:bg-secondary/50 md:grid-cols-[32px_minmax(0,1fr)_150px_120px_auto] md:items-center md:gap-3 md:py-2.5 ${active ? "bg-primary/5" : ""}`}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] bg-primary/10 text-primary md:h-8 md:w-8">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-normal break-words text-xs font-medium leading-5">{activity.message}</p>
                      {!messageIncludesActor ? <p className="mt-0.5 text-xs text-muted-foreground">{actor}</p> : null}
                    </div>
                    <p className="col-start-2 text-[11px] text-muted-foreground md:col-auto md:text-xs">{formatDateTime(activity.created_at)}</p>
                    <p className="hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex"><FileText className="h-3 w-3" /> {activity.entity_type}</p>
                    {href ? <span className="row-start-1 justify-self-end text-xs font-medium text-primary md:row-auto">Details</span> : <span className="row-start-1 justify-self-end text-xs text-muted-foreground md:row-auto">Details</span>}
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
