import { PageHeader } from "@/components/ui/page-header";
import { AttendanceWorkspaceNav } from "@/components/attendance/attendance-workspace-nav";
import { PayslipWorkspace } from "@/components/attendance/payslip-workspace";
export default function Page() {
  return <><PageHeader title="Payslips" description="Your released payslips." contentWidth="wide" /><AttendanceWorkspaceNav current="confirmations" /><PayslipWorkspace /></>;
}
