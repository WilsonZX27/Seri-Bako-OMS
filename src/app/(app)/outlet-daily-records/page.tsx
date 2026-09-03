import Link from "next/link";
import { Pencil } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { OutletDailyWastageChart } from "@/components/outlet-daily-wastage-chart";
import { OutletDailyCompletionMatrix } from "@/components/outlet-daily-completion-matrix";
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
import { getOutletDailyCompletionMatrix, getOutletDailyDemandTrend, getOutletDailyFormOptions, getOutletDailyRecords, getOutletDailyWastageCostSummary } from "@/server/queries/outlet-daily-records";
import { logServerError } from "@/server/observability/logger";

const statuses = ["draft", "morning_recorded", "evening_completed", "reviewed", "void"];
const formatWastageRate = (value: number) => new Intl.NumberFormat("en-MY", { maximumFractionDigits: 1 }).format(value);
const outletProgress = (row: { status: string; qty_sent_state: string; received_pending_lines: number }) => {
  if (["evening_completed", "reviewed"].includes(row.status)) return { status: "posted", label: "Posted" };
  if (row.status === "void") return { status: "void", label: "Void" };
  if (row.qty_sent_state === "confirmed" && row.received_pending_lines === 0) return { status: "ready_to_post", label: "Ready to post" };
  return { status: "in_progress", label: "In progress" };
};

