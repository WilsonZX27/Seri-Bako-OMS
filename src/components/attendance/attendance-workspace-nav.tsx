import { CalendarRange, ClipboardCheck, LayoutDashboard, Settings2 } from "lucide-react";
import { WorkspaceTabs } from "@/components/ui/workspace-tabs";
import { getPermissionMap } from "@/server/auth/permissions";

const items = [
  { id: "overview", href: "/attendance", label: "Overview", icon: LayoutDashboard },
  { id: "schedule", href: "/attendance/schedule", label: "Schedule", icon: CalendarRange },
  { id: "review", href: "/attendance/review", label: "Attendance", icon: ClipboardCheck },
  { id: "confirmations", href: "/attendance/confirmations", label: "Confirmation", icon: ClipboardCheck },
];

export async function AttendanceWorkspaceNav({ current }: { current: "overview" | "schedule" | "review" | "settings" | "confirmations" }) {
  const permissions = await getPermissionMap(["shift_template.manage"]);
  const canManage = permissions["shift_template.manage"];
  const visible=[...items,...(canManage?[{id:"settings",href:"/attendance/settings",label:"Settings",icon:Settings2}]:[])];
  return <WorkspaceTabs label="Attendance workspace" current={current} items={visible} compact />;
}
