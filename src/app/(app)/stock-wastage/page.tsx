import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { PaginationControls } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { StatusTabs } from "@/components/status-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasActiveFilters } from "@/lib/table-state";
import { wastageReasons } from "@/lib/validations/stock-operations";
import { hasPermission } from "@/server/auth/permissions";
import { getStockWastage } from "@/server/queries/stock-operations";

const statuses = ["draft", "submitted", "approved", "posted", "rejected", "cancelled"];

export default async function StockWastagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [data, allData, canCreate] = await Promise.all([getStockWastage(filters), getStockWastage({ page: "all" }), hasPermission("stock_wastage.create")]);
  const rows = allData.rows;
  const count = (...values: string[]) => rows.filter((row) => values.includes(row.status)).length;
  const filtered = hasActiveFilters(filters);
  const emptyAction = filtered ? { href: "/stock-wastage", label: "Reset filters" } : canCreate ? { href: "/stock-wastage/new", label: "New Wastage" } : undefined;

  return <>
    <PageHeader title="Stock Wastage" description="Record expired, damaged, missing, or abnormal stock loss." action={canCreate ? { href: "/stock-wastage/new", label: "New wastage" } : undefined} />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions">{canCreate ? <Button asChild className="w-full" data-mobile-primary-action><Link href="/stock-wastage/new">New Wastage</Link></Button> : <p className="text-xs text-muted-foreground">Your role has read-only access.</p>}</ConsoleSection>
      <ConsoleSection title="Wastage Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{rows.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">In review</dt><dd className="font-semibold">{count("submitted", "approved")}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Posted</dt><dd className="font-semibold">{count("posted")}</dd></div></dl></ConsoleSection>
    </>}>
      <div className="overflow-hidden rounded-[2px] border bg-card">
        <StatusTabs statuses={statuses} activeStatus={filters.status} />
        <FilterBar resultCount={data.totalRows} resetHref="/stock-wastage" filtered={filtered}><Input name="search" defaultValue={filters.search ?? ""} placeholder="Search wastage no, reason, branch" /><SelectControl name="reason" defaultValue={filters.reason ?? "all"} ariaLabel="Reason" options={[{ value: "all", label: "All reasons" }, ...wastageReasons.map((reason) => ({ value: reason, label: reason.replaceAll("_", " ") }))]} /><FilterBarMore activeCount={Number(Boolean(filters.from)) + Number(Boolean(filters.to))} resetHref="/stock-wastage"><Input name="from" type="date" defaultValue={filters.from ?? ""} aria-label="From date" /><Input name="to" type="date" defaultValue={filters.to ?? ""} aria-label="To date" /></FilterBarMore>{filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}<Button type="submit">Search</Button></FilterBar>
        <DataGridHint text="Pro-tip: Double-click any row to open the wastage document." />
        <Table mobileHidden aria-label="Stock wastage"><TableHeader><TableRow><TableHead>No</TableHead><TableHead>Date</TableHead><TableHead>Branch</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Lines</TableHead><TableHead className="w-12 text-right">Action</TableHead></TableRow></TableHeader><TableBody>{data.rows.map((row) => <DataGridRow key={row.id} href={`/stock-wastage/${row.id}`}><TableCell className="font-medium">{row.wastage_no}</TableCell><TableCell>{row.wastage_date}</TableCell><TableCell>{row.branch_name ?? "-"}</TableCell><TableCell>{row.reason.replaceAll("_", " ")}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="text-right">{row.line_count}</TableCell><TableCell className="text-right"><TableActionLink href={`/stock-wastage/${row.id}`} label={`Open ${row.wastage_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell></DataGridRow>)}{!data.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title={filtered ? "No wastage matches these filters" : "No stock wastage yet"} description={filtered ? "Reset the filters or widen the search." : "Wastage appears after a permitted user records an operational loss."} action={emptyAction} /></TableCell></TableRow> : null}</TableBody></Table>
        <OperationalList ariaLabel="Stock wastage">{data.rows.map((row) => <OperationalListRow key={row.id} href={`/stock-wastage/${row.id}`} label={`Open ${row.wastage_no}`} primary={row.wastage_no} status={<StatusBadge status={row.status} />} secondary={`${row.branch_name ?? "Unknown branch"} · ${row.reason.replaceAll("_", " ")}`} meta={`${row.wastage_date} · ${row.line_count} lines`} />)}{!data.rows.length ? <EmptyState title={filtered ? "No wastage matches these filters" : "No stock wastage yet"} description={filtered ? "Reset the filters or widen the search." : "Wastage appears after a permitted user records an operational loss."} action={filtered ? emptyAction : undefined} /> : null}</OperationalList>
        <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
      </div>
    </WorkspaceGrid>
  </>;
}
