import Link from "next/link";
import { CalendarRange, ClipboardCheck, FileUp, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/attendance", label: "Overview", icon: LayoutDashboard },
  { href: "/attendance/schedule", label: "Schedule", icon: CalendarRange },
  { href: "/attendance/review", label: "Review", icon: ClipboardCheck },
  { href: "/attendance/imports", label: "Import", icon: FileUp },
];

export function AttendanceWorkspaceNav({ current }: { current: "overview" | "schedule" | "review" | "import" }) {
  return <nav aria-label="Attendance workspace" className="erp-surface flex min-w-0 gap-1 overflow-x-auto p-1">{items.map(({ href, label, icon: Icon }) => { const active = label.toLowerCase() === current; return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--sb-radius-control)] px-3 text-xs font-semibold transition-colors", active ? "bg-[var(--sb-green-900)] text-white" : "text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-text)]")}><Icon className="h-4 w-4" aria-hidden="true" />{label}</Link>; })}</nav>;
}
