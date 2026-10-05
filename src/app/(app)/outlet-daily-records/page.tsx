import { OutstandingDailyRecords } from "@/components/outstanding-daily-records";
import { OutletDailyWorkspaceNav } from "@/components/outlet-daily-workspace-nav";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { OutletDailyExportDialog } from "@/components/outlet-daily-export-dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { StatusBadge } from "@/components/ui/status-badge";
import { Notice } from "@/components/ui/system-states";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatDateTime, formatNumber, formatQuantity } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { hasPermission } from "@/server/auth/permissions";
import { getOutletDailyHistoricalContext, getOutletDailyFormOptions, getOutletDailyRecords } from "@/server/queries/outlet-daily-records";
import { logServerError } from "@/server/observability/logger";

const statuses = ["draft", "morning_recorded", "evening_completed", "void"];
const statusLabels: Record<string, string> = { draft: "Draft", morning_recorded: "Morning recorded", evening_completed: "Ready to post", void: "Void" };
const formatWastageRate = (value: number) => new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(value);
const outletProgress = (row: { status: string; qty_sent_state: string; received_pending_lines: number; sales_review_status?: string | null }) => {
  if (row.status === "reviewed" && row.sales_review_status === "needs_review") return { status: "attention", label: "Attention" };
  if (row.status === "reviewed") return { status: "posted", label: "Posted" };
  if (row.status === "evening_completed") return { status: "ready_to_post", label: "Ready to post" };
  if (row.status === "void") return { status: "void", label: "Void" };
  if (row.qty_sent_state === "confirmed" && row.received_pending_lines === 0) return { status: "ready_to_post", label: "Ready to post" };
  return { status: "in_progress", label: "In progress" };
};

