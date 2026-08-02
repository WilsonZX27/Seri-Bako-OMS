import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Pencil, FileText, XCircle } from "lucide-react";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { StatusTabs } from "@/components/status-tabs";
import { getBranchesForSelect } from "@/server/queries/common";
import { getProductionJobs } from "@/server/queries/production-jobs";
import { hasPermission } from "@/server/auth/permissions";
import { formatDateOnly, formatDateTime, formatNumber } from "@/lib/utils";
import { formatStatusLabel } from "@/lib/status-label";
import { hasActiveFilters, paginateRows } from "@/lib/table-state";
import { logServerError } from "@/server/observability/logger";

const jobStatuses = [
  ["draft", "Draft"],
  ["submitted", "Submitted"],
  ["approved", "Approved"],
  ["posted", "Posted"],
  ["cancelled", "Cancelled"],
];

async function loadProductionJobs(filters: Record<string, string | undefined>) {
  try {
    return await getProductionJobs(filters);
  } catch (error) {
    logServerError(error, { source: "page.productionJobs.list" });
    return paginateRows([], filters.page, 15);
  }
}

async function loadBranches() {
  try {
    return await getBranchesForSelect();
  } catch (error) {
    logServerError(error, { source: "page.productionJobs.branchFilter" });
    return [];
  }
}

export default async function ProductionJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [jobs, allJobs, branches, canCreate] = await Promise.all([loadProductionJobs(filters), loadProductionJobs({ page: "all" }), loadBranches(), hasPermission("production.create")]);
  const selectedStatus = filters.status ?? "all";
  const rows = allJobs.rows;
  const countByStatus = (...values: string[]) => rows.filter((row) => values.includes(row.status)).length;
  const insights = [
    { label: "Total", value: rows.length, href: "/production/jobs", active: selectedStatus === "all", icon: FileText },
    { label: "Draft", value: countByStatus("draft"), href: "/production/jobs?status=draft", active: selectedStatus === "draft", icon: FileText },
    { label: "In Review", value: countByStatus("submitted"), href: "/production/jobs?status=submitted", active: selectedStatus === "submitted", icon: ClipboardCheck },
    { label: "Approved", value: countByStatus("approved"), href: "/production/jobs?status=approved", active: selectedStatus === "approved", icon: CheckCircle2 },
    { label: "Posted", value: countByStatus("posted"), href: "/production/jobs?status=posted", active: selectedStatus === "posted", icon: CheckCircle2 },
    { label: "Cancelled", value: countByStatus("cancelled"), href: "/production/jobs?status=cancelled", active: selectedStatus === "cancelled", icon: XCircle },
  ];
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader
        title="Production Jobs"
        description="Create, approve, and post recipe-based production without changing stock until posting."
      />
      <WorkspaceGrid
        hideMobileConsole={!canCreate}
        tabletRailMode="split"
        rightRail={<>
          {canCreate ? <ConsoleSection title="Actions">
          <Button asChild size="sm" className="w-full" data-mobile-primary-action>
            <Link href="/production/jobs/new">New Production Job</Link>
          </Button>
        </ConsoleSection> : null}
        <ConsoleSection title="Production Summary">
          <div className="grid gap-1.5 text-xs">
            {insights.map((item) => (
              <div key={item.label} className="flex justify-between px-1 py-0.5">
                <span className={item.active ? "font-semibold text-foreground" : "text-muted-foreground"}>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          </ConsoleSection>
        <ConsoleSection title="Production Tools">
          <div className="grid gap-2">
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/production/planning">Production Planning</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/production/variance">Demand Variance</Link>
            </Button>
          </div>
        </ConsoleSection>
        </>}
      >
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[2px] border bg-card">
            <FilterBar resultCount={jobs.totalRows} resetHref="/production/jobs" filtered={filtered}>
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search job no, recipe, output" />
              <StatusTabs statuses={jobStatuses.map(([value, label]) => ({ value, label }))} activeStatus={filters.status} />
              <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
              <FilterBarMore activeCount={Number(Boolean(filters.from)) + Number(Boolean(filters.to))} resetHref="/production/jobs"><Input name="from" type="date" defaultValue={filters.from ?? ""} /><Input name="to" type="date" defaultValue={filters.to ?? ""} /></FilterBarMore>
              <Button type="submit" variant="secondary">Filter</Button>
              {selectedStatus !== "all" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
            </FilterBar>
            <DataGridHint text="Pro-tip: Double-click any row to open the production job." />
            <Table mobileHidden aria-label="Production jobs" stickyColumn="second">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Action</TableHead>
                    <SortableHead label="Job No" column="production_job_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                    <SortableHead label="Date" column="production_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                    <TableHead>Branch</TableHead>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead className="text-right">Planned</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                    <TableHead>Created By</TableHead>
                    <TableHead>Posted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.rows.map((job) => (
                    <DataGridRow key={job.id} href={`/production/jobs/${job.id}`}>
                      <TableCell className="text-center"><TableActionLink href={`/production/jobs/${job.id}`} label={`Open ${job.production_job_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                      <TableCell><DocumentNumber value={job.production_job_no} size="sm" /></TableCell>
                      <TableCell>{formatDateOnly(job.production_date)}</TableCell>
                      <TableCell>{job.branch_name ?? "-"}</TableCell>
                      <TableCell>{job.recipe_no ?? "-"}</TableCell>
                      <TableCell>{job.product_name ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatNumber(job.planned_output_qty)} {job.output_uom}</TableCell>
                      <TableCell className="text-right">{job.actual_output_qty ? formatNumber(job.actual_output_qty) : "-"}</TableCell>
                      <TableCell><StatusBadge status={job.status} /></TableCell>
                      <TableCell>{job.created_by_name ?? "-"}</TableCell>
                      <TableCell>{job.posted_at ? formatDateTime(job.posted_at) : "-"}</TableCell>
                    </DataGridRow>
                  ))}
                  {!jobs.rows.length ? (
                    <TableRow>
                      <TableCell colSpan={11}>
                        <EmptyState title={filtered ? "No jobs match these filters" : "No production jobs yet"} description={filtered ? `No production jobs match ${formatStatusLabel(selectedStatus)} and the current filters.` : "Production jobs appear after they are created."} action={filtered ? { href: "/production/jobs", label: "Reset filters" } : undefined} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <OperationalList ariaLabel="Production jobs">
                {jobs.rows.map((job) => <OperationalListRow key={job.id} href={`/production/jobs/${job.id}`} label={`Open ${job.production_job_no}`} primary={<DocumentNumber value={job.production_job_no} size="sm" />} status={<StatusBadge status={job.status} />} secondary={`${job.product_name ?? job.recipe_no ?? "No output"} · ${formatDateOnly(job.production_date)}`} meta={`${formatNumber(job.planned_output_qty)} ${job.output_uom}`} />)}
                {!jobs.rows.length ? <EmptyState title={filtered ? "No jobs match these filters" : "No production jobs yet"} description={filtered ? "Reset the filters or widen the date range." : "Production jobs appear after they are created."} action={filtered ? { href: "/production/jobs", label: "Reset filters" } : undefined} /> : null}
              </OperationalList>
            <PaginationControls page={jobs.page} totalPages={jobs.totalPages} totalRows={jobs.totalRows} searchParams={filters} />
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
