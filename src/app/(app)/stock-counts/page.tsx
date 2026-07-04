import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Eye, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { KpiFilterStrip } from "@/components/ui/kpi-filter-strip";
import { SelectNative } from "@/components/ui/select-native";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocationsForSelect } from "@/server/queries/common";
import { getStockCounts } from "@/server/queries/stock-counts";

const statuses = ["draft", "submitted", "reviewed", "approved", "posted", "rejected", "cancelled"];

export default async function StockCountsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [counts, allCounts, locations] = await Promise.all([getStockCounts(filters), getStockCounts({ page: "all" }), getLocationsForSelect()]);
  const rows = allCounts.rows;
  const countByStatus = (...values: string[]) => rows.filter((row) => values.includes(row.status)).length;
  const insights = [
    { label: "Total", value: rows.length, href: "/stock-counts", active: !filters.status, icon: FileText },
    { label: "Draft", value: countByStatus("draft"), href: "/stock-counts?status=draft", active: filters.status === "draft", icon: FileText },
    { label: "In Review", value: countByStatus("submitted", "reviewed"), href: "/stock-counts?status=submitted", active: filters.status === "submitted", icon: ClipboardCheck },
    { label: "Approved", value: countByStatus("approved"), href: "/stock-counts?status=approved", active: filters.status === "approved", icon: CheckCircle2 },
    { label: "Posted", value: countByStatus("posted"), href: "/stock-counts?status=posted", active: filters.status === "posted", icon: CheckCircle2 },
    { label: "Rejected/Cancelled", value: countByStatus("rejected", "cancelled"), href: "/stock-counts?status=rejected", active: filters.status === "rejected", icon: XCircle },
  ];
  return (
    <>
      <PageHeader title="Stock Counts" description="Daily physical counts compared against theoretical stock." action={{ href: "/stock-counts/new", label: "New Count" }} secondaryAction={{ href: "/stock-counts/scan", label: "Scan Mode" }} />
      <div className="space-y-4 p-5">
        <KpiFilterStrip items={insights} />
        <div className="overflow-hidden rounded-lg border bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="grid gap-3 border-b p-4 md:grid-cols-[1fr_180px_180px_180px_auto_auto]">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search count no, location, remarks" />
            <SelectNative name="location_id" defaultValue={filters.location_id ?? "all"}>
              <option value="all">All locations</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.location_name}</option>)}
            </SelectNative>
            <Input name="from" type="date" defaultValue={filters.from ?? ""} />
            <Input name="to" type="date" defaultValue={filters.to ?? ""} />
            <Button type="submit" variant="secondary">Filter</Button>
            <Button asChild variant="ghost"><Link href="/stock-counts">Reset</Link></Button>
          </form>
          <DataGridHint text="Pro-tip: Double-click any row to open the stock count." />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <SortableHead label="Count No" column="count_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Date" column="count_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Location</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">High Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.rows.map((count) => (
                  <DataGridRow key={count.id} href={`/stock-counts/${count.id}`}>
                    <TableCell>
                      <Link href={`/stock-counts/${count.id}`} aria-label={`Quick view ${count.count_no}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{count.count_no}</TableCell>
                    <TableCell>{count.count_date}</TableCell>
                    <TableCell>{count.location_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={count.status} /></TableCell>
                    <TableCell className="text-right">{count.line_count}</TableCell>
                    <TableCell className="text-right">{count.high_variance_count}</TableCell>
                  </DataGridRow>
                ))}
                {!counts.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title="No stock counts found" description="Branch stock counts will appear here after kitchen users start a count." action={{ href: "/stock-counts/new", label: "New Count" }} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={counts.page} totalPages={counts.totalPages} totalRows={counts.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
