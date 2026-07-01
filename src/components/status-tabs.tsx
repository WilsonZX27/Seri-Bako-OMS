import Link from "next/link";

export function StatusTabs({ statuses, activeStatus }: { statuses: string[]; activeStatus?: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b px-4 py-3">
      <Link href="?" className={`rounded-md px-3 py-1.5 text-sm ${!activeStatus || activeStatus === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
        All
      </Link>
      {statuses.map((status) => (
        <Link
          key={status}
          href={`?status=${status}`}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${activeStatus === status ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
        >
          {status.replaceAll("_", " ")}
        </Link>
      ))}
    </div>
  );
}
