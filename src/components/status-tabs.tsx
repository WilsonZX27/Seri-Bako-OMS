import Link from "next/link";
import { formatStatusLabel } from "@/lib/status-label";

type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b bg-white px-3 py-2">
      <Link href="?" className={`rounded-none border px-2.5 py-1 text-[11px] font-medium ${!activeStatus || activeStatus === "all" ? "border-[var(--sb-amber-700)] bg-[var(--sb-amber-700)] text-white" : "border-[var(--sb-border)] bg-white text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)]"}`}>
        All
      </Link>
      {statuses.map((tab) => {
        const status = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? formatStatusLabel(tab) : tab.label;
        return (
        <Link
          key={status}
          href={`?status=${status}`}
          className={`whitespace-nowrap rounded-none border px-2.5 py-1 text-[11px] font-medium ${activeStatus === status ? "border-[var(--sb-amber-700)] bg-[var(--sb-amber-700)] text-white" : "border-[var(--sb-border)] bg-white text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)]"}`}
        >
          {label}
        </Link>
        );
      })}
    </div>
  );
}
