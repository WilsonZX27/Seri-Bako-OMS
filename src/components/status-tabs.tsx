import Link from "next/link";
import { formatStatusLabel } from "@/lib/status-label";

type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b bg-white px-4 py-3">
      <Link href="?" className={`rounded-full border px-3 py-1.5 text-sm font-medium ${!activeStatus || activeStatus === "all" ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
        All
      </Link>
      {statuses.map((tab) => {
        const status = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? formatStatusLabel(tab) : tab.label;
        return (
        <Link
          key={status}
          href={`?status=${status}`}
          className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${activeStatus === status ? "border-primary bg-primary text-primary-foreground" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          {label}
        </Link>
        );
      })}
    </div>
  );
}
