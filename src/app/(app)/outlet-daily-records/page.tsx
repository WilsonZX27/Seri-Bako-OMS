import Link from "next/link";
import { Pencil } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PaginationControls } from "@/components/sortable-table";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { hasPermission } from "@/server/auth/permissions";
import { getOutletDailyFormOptions, getOutletDailyRecords } from "@/server/queries/outlet-daily-records";

const statuses = ["draft", "morning_recorded", "evening_completed", "reviewed", "void"];
const dateTime = (value: string) => new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(value));
const statusGuidance = (status: string) => status === "evening_completed" ? "Needs review" : status === "reviewed" ? "Locked" : ["draft", "morning_recorded"].includes(status) ? "Needs evening entry" : "Locked";

export default async function OutletDailyRecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [data, options, canCreate] = await Promise.all([getOutletDailyRecords(filters), getOutletDailyFormOptions(), hasPermission("outlet_daily_record.create")]);
  const filtered = hasActiveFilters(filters);
  return <>
    <PageHeader title="Outlet Daily Records" description="Morning receiving and evening wastage capture by outlet." />
    <WorkspaceGrid rightRail={<>
      <ConsoleSection title="Actions">{canCreate ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/outlet-daily-records/new">New Daily Record</Link></Button> : <p className="text-xs text-muted-foreground">Your role has read-only access.</p>}</ConsoleSection>
      <ConsoleSection title="Today"><div className="space-y-2 text-xs"><p className="flex justify-between"><span>Records</span><strong>{data.summary.today_records}</strong></p><p className="flex justify-between"><span>Total received</span><strong>{formatNumber(data.summary.today_received)}</strong></p><p className="flex justify-between"><span>Missing evening</span><strong>{data.summary.missing_evening}</strong></p></div></ConsoleSection>
      <ConsoleSection title="Review Queue"><p className="text-xs"><span className="text-muted-foreground">Records needing review</span><br /><strong>{data.summary.needs_review}</strong></p></ConsoleSection>
    </>}>
      <div className="overflow-hidden border bg-card">
        <FilterBar resultCount={data.totalRows} resetHref="/outlet-daily-records" filtered={filtered}>
          <Input name="date" type="date" defaultValue={filters.date ?? ""} aria-label="Record date" />
          <SelectNative name="branch" defaultValue={filters.branch ?? "all"}><option value="all">All outlets / branches</option>{options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</SelectNative>
          <SelectNative name="status" defaultValue={filters.status ?? "all"}><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</SelectNative>
          <Button type="submit" variant="secondary">Search</Button>
        </FilterBar>
        <Table mobileHidden aria-label="Outlet daily records"><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Outlet</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Wastage</TableHead><TableHead className="text-right">Wastage %</TableHead><TableHead>Submitted By</TableHead><TableHead>Updated</TableHead><TableHead className="w-12 text-right">Action</TableHead></TableRow></TableHeader><TableBody>
          {data.rows.map((row) => <DataGridRow key={row.id} href={`/outlet-daily-records/${row.id}`} className={row.record_date === data.summary.today ? "bg-warning/5" : undefined}><TableCell><span className="whitespace-nowrap">{row.record_date}</span>{row.record_date === data.summary.today ? <p className="text-xs font-medium text-warning">Today</p> : null}</TableCell><TableCell className="font-medium">{row.branch_name}</TableCell><TableCell><StatusBadge status={row.status} /><p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{statusGuidance(row.status)}</p></TableCell><TableCell className="text-right">{formatNumber(row.total_received)}</TableCell><TableCell className="text-right">{formatNumber(row.total_wastage)}</TableCell><TableCell className="text-right">{formatNumber(row.wastage_percent)}%</TableCell><TableCell>{row.submitted_by_name ?? "Draft"}</TableCell><TableCell className="whitespace-nowrap">{dateTime(row.updated_at)}</TableCell><TableCell className="text-right"><TableActionLink href={`/outlet-daily-records/${row.id}`} label={`Open ${row.branch_name} daily record`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell></DataGridRow>)}
          {!data.rows.length ? <TableRow><TableCell colSpan={9}><EmptyState title={filtered ? "No daily records match these filters" : "No outlet daily records yet"} description={filtered ? "Reset the filters or widen the search." : "Daily receiving and wastage records will appear here."} action={filtered ? { href: "/outlet-daily-records", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
        </TableBody></Table>
        <OperationalList ariaLabel="Outlet daily records">
          {data.rows.map((row) => <OperationalListRow key={row.id} href={`/outlet-daily-records/${row.id}`} label={`Open ${row.branch_name} daily record`} primary={row.branch_name} status={<StatusBadge status={row.status} />} secondary={`${row.record_date}${row.record_date === data.summary.today ? " · Today" : ""}`} meta={`${formatNumber(row.total_received)} received`} />)}
          {!data.rows.length ? <EmptyState title={filtered ? "No daily records match these filters" : "No outlet daily records yet"} description={filtered ? "Reset the filters or widen the search." : "Daily receiving and wastage records will appear here."} action={filtered ? { href: "/outlet-daily-records", label: "Reset filters" } : undefined} /> : null}
        </OperationalList>
        <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
      </div>
    </WorkspaceGrid>
  </>;
}
