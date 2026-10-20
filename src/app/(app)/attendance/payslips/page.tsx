import { PageHeader } from "@/components/ui/page-header";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { PayslipWorkspace } from "@/components/attendance/payslip-workspace";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
export default function Page() {
  return <><PageHeader title="Payslips" description="Your released payslips." contentWidth="wide" /><WorkspaceGrid hideMobileConsole rightRail={<ConsoleSection title="Payslip access" kind="status"><p className="text-sm text-muted-foreground">Employees can view their payslips after People approves and releases them.</p><p className="mt-2 text-sm text-muted-foreground">Contact People if a released period is missing or needs correction.</p></ConsoleSection>}><AttendanceWorkspaceNav current="payslips" /><PayslipWorkspace /></WorkspaceGrid></>;
}
