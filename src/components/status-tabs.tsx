import Link from "next/link";

type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b px-4 py-3">
      <Link href="?" className={`rounded-md px-3 py-1.5 text-sm ${!activeStatus || activeStatus === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
        All
      </Link>
      {statuses.map((tab) => {
        const status = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? tab.replaceAll("_", " ") : tab.label;
        return (
        <Link
          key={status}
          href={`?status=${status}`}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${activeStatus === status ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          {label}
        </Link>
        );
      })}
    </div>
  );
}
