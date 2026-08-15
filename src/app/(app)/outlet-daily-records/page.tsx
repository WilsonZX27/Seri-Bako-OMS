import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PaginationControls } from "@/components/sortable-table";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { OutletDailyWastageChart } from "@/components/outlet-daily-wastage-chart";
import { OutletDailyCompletionMatrix } from "@/components/outlet-daily-completion-matrix";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatDateTime, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { hasPermission } from "@/server/auth/permissions";
import { getOutletDailyCompletionMatrix, getOutletDailyDemandTrend, getOutletDailyFormOptions, getOutletDailyRecords } from "@/server/queries/outlet-daily-records";
import { logServerError } from "@/server/observability/logger";

const statuses = ["draft", "morning_recorded", "evening_completed", "reviewed", "void"];
const statusGuidance = (status: string) => status === "evening_completed" ? "Posted · editable" : status === "reviewed" ? "Legacy reviewed record" : ["draft", "morning_recorded"].includes(status) ? "In progress" : "Locked";

export default async function OutletDailyRecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [data, options, canCreate, insights] = await Promise.all([
    getOutletDailyRecords(filters),
    getOutletDailyFormOptions(),
    hasPermission("outlet_daily_record.create"),
    Promise.allSettled([
      getOutletDailyDemandTrend({ period: "30", branch: filters.branch }),
      getOutletDailyCompletionMatrix({ branch: filters.branch }),
    ]),
  ]);
  const [trendResult, completionResult] = insights;
  if (trendResult.status === "rejected") logServerError(trendResult.reason, { source: "page.outletDailyRecords.wastageTrend" });
  if (completionResult.status === "rejected") logServerError(completionResult.reason, { source: "page.outletDailyRecords.completionMatrix" });
  const trend = trendResult.status === "fulfilled" ? trendResult.value : null;
  const completion = completionResult.status === "fulfilled" ? completionResult.value : null;
  const filtered = hasActiveFilters(filters);
  return <>
    <PageHeader title="Outlet Daily Records" description="Morning receiving and evening wastage capture by outlet." />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions">{canCreate ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/outlet-daily-records/new">New Daily Record</Link></Button> : <p className="text-xs text-muted-foreground">Your role has read-only access.</p>}</ConsoleSection>
      <ConsoleSection title="Today"><div className="space-y-2 text-xs"><p className="flex justify-between"><span>Records</span><strong>{data.summary.today_records}</strong></p><p className="flex justify-between"><span>Qty sent</span><strong>{formatNumber(data.summary.today_sent)}</strong></p><p className="flex justify-between"><span>Total received</span><strong>{formatNumber(data.summary.today_received)}</strong></p><p className="flex justify-between"><span>Incomplete</span><strong>{data.summary.missing_evening}</strong></p></div></ConsoleSection>
      <ConsoleSection title="Completion"><p className="text-xs"><span className="text-muted-foreground">Ready to post</span><br /><strong>{data.summary.needs_review}</strong></p></ConsoleSection>
    </>}>
      <div className="min-w-0 max-w-full space-y-3 overflow-x-clip" data-outlet-daily-list-workspace>
        <OutletDailyCompletionMatrix dates={completion?.dates ?? []} rows={completion?.rows ?? []} summary={completion?.summary ?? null} unavailable={!completion} />
        <OutletDailyWastageChart points={trend?.daily ?? []} branch={filters.branch} unavailable={!trend} />
        <FilterBar
          resultCount={data.totalRows}
          resetHref="/outlet-daily-records"
          filtered={filtered}
          phonePrimary="drawer"
          className="sb-list-filters--date-first"
          phoneEndAction={canCreate ? <Button asChild size="icon" aria-label="New Daily Record"><Link href="/outlet-daily-records/new"><Plus className="h-5 w-5" aria-hidden="true" /><span className="sr-only">New Daily Record</span></Link></Button> : null}
        >
            <Input name="date" type="date" defaultValue={filters.date ?? ""} aria-label="Record date" className="sb-filter-date" />
            <SelectControl name="branch" value={filters.branch ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...options.branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
            <SelectControl name="status" value={filters.status ?? "all"} ariaLabel="Status" options={[{ value: "all", label: "All statuses" }, ...statuses.map((status) => ({ value: status, label: status.replaceAll("_", " ") }))]} />
            {filtered ? <Button asChild variant="secondary"><Link href="/outlet-daily-records">Reset</Link></Button> : <Button type="submit" variant="secondary">Search</Button>}
        </FilterBar>
        <div className="sb-list-content-card overflow-hidden" data-mobile-list-content-card>
        <Table mobileHidden aria-label="Outlet daily records" stickyColumn="second"><TableHeader><TableRow><TableHead className="w-16 text-center">Action</TableHead><TableHead>Date</TableHead><TableHead>Outlet</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Wastage<br /><span className="font-normal text-muted-foreground">Wastage %</span></TableHead><TableHead>Submitted By</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>
          {data.rows.map((row) => <DataGridRow key={row.id} href={`/outlet-daily-records/${row.id}`} className={row.record_date === data.summary.today ? "bg-warning/5" : undefined}><TableCell className="w-16 p-0 text-center"><TableActionLink href={`/outlet-daily-records/${row.id}`} label={`Open ${row.branch_name} daily record`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell><TableCell><span className="whitespace-nowrap">{formatDateOnly(row.record_date)}</span>{row.record_date === data.summary.today ? <p className="text-xs font-medium text-warning">Today</p> : null}</TableCell><TableCell className="font-medium">{row.branch_name}</TableCell><TableCell><StatusBadge status={row.status} /><p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{statusGuidance(row.status)}</p></TableCell><TableCell className="text-right">{formatNumber(row.total_received)}</TableCell><TableCell className="text-right"><span className="block">{formatNumber(row.total_wastage)}</span><span className="block text-[11px] text-muted-foreground">{formatNumber(row.wastage_percent)}%</span></TableCell><TableCell>{row.submitted_by_name ?? "Draft"}</TableCell><TableCell className="whitespace-nowrap">{formatDateTime(row.updated_at).split(" ").map((part) => <span key={part} className="block">{part}</span>)}</TableCell></DataGridRow>)}
          {!data.rows.length ? <TableRow><TableCell colSpan={8}><EmptyState title={filtered ? "No daily records match these filters" : "No outlet daily records yet"} description={filtered ? "Reset the filters or widen the search." : "Daily receiving and wastage records will appear here."} action={filtered ? { href: "/outlet-daily-records", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
        </TableBody></Table>
        <OperationalList ariaLabel="Outlet daily records">
          {data.rows.map((row) => <OperationalListRow
            key={row.id}
            href={`/outlet-daily-records/${row.id}`}
            label={`Open ${row.branch_name} daily record`}
            primary={<div><span>{row.branch_name}</span><p className="text-[11px] font-normal text-[var(--sb-text-muted)]">{statusGuidance(row.status)}</p></div>}
            status={<StatusBadge status={row.status} />}
            secondary={`${formatDateOnly(row.record_date)}${row.record_date === data.summary.today ? " · Today" : ""}${row.total_wastage > 0 ? ` · ${formatNumber(row.total_wastage)} waste` : ""}`}
            meta={`${formatNumber(row.total_received)} received`}
          />)}
          {!data.rows.length ? <EmptyState title={filtered ? "No daily records match these filters" : "No outlet daily records yet"} description={filtered ? "Reset the filters or widen the search." : "Daily receiving and wastage records will appear here."} action={filtered ? { href: "/outlet-daily-records", label: "Reset filters" } : undefined} /> : null}
        </OperationalList>
        <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
        </div>
      </div>
    </WorkspaceGrid>
  </>;
}
