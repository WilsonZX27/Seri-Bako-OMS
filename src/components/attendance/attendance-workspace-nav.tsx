import Link from "next/link";
import { CalendarRange, ClipboardCheck, FileUp, LayoutDashboard, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPermissionMap } from "@/server/auth/permissions";

const items = [
  { href: "/attendance", label: "Overview", icon: LayoutDashboard },
  { href: "/attendance/schedule", label: "Schedule", icon: CalendarRange },
  { href: "/attendance/review", label: "Review", icon: ClipboardCheck },
];

export async function AttendanceWorkspaceNav({ current }: { current: "overview" | "schedule" | "review" | "import" | "settings" }) {
  const permissions = await getPermissionMap(["attendance.import", "shift_template.manage"]);
  const canImport = permissions["attendance.import"];
  const canManage = permissions["shift_template.manage"];
  const visible=[...items,...(canImport?[{href:"/attendance/imports",label:"Import",icon:FileUp}]:[]),...(canManage?[{href:"/attendance/settings",label:"Settings",icon:Settings2}]:[])];
  return <nav aria-label="Attendance workspace" className="sb-work-surface grid min-w-0 grid-flow-col auto-cols-fr gap-1 overflow-x-auto p-1">{visible.map(({ href, label, icon: Icon }) => { const active=label.toLowerCase()===current;return <Link key={href} href={href} aria-current={active?"page":undefined} className={cn("inline-flex h-10 min-w-max whitespace-nowrap items-center justify-center gap-1.5 rounded-[var(--sb-radius-control)] px-2 text-[11px] font-semibold transition-colors sm:h-9 sm:gap-2 sm:px-3 sm:text-xs",active?"bg-[var(--sb-green-100)] text-[var(--sb-green-900)] shadow-[inset_0_0_0_1px_var(--sb-green-200)]":"text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-text)]")}><Icon className="h-4 w-4 shrink-0" aria-hidden="true"/><span>{label}</span></Link>})}</nav>;
}
