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
  wrap?: boolean;
};

function buildHref(params: Record<string, string | undefined>, next: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries({ ...params, ...next }).forEach(([key, value]) => {
    if (value && value !== "all") search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "?";
}

export function SortableHead({ label, column, currentSort, currentDir, searchParams, className, wrap = false }: SortableHeadProps) {
  const active = currentSort === column;
  const nextDir = active && currentDir !== "desc" ? "desc" : "asc";
  const Icon = active ? (currentDir === "desc" ? ArrowDown : ArrowUp) : ChevronsUpDown;
  return (
    <TableHead className={className}>
      <Link href={buildHref(searchParams, { sort: column, dir: nextDir, page: "1" })} className="inline-flex items-center hover:text-foreground">
        <span className={wrap ? "max-w-16 whitespace-normal leading-tight" : "whitespace-nowrap"}>{label}</span>
        <Icon className="ml-1 h-3.5 w-3.5 shrink-0" />
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
  if (totalRows === 0) return null;
  const pageNumbers = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : page <= 4
      ? [1, 2, 3, 4, 5, -1, totalPages]
      : page >= totalPages - 3
        ? [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
        : [1, -1, page - 1, page, page + 1, -1, totalPages];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
      <span className="leading-6">
        Page {page} of {totalPages} - {totalRows} rows
      </span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        {page <= 1 ? (
          <Button type="button" variant="outline" size="sm" className="h-[var(--sb-control-height)] px-2 text-xs" disabled>
            Previous
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="h-[var(--sb-control-height)] px-2 text-xs">
            <Link href={buildHref(searchParams, { page: String(page - 1) })}>Previous</Link>
          </Button>
        )}
        {pageNumbers.map((pageNumber, index) => pageNumber === -1 ? (
          <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">…</span>
        ) : (
          <Button key={pageNumber} asChild variant={pageNumber === page ? "default" : "outline"} size="sm" className="h-[var(--sb-control-height)] min-w-[var(--sb-control-height)] px-2 text-xs" aria-current={pageNumber === page ? "page" : undefined}>
            <Link href={buildHref(searchParams, { page: String(pageNumber) })}>{pageNumber}</Link>
          </Button>
        ))}
        {page >= totalPages ? (
          <Button type="button" variant="outline" size="sm" className="h-[var(--sb-control-height)] px-2 text-xs" disabled>
            Next
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="h-[var(--sb-control-height)] px-2 text-xs">
            <Link href={buildHref(searchParams, { page: String(page + 1) })}>Next</Link>
          </Button>
        )}
      </nav>
    </div>
  );
}
