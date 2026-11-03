import { CalendarRange, ClipboardCheck, FileText, LayoutDashboard, Settings2 } from "lucide-react";
import { WorkspaceTabs } from "@/components/ui/workspace-tabs";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { getPermissionMap } from "@/server/auth/permissions";
import { getRouteAllowedRoles, getRoutePermissionCodes } from "@/server/auth/route-permissions";

const items = [
  { id: "overview", href: "/attendance", label: "Overview", icon: LayoutDashboard },
  { id: "schedule", href: "/attendance/schedule", label: "Schedule", icon: CalendarRange },
  { id: "review", href: "/attendance/review", label: "Attendance", icon: ClipboardCheck },
  { id: "confirmations", href: "/attendance/confirmations", label: "Confirmation", icon: ClipboardCheck },
  { id: "payslips", href: "/attendance/payslips", label: "Payslips", icon: FileText },
];

export async function getAttendanceWorkspaceAccess() {
  const candidates = [...items, { id: "settings", href: "/attendance/settings", label: "Settings", icon: Settings2 }];
  const codes = [...new Set(candidates.flatMap(item => getRoutePermissionCodes(item.href) ?? []))];
  const [permissions, actor] = await Promise.all([getPermissionMap(codes), requireActiveTenantActor()]);
  const visible = candidates.filter(item => {
    if (actor.roleCode === "chef" && item.id !== "schedule") return false;
    const roles = getRouteAllowedRoles(item.href);
    const required = getRoutePermissionCodes(item.href);
    return (!roles || roles.includes(actor.roleCode)) && (!required || required.some(code => permissions[code]));
  });
  return { visible, canReview: visible.some(item => item.id === "review") };
}

export async function AttendanceWorkspaceNav({ current }: { current: "overview" | "schedule" | "review" | "settings" | "confirmations" | "payslips" }) {
  const { visible } = await getAttendanceWorkspaceAccess();
  return <WorkspaceTabs label="Attendance workspace" current={current} items={visible} compact />;
}
