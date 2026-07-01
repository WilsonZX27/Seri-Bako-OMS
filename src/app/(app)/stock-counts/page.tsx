import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocationsForSelect } from "@/server/queries/common";
import { getStockCounts } from "@/server/queries/stock-counts";

const statuses = ["draft", "submitted", "reviewed", "approved", "posted", "rejected", "cancelled"];

function statusVariant(status: string) {
  if (["approved", "posted"].includes(status)) return "success";
  if (status === "rejected" || status === "cancelled") return "danger";
  if (status === "submitted" || status === "reviewed") return "warning";
  return "secondary";
}

export default async function StockCountsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [counts, locations] = await Promise.all([getStockCounts(filters), getLocationsForSelect()]);
  return (
    <>
      <PageHeader title="Stock Counts" description="Daily physical counts compared against theoretical stock." action={{ href: "/stock-counts/new", label: "New Count" }} secondaryAction={{ href: "/stock-counts/scan", label: "Scan Mode" }} />
      <div className="p-5">
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.rows.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell className="font-medium">{count.count_no}</TableCell>
                    <TableCell>{count.count_date}</TableCell>
                    <TableCell>{count.location_name ?? "-"}</TableCell>
                    <TableCell><Badge variant={statusVariant(count.status)}>{count.status}</Badge></TableCell>
                    <TableCell className="text-right">{count.line_count}</TableCell>
                    <TableCell className="text-right">{count.high_variance_count}</TableCell>
                    <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/stock-counts/${count.id}`}>View</Link></Button></TableCell>
                  </TableRow>
                ))}
                {!counts.rows.length ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No stock counts found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={counts.page} totalPages={counts.totalPages} totalRows={counts.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
