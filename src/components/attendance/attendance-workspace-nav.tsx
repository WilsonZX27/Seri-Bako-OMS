import { CalendarRange, ClipboardCheck, FileText, LayoutDashboard, Settings2 } from "lucide-react";
import { WorkspaceTabs } from "@/components/ui/workspace-tabs";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { getPermissionMap } from "@/server/auth/permissions";

const items = [
  { id: "overview", href: "/attendance", label: "Overview", icon: LayoutDashboard },
  { id: "schedule", href: "/attendance/schedule", label: "Schedule", icon: CalendarRange },
  { id: "review", href: "/attendance/review", label: "Attendance", icon: ClipboardCheck },
  { id: "confirmations", href: "/attendance/confirmations", label: "Confirmation", icon: ClipboardCheck },
  { id: "payslips", href: "/attendance/payslips", label: "Payslips", icon: FileText },
];

export async function AttendanceWorkspaceNav({ current }: { current: "overview" | "schedule" | "review" | "settings" | "confirmations" | "payslips" }) {
  const [permissions, actor] = await Promise.all([
    getPermissionMap(["shift_template.manage", "schedule.read"]),
    requireActiveTenantActor(),
  ]);
  const canManage = permissions["shift_template.manage"];
  const visible = actor.roleCode === "chef"
    ? items.filter((item) => item.id === "schedule" && permissions["schedule.read"])
    : [...items,...(canManage?[{id:"settings",href:"/attendance/settings",label:"Settings",icon:Settings2}]:[])];
  return <WorkspaceTabs label="Attendance workspace" current={current} items={visible} compact />;
}
