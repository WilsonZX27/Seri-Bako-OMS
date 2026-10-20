import { PageHeader } from "@/components/ui/page-header";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { ConfirmationWorkspace } from "@/components/attendance/confirmation-workspace";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
export default function Page() {
  return <><PageHeader title="Attendance confirmation" description="Review the current attendance version." contentWidth="wide" /><WorkspaceGrid rightRail={<ConsoleSection title="Next step"><p className="text-xs text-muted-foreground">Compare planned hours with actual punches for each day. Confirm the current version or request a correction. Superseded versions remain available as history.</p></ConsoleSection>}><AttendanceWorkspaceNav current="confirmations" /><ConfirmationWorkspace /></WorkspaceGrid></>;
}
