import Link from "next/link";
import { CalendarRange, ClipboardCheck, LayoutDashboard, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPermissionMap } from "@/server/auth/permissions";

const items = [
  { id: "overview", href: "/attendance", label: "Overview", icon: LayoutDashboard },
  { id: "schedule", href: "/attendance/schedule", label: "Schedule", icon: CalendarRange },
  { id: "review", href: "/attendance/review", label: "Actual Attendance", icon: ClipboardCheck },
];

export async function AttendanceWorkspaceNav({ current }: { current: "overview" | "schedule" | "review" | "settings" }) {
  const permissions = await getPermissionMap(["shift_template.manage"]);
  const canManage = permissions["shift_template.manage"];
  const visible=[...items,...(canManage?[{id:"settings",href:"/attendance/settings",label:"Settings",icon:Settings2}]:[])];
  return <nav aria-label="Attendance workspace" className="sb-work-surface grid min-w-0 gap-1 overflow-x-auto p-1" style={{gridTemplateColumns:`repeat(${visible.length}, minmax(0, 1fr))`}}>{visible.map(({ id, href, label, icon: Icon }) => { const active=id===current;return <Link key={href} href={href} aria-current={active?"page":undefined} className={cn("inline-flex h-9 min-w-0 whitespace-nowrap items-center justify-center gap-1.5 rounded-[var(--sb-radius-control)] px-2 text-[11px] font-semibold transition-colors sm:h-8 sm:gap-2 sm:px-3 sm:text-xs",active?"bg-[var(--sb-green-100)] text-[var(--sb-green-900)] shadow-[inset_0_0_0_1px_var(--sb-green-200)]":"text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-text)]")}><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/><span>{label}</span></Link>})}</nav>;
}