export default async function OutletDailyRecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  let data: Awaited<ReturnType<typeof getOutletDailyRecords>>;
  let options: Awaited<ReturnType<typeof getOutletDailyFormOptions>>;
  let history: Awaited<ReturnType<typeof getOutletDailyHistoricalContext>>;
  let canCreate = false;
  let canExport = false;
  let canViewSentGaps = false;
  try {
    [data, options, canCreate, canExport, canViewSentGaps, history] = await Promise.all([
      getOutletDailyRecords(filters),
      getOutletDailyFormOptions(),
      hasPermission("outlet_daily_record.create"),
      hasPermission("outlet_daily_record.view"),
      hasPermission("outlet_daily_record.view_all"),
      getOutletDailyHistoricalContext(),
    ]);
  } catch (error) {
    logServerError(error, { source: "page.outletDailyRecords.source" });
    return <>
      <PageHeader title="Outlet Daily Records" description="Morning receiving and evening wastage by outlet." contentWidth="wide" />
      <WorkspaceGrid tabletCanvas="wide">
        <Notice tone="warning" title="Outlet daily data unavailable">
          Receiving data could not be verified, so no zero totals are shown. Reload to retry once the source is available.
          <span className="mt-2 block"><Link className="font-semibold underline underline-offset-2" href="/outlet-daily-records">Retry</Link></span>
        </Notice>
      </WorkspaceGrid>
    </>;
  }
  const filtered = hasActiveFilters(filters);
  return <>
    <PageHeader title="Outlet Daily Records" description="Morning receiving and evening wastage by outlet." action={canCreate ? { href: "/outlet-daily-records/new", label: "New Daily Record" } : undefined} hideTabletCreateFab contentWidth="wide" />
    <WorkspaceGrid className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions">
        {canCreate ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/outlet-daily-records/new">New Daily Record</Link></Button> : <p className="text-xs text-muted-foreground">Your role has read-only access.</p>}
        {canExport ? <OutletDailyExportDialog branches={options.branches} /> : null}
      </ConsoleSection>
      <ConsoleSection title={history.summary_date?`Completed · ${formatDateOnly(history.summary_date)}`:"Completed data before today"}><p className="mb-3 text-xs text-muted-foreground">{history.summary_date?"Latest day with completed records. Totals include completed records only.":"No completed historical records yet."}</p><dl className="divide-y divide-[var(--sb-border-soft)] text-xs">
        <div className="flex items-center justify-between gap-4 pb-2"><dt className="font-medium text-[var(--sb-text)]">Records</dt><dd className="text-lg font-semibold tabular-nums text-[var(--sb-text)]">{history.summary.today_records}</dd></div>
        <div className="flex items-start justify-between gap-4 py-2"><dt className="font-medium text-[var(--sb-text)]">Qty sent</dt><dd className="font-semibold tabular-nums">{history.summary.today_sent === null ? "Unavailable" : formatNumber(history.summary.today_sent)}</dd></div>
        <div className="flex items-start justify-between gap-4 py-2"><dt className="font-medium text-[var(--sb-text)]">Total received</dt><dd className={`text-right font-semibold tabular-nums ${history.summary.today_received === null || history.summary.today_received_zero_with_sent > 0 ? "text-warning" : ""}`}>{history.summary.today_received === null ? "Unavailable" : history.summary.today_received_zero_with_sent > 0 ? `${formatNumber(history.summary.today_received)} · verify` : formatNumber(history.summary.today_received)}</dd></div>
        <div className="grid grid-cols-3 gap-3 pt-2"><div><dt className="text-[10px] text-muted-foreground">Posted</dt><dd className="mt-0.5 font-semibold tabular-nums">{history.summary.posted_today}</dd></div><div><dt className="text-[10px] text-muted-foreground">Ready</dt><dd className="mt-0.5 font-semibold tabular-nums">{history.summary.ready_to_post}</dd></div><div><dt className="text-[10px] text-muted-foreground">In progress</dt><dd className="mt-0.5 font-semibold tabular-nums">{history.summary.missing_evening}</dd></div></div>
      </dl></ConsoleSection>
      <OutstandingDailyRecords history={history}/>
    </>}>
      <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-x-clip" data-outlet-daily-list-workspace>
        <OutletDailyWorkspaceNav current="records" />
        <div className="flex min-w-0 flex-col gap-3" data-outlet-daily-primary>
          <FilterBar
          resultCount={data.totalRows}
          resetHref="/outlet-daily-records"
          filtered={filtered}
          phonePrimary="drawer"
          className="sb-list-filters--date-first sb-list-filters--balanced sb-outlet-daily-filters"
        >
            <Input name="date" type="date" defaultValue={filters.date ?? ""} aria-label="Record date" className="sb-filter-date" />
            <SelectControl name="branch" value={filters.branch ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...options.branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
            <SelectControl name="status" value={filters.status ?? "all"} ariaLabel="Status" options={[{ value: "all", label: "All statuses" }, ...statuses.map((status) => ({ value: status, label: statusLabels[status] ?? status }))]} />
            {canViewSentGaps ? <SelectControl name="sent_state" value={filters.sent_state ?? "all"} ariaLabel="Qty sent state" options={[{ value: "all", label: "All Qty Sent" }, { value: "missing", label: "Qty Sent missing" }]} /> : null}
              <Button type="submit" variant="secondary" data-list-action="primary">Search</Button>
              {filtered ? <Button asChild variant="secondary" data-list-action="secondary"><Link href="/outlet-daily-records">Reset</Link></Button> : null}
          </FilterBar>
          <div className="sb-list-content-card overflow-hidden" data-mobile-list-content-card data-outlet-daily-record-list>
        <Table className="sb-outlet-daily-table" mobileHidden aria-label="Outlet daily records" stickyColumn="second"><TableHeader><TableRow><TableHead>Action</TableHead><SortableHead label="Date" column="date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /><TableHead>Outlet</TableHead>{canViewSentGaps ? <TableHead>Qty Sent</TableHead> : null}<SortableHead label="Record status" column="outlet" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Wastage qty<br /><span className="font-normal text-muted-foreground">Rate</span></TableHead><TableHead>Updated<br />By</TableHead><SortableHead label="Last Updated" column="updated" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /></TableRow></TableHeader><TableBody>
           {data.rows.map((row) => { const progress = outletProgress(row); return <DataGridRow key={row.id} href={`/outlet-daily-records/${row.id}`} className={row.record_date === data.summary.today ? "bg-[var(--sb-success-soft)]" : undefined}><TableCell><TableActionLink href={`/outlet-daily-records/${row.id}`} label={`Open ${row.branch_name} daily record`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell><TableCell><span className="whitespace-nowrap">{formatDateOnly(row.record_date)}</span>{row.record_date === data.summary.today ? <span className="mt-1 inline-flex rounded-full bg-[var(--sb-info-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--sb-info)]">Today</span> : null}</TableCell><TableCell className="font-medium">{row.branch_name}</TableCell>{canViewSentGaps ? <TableCell><span className="text-xs font-medium">{row.total_sent === null ? "Not confirmed" : formatNumber(row.total_sent)}</span>{row.qty_sent_state !== "confirmed" ? <p className="mt-1 text-[11px] text-muted-foreground">{row.qty_sent_state === "draft" ? "Needs confirmation" : "Needs entry"}</p> : null}</TableCell> : null}<TableCell><StatusBadge status={progress.status} /></TableCell><TableCell className="text-right">{row.total_received === null ? <span className="text-warning" title={`${row.received_pending_lines} food line${row.received_pending_lines === 1 ? "" : "s"} still need a Received value`}><span className="block">Pending</span><span className="block text-[11px] font-normal">{row.received_pending_lines} line{row.received_pending_lines === 1 ? "" : "s"}</span></span> : row.received_zero_with_sent ? <span className="text-warning" title="Qty sent is recorded but no receipt quantity has been confirmed">0 · verify</span> : formatNumber(row.total_received)}</TableCell><TableCell className="text-right" title="Wastage rate = wastage quantity divided by received quantity"><span className="block">{formatQuantity(row.total_wastage)}</span><span className="block text-[11px] text-muted-foreground">{!["evening_completed", "reviewed"].includes(row.status) ? "Not final" : row.wastage_percent === null ? row.received_pending_lines > 0 ? "Pending receipt" : "—" : `${formatWastageRate(row.wastage_percent)}% rate`}</span></TableCell><TableCell>{row.updated_by_name ?? "—"}</TableCell><TableCell className="whitespace-nowrap">{formatDateTime(row.updated_at).split(" ").map((part, index) => <span key={`${part}-${index}`} className={index === 0 ? "block" : "block text-xs text-muted-foreground"}>{part}</span>)}</TableCell></DataGridRow>; })}
          {!data.rows.length ? <TableRow><TableCell colSpan={canViewSentGaps ? 9 : 8}><EmptyState title={filtered ? "No daily records match these filters" : "No outlet daily records yet"} description={filtered ? "Reset the filters or widen the search." : "Daily receiving and wastage records will appear here."} action={filtered ? { href: "/outlet-daily-records", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
        </TableBody></Table>
        <OperationalList ariaLabel="Outlet daily records">
          {data.rows.map((row) => <OperationalListRow
            key={row.id}
            href={`/outlet-daily-records/${row.id}`}
            label={`Open ${row.branch_name} daily record`}
            primary={<span>{row.branch_name}</span>}
            status={<StatusBadge status={outletProgress(row).status} />}
            secondary={`${formatDateOnly(row.record_date)}${row.record_date === data.summary.today ? " · Today" : ""}`}
            detail={<dl className="mt-1 grid max-w-sm grid-cols-3 gap-2"><div className="min-w-0"><dt className="text-[10px] uppercase tracking-wide">Qty sent</dt><dd className="truncate font-medium">{canViewSentGaps ? row.qty_sent_state === "confirmed" ? "Recorded" : row.qty_sent_state === "draft" ? "Confirm" : "Missing" : "Restricted"}</dd></div><div className="min-w-0"><dt className="text-[10px] uppercase tracking-wide">Received</dt><dd className="truncate font-medium">{row.total_received === null ? "Unavailable" : row.received_zero_with_sent ? "0 · verify" : formatNumber(row.total_received)}</dd></div><div className="min-w-0"><dt className="text-[10px] uppercase tracking-wide">Wastage</dt><dd className="truncate font-medium">{row.total_wastage > 0 ? formatNumber(row.total_wastage) : "0"}</dd></div></dl>}
          />)}
          {!data.rows.length ? <EmptyState title={filtered ? "No daily records match these filters" : "No outlet daily records yet"} description={filtered ? "Reset the filters or widen the search." : "Daily receiving and wastage records will appear here."} action={filtered ? { href: "/outlet-daily-records", label: "Reset filters" } : undefined} /> : null}
        </OperationalList>
        <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} resetScrollOnPageChange />
          </div>
        </div>
      </div>
    </WorkspaceGrid>
  </>;
}
