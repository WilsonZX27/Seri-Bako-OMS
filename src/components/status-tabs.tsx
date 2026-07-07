import Link from "next/link";
import { formatStatusLabel } from "@/lib/status-label";

type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b bg-white px-3 py-2">
      <Link href="?" className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${!activeStatus || activeStatus === "all" ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
        All
      </Link>
      {statuses.map((tab) => {
        const status = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? formatStatusLabel(tab) : tab.label;
        return (
        <Link
          key={status}
          href={`?status=${status}`}
          className={`whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-medium ${activeStatus === status ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          {label}
        </Link>
        );
      })}
    </div>
  );
}