export default async function OutletDailyRecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  let data: Awaited<ReturnType<typeof getOutletDailyRecords>>;
  let options: Awaited<ReturnType<typeof getOutletDailyFormOptions>>;
  let canCreate = false;
  let canExport = false;
  let canViewSentGaps = false;
  let canViewWastageCost = false;
  let wastageCost: Awaited<ReturnType<typeof getOutletDailyWastageCostSummary>>;
  let insights: [
    PromiseSettledResult<Awaited<ReturnType<typeof getOutletDailyDemandTrend>>>,
    PromiseSettledResult<Awaited<ReturnType<typeof getOutletDailyCompletionMatrix>>>,
  ];
  try {
    [data, options, canCreate, canExport, canViewSentGaps, canViewWastageCost, wastageCost, insights] = await Promise.all([
      getOutletDailyRecords(filters),
      getOutletDailyFormOptions(),
      hasPermission("outlet_daily_record.create"),
      hasPermission("outlet_daily_record.view"),
      hasPermission("outlet_daily_record.view_all"),
      hasPermission("outlet_daily_record.view_all"),
      getOutletDailyWastageCostSummary(),
      Promise.allSettled([
        getOutletDailyDemandTrend({ period: "30", branch: filters.branch }),
        getOutletDailyCompletionMatrix({ branch: filters.branch, history_date: filters.history_date }),
      ]),
    ]);
  } catch (error) {
    logServerError(error, { source: "page.outletDailyRecords.source" });
    return <>
      <PageHeader title="Outlet Daily Records" description="Morning receiving and evening wastage capture by outlet." contentWidth="wide" />
      <WorkspaceGrid tabletCanvas="wide">
        <Notice tone="warning" title="Outlet daily data unavailable">
          Receiving data could not be verified, so no zero totals are shown. Reload to retry once the source is available.
          <span className="mt-2 block"><Link className="font-semibold underline underline-offset-2" href="/outlet-daily-records">Retry</Link></span>
        </Notice>
      </WorkspaceGrid>
    </>;
  }
  const [trendResult, completionResult] = insights;
  if (trendResult.status === "rejected") logServerError(trendResult.reason, { source: "page.outletDailyRecords.wastageTrend" });
  if (completionResult.status === "rejected") logServerError(completionResult.reason, { source: "page.outletDailyRecords.completionMatrix" });
  const trend = trendResult.status === "fulfilled" ? trendResult.value : null;
  const completion = completionResult.status === "fulfilled" ? completionResult.value : null;
  const filtered = hasActiveFilters(filters);
  return <>
    <PageHeader title="Outlet Daily Records" description="Morning receiving and evening wastage capture by outlet." action={canCreate ? { href: "/outlet-daily-records/new", label: "New Daily Record" } : undefined} hideTabletCreateFab contentWidth="wide" />
    <WorkspaceGrid className="sb-portrait-tablet-rail" hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions">
        {canCreate ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/outlet-daily-records/new">New Daily Record</Link></Button> : <p className="text-xs text-muted-foreground">Your role has read-only access.</p>}
        {canExport ? <OutletDailyExportDialog branches={options.branches} /> : null}
      </ConsoleSection>
      <ConsoleSection title="Today"><dl className="divide-y divide-[var(--sb-border-soft)] text-xs">
        <div className="flex items-center justify-between gap-4 pb-2"><dt className="font-medium text-[var(--sb-text)]">Records</dt><dd className="text-lg font-semibold tabular-nums text-[var(--sb-text)]">{data.summary.today_records}</dd></div>
        <div className="flex items-start justify-between gap-4 py-2"><dt className="font-medium text-[var(--sb-text)]">Qty sent</dt><dd className="font-semibold tabular-nums">{data.summary.today_sent === null ? "Unavailable" : formatNumber(data.summary.today_sent)}</dd></div>
        <div className="flex items-start justify-between gap-4 py-2"><dt className="font-medium text-[var(--sb-text)]">Total received</dt><dd className={`text-right font-semibold tabular-nums ${data.summary.today_received === null || data.summary.today_received_zero_with_sent > 0 ? "text-warning" : ""}`}>{data.summary.today_received === null ? "Unavailable" : data.summary.today_received_zero_with_sent > 0 ? `${formatNumber(data.summary.today_received)} · verify` : formatNumber(data.summary.today_received)}</dd></div>
        <div className="grid grid-cols-2 gap-4 pt-2"><div><dt className="text-[10px] text-muted-foreground">Posted</dt><dd className="mt-0.5 font-semibold tabular-nums">{data.summary.posted_today}</dd></div><div><dt className="text-[10px] text-muted-foreground">In progress</dt><dd className="mt-0.5 font-semibold tabular-nums">{data.summary.missing_evening}</dd></div></div>
      </dl></ConsoleSection>
      {canViewWastageCost ? <ConsoleSection title="Today's wastage value"><div className="space-y-1 text-xs" data-outlet-wastage-cost-summary><p className="flex justify-between"><span>Costed amount</span><strong>{wastageCost.amount === null ? "Unavailable" : `RM ${wastageCost.amount.toFixed(2)}`}</strong></p><p className="text-[11px] text-muted-foreground">{wastageCost.state === "verified" ? `${wastageCost.priced_lines} costed line${wastageCost.priced_lines === 1 ? "" : "s"}` : wastageCost.state === "partial" ? `${wastageCost.unavailable_lines} line${wastageCost.unavailable_lines === 1 ? "" : "s"} missing recipe cost` : "No active recipe cost snapshot"}</p></div></ConsoleSection> : null}
      {completion?.summary ? <ConsoleSection title="7-day coverage"><div className="space-y-2 text-xs"><p className="flex justify-between"><span>Complete</span><strong>{completion.summary.completed}/{completion.summary.expected}</strong></p><p className="flex justify-between"><span>In progress</span><strong>{completion.summary.incomplete}</strong></p><p className="flex justify-between"><span>Missing</span><strong>{completion.summary.missing}</strong></p><p className="flex justify-between"><span>Void</span><strong>{completion.summary.voided}</strong></p></div></ConsoleSection> : null}
    </>}>
      <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-x-clip" data-outlet-daily-list-workspace>
        <div className="flex min-w-0 flex-col gap-3" data-outlet-daily-insights>
          <div className="erp-surface flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"><div><p className="text-sm font-semibold">Calendar history</p><p className="text-xs text-muted-foreground">Choose any date to review its seven-day outlet coverage.</p></div><form className="flex min-w-0 items-center gap-2"><Input name="history_date" type="date" aria-label="History end date" defaultValue={filters.history_date ?? data.summary.today} className="h-9 min-w-0" />{filters.branch ? <input type="hidden" name="branch" value={filters.branch} /> : null}<Button type="submit" variant="outline" size="sm" className="shrink-0">View</Button></form></div>
          <OutletDailyCompletionMatrix dates={completion?.dates ?? []} rows={completion?.rows ?? []} summary={completion?.summary ?? null} unavailable={!completion} canCreate={canCreate} showCoverageDetails={false} />
          <OutletDailyWastageChart points={trend?.daily ?? []} branch={filters.branch} unavailable={!trend} />
        </div>
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
            <SelectControl name="status" value={filters.status ?? "all"} ariaLabel="Status" options={[{ value: "all", label: "All statuses" }, ...statuses.map((status) => ({ value: status, label: status.replaceAll("_", " ") }))]} />
            {canViewSentGaps ? <SelectControl name="sent_state" value={filters.sent_state ?? "all"} ariaLabel="Qty sent state" options={[{ value: "all", label: "All Qty Sent" }, { value: "missing", label: "Qty Sent missing" }]} /> : null}
              <Button type="submit" variant="secondary" data-list-action="primary">Search</Button>
              {filtered ? <Button asChild variant="secondary" data-list-action="secondary"><Link href="/outlet-daily-records">Reset</Link></Button> : null}
          </FilterBar>
          <div className="sb-list-content-card overflow-hidden" data-mobile-list-content-card data-outlet-daily-record-list>
        <Table className="sb-outlet-daily-table" mobileHidden aria-label="Outlet daily records" stickyColumn="second"><TableHeader><TableRow><TableHead>Action</TableHead><SortableHead label="Date" column="date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /><TableHead>Location</TableHead>{canViewSentGaps ? <TableHead>Qty Sent</TableHead> : null}<SortableHead label="Outlet" column="outlet" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Wastage qty<br /><span className="font-normal text-muted-foreground">Rate</span></TableHead><TableHead>Updated<br />By</TableHead><SortableHead label="Last Updated" column="updated" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /></TableRow></TableHeader><TableBody>
           {data.rows.map((row) => { const progress = outletProgress(row); return <DataGridRow key={row.id} href={`/outlet-daily-records/${row.id}`} className={row.record_date === data.summary.today ? "bg-[var(--sb-success-soft)]" : undefined}><TableCell><TableActionLink href={`/outlet-daily-records/${row.id}`} label={`Open ${row.branch_name} daily record`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell><TableCell><span className="whitespace-nowrap">{formatDateOnly(row.record_date)}</span>{row.record_date === data.summary.today ? <span className="mt-1 inline-flex rounded-full bg-[var(--sb-info-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--sb-info)]">Today</span> : null}</TableCell><TableCell className="font-medium">{row.branch_name}</TableCell>{canViewSentGaps ? <TableCell><StatusBadge status={row.qty_sent_state === "confirmed" ? "completed" : row.qty_sent_state === "draft" ? "in_progress" : "missing"} />{row.qty_sent_state !== "confirmed" ? <p className="mt-1 text-[11px] text-muted-foreground">{row.qty_sent_state === "draft" ? "Needs confirmation" : "Needs entry"}</p> : null}</TableCell> : null}<TableCell><StatusBadge status={progress.status} /></TableCell><TableCell className="text-right">{row.total_received === null ? <span className="text-warning" title={`${row.received_pending_lines} food line${row.received_pending_lines === 1 ? "" : "s"} still need a Received value`}><span className="block">Pending</span><span className="block text-[11px] font-normal">{row.received_pending_lines} line{row.received_pending_lines === 1 ? "" : "s"}</span></span> : row.received_zero_with_sent ? <span className="text-warning" title="Qty sent is recorded but no receipt quantity has been confirmed">0 · verify</span> : formatNumber(row.total_received)}</TableCell><TableCell className="text-right" title="Wastage rate = wastage quantity divided by received quantity"><span className="block">{formatQuantity(row.total_wastage)}</span><span className="block text-[11px] text-muted-foreground">{row.wastage_percent === null ? row.received_pending_lines > 0 ? "Pending receipt" : "—" : `${formatWastageRate(row.wastage_percent)}% rate`}</span></TableCell><TableCell>{row.updated_by_name ?? "—"}</TableCell><TableCell className="whitespace-nowrap">{formatDateTime(row.updated_at).split(" ").map((part, index) => <span key={`${part}-${index}`} className={index === 0 ? "block" : "block text-xs text-muted-foreground"}>{part}</span>)}</TableCell></DataGridRow>; })}
          {!data.rows.length ? <TableRow><TableCell colSpan={canViewSentGaps ? 9 : 8}><EmptyState title={filtered ? "No daily records match these filters" : "No outlet daily records yet"} description={filtered ? "Reset the filters or widen the search." : "Daily receiving and wastage records will appear here."} action={filtered ? { href: "/outlet-daily-records", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
        </TableBody></Table>
        <OperationalList ariaLabel="Outlet daily records">
          {data.rows.map((row) => <OperationalListRow
            key={row.id}
            href={`/outlet-daily-records/${row.id}`}
            label={`Open ${row.branch_name} daily record`}
            primary={<span>{row.branch_name}</span>}
            status={<StatusBadge status={outletProgress(row).status} />}
            secondary={`${formatDateOnly(row.record_date)}${row.record_date === data.summary.today ? " · Today" : ""}${row.total_wastage > 0 ? ` · ${formatNumber(row.total_wastage)} waste` : ""}`}
            meta={`${canViewSentGaps ? `Qty Sent ${row.qty_sent_state === "confirmed" ? "confirmed" : row.qty_sent_state === "draft" ? "needs confirmation" : "missing"} · ` : ""}${row.total_received === null ? "Received unavailable · verify source data" : row.received_zero_with_sent ? "0 received · verify" : `${formatNumber(row.total_received)} received`}`}
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
