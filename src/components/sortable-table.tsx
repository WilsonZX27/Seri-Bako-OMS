import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";

type SortableHeadProps = {
  label: string;
  column: string;
  currentSort?: string;
  currentDir?: string;
  searchParams: Record<string, string | undefined>;
  className?: string;
};

function buildHref(params: Record<string, string | undefined>, next: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries({ ...params, ...next }).forEach(([key, value]) => {
    if (value && value !== "all") search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "?";
}

export function SortableHead({ label, column, currentSort, currentDir, searchParams, className }: SortableHeadProps) {
  const active = currentSort === column;
  const nextDir = active && currentDir !== "desc" ? "desc" : "asc";
  const Icon = active ? (currentDir === "desc" ? ArrowDown : ArrowUp) : ChevronsUpDown;
  return (
    <TableHead className={className}>
      <Link href={buildHref(searchParams, { sort: column, dir: nextDir, page: "1" })} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <Icon className="h-3.5 w-3.5" />
      </Link>
    </TableHead>
  );
}

export function PaginationControls({
  page,
  totalPages,
  totalRows,
  searchParams,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {page} of {totalPages} - {totalRows} rows
      </span>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" aria-disabled={page <= 1}>
          <Link href={buildHref(searchParams, { page: String(Math.max(page - 1, 1)) })}>Previous</Link>
        </Button>
        <Button asChild variant="outline" size="sm" aria-disabled={page >= totalPages}>
          <Link href={buildHref(searchParams, { page: String(Math.min(page + 1, totalPages)) })}>Next</Link>
        </Button>
      </div>
    </div>
  );
}
