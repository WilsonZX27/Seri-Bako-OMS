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
  return <nav aria-label="Attendance workspace" className="sb-work-surface flex min-w-0 gap-5 overflow-x-auto px-3">{visible.map(({ href, label, icon: Icon }) => { const active=label.toLowerCase()===current;return <Link key={href} href={href} aria-current={active?"page":undefined} className={cn("inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-1 text-xs font-semibold transition-colors",label==="Settings"&&"ml-auto",active?"border-[var(--sb-green-800)] text-[var(--sb-green-900)]":"border-transparent text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]")}><Icon className="h-4 w-4" aria-hidden="true"/>{label}</Link>})}</nav>;
}
