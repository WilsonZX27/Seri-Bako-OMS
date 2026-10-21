import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { PublishedScheduleList } from "@/components/attendance/published-schedule-list";
import { getOwnPublishedShifts } from "@/server/queries/attendance";

export default async function MyKitchenSchedulePage() {
  const shifts = await getOwnPublishedShifts();
  return <>
    <PageHeader title="My Schedule" description="Your published shifts for the current week." contentWidth="wide" />
    <WorkspaceGrid tabletRailMode="split" hideMobileConsole rightRail={<ConsoleSection title="Schedule access"><p className="text-xs text-muted-foreground">This view contains only your own published shifts.</p></ConsoleSection>}>
      <PublishedScheduleList shifts={shifts} allowRequests={false} />
    </WorkspaceGrid>
  </>;
}
