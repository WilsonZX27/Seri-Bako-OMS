import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Pencil, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";
import { StatusTabs } from "@/components/status-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <PageHeader title="Stock Counts" description="Daily physical counts compared against theoretical stock." />
      <RightConsoleMount>
        <ConsoleSection title="Actions">
          <Button asChild size="sm" className="w-full">
            <Link href="/stock-counts/new">New Stock Count</Link>
          </Button>
        </ConsoleSection>
        <ConsoleSection title="Stock Count Summary">
          <div className="grid gap-1.5 text-xs">
            {insights.map((item) => (
              <div key={item.label} className="flex justify-between gap-3 px-1 py-0.5">
                <span className={item.active ? "font-semibold text-foreground" : "text-muted-foreground"}>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </ConsoleSection>
        <ConsoleSection title="Help">
          <p className="text-xs text-muted-foreground">Counts compare physical stock against system balance.</p>
        </ConsoleSection>
      </RightConsoleMount>
      <div className="space-y-4 p-5">
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="sb-list-filters">
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
                  <SortableHead label="Count No" column="count_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Date" column="count_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Location</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">High Variance</TableHead>
                  <TableHead className="w-12 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.rows.map((count) => (
                  <DataGridRow key={count.id} href={`/stock-counts/${count.id}`}>
                    <TableCell className="font-medium">{count.count_no}</TableCell>
                    <TableCell>{count.count_date}</TableCell>
                    <TableCell>{count.location_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={count.status} /></TableCell>
                    <TableCell className="text-right">{count.line_count}</TableCell>
                    <TableCell className="text-right">{count.high_variance_count}</TableCell>
                    <TableCell className="text-right"><TableActionLink href={`/stock-counts/${count.id}`} label={`Open ${count.count_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
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
