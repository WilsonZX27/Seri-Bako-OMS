import { PageHeader } from "@/components/ui/page-header";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { ConfirmationWorkspace } from "@/components/attendance/confirmation-workspace";
export default function Page() {
  return <><PageHeader title="Attendance confirmation" description="Review the current attendance version." contentWidth="wide" /><AttendanceWorkspaceNav current="confirmations" /><ConfirmationWorkspace /></>;
}
