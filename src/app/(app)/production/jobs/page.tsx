import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Pencil, FileText, XCircle } from "lucide-react";
import { BulkSelectionProvider, BulkSelectAllCheckbox, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectionCell, TableSelectionHead } from "@/components/ui/table";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";
import { getBranchesForSelect } from "@/server/queries/common";
import { getProductionJobs } from "@/server/queries/production-jobs";
import { hasPermission } from "@/server/auth/permissions";
import { formatNumber } from "@/lib/utils";
import { formatStatusLabel } from "@/lib/status-label";
import { hasActiveFilters } from "@/lib/table-state";

const tabs = [
  ["all", "All"],
  ["draft", "Draft"],
  ["submitted", "Submitted"],
  ["approved", "Approved"],
  ["posted", "Posted"],
  ["cancelled", "Cancelled"],
];

export default async function ProductionJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [jobs, allJobs, branches, canCreate] = await Promise.all([getProductionJobs(filters), getProductionJobs({ page: "all" }), getBranchesForSelect(), hasPermission("production.create")]);
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
      <RightConsoleMount>
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
      </RightConsoleMount>
      <BulkSelectionProvider ids={jobs.rows.map((row) => row.id)} actionLabel="Archive selected" canAct={false}>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {tabs.map(([value, label]) => (
              <Button key={value} asChild variant={selectedStatus === value ? "default" : "outline"} size="sm">
                <Link href={`/production/jobs${value === "all" ? "" : `?status=${value}`}`}>{label}</Link>
              </Button>
            ))}
          </div>

          <Card>
            <FilterBar resultCount={jobs.totalRows} resetHref="/production/jobs" filtered={filtered}>
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search job no, recipe, output" />
              <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
              <FilterBarMore activeCount={Number(Boolean(filters.from)) + Number(Boolean(filters.to))} resetHref="/production/jobs"><Input name="from" type="date" defaultValue={filters.from ?? ""} /><Input name="to" type="date" defaultValue={filters.to ?? ""} /></FilterBarMore>
              <Button type="submit" variant="secondary">Filter</Button>
              {selectedStatus !== "all" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
            </FilterBar>
            <DataGridHint text="Pro-tip: Double-click any row to open the production job." />
              <Table mobileHidden aria-label="Production jobs">
                <TableHeader>
                  <TableRow>
                    <TableSelectionHead><BulkSelectAllCheckbox /></TableSelectionHead>
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
                    <TableHead className="w-12 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.rows.map((job) => (
                    <DataGridRow key={job.id} href={`/production/jobs/${job.id}`}>
                        <TableSelectionCell>
                         <BulkSelectRowCheckbox id={job.id} />
                        </TableSelectionCell>
                      <TableCell><DocumentNumber value={job.production_job_no} size="sm" /></TableCell>
                      <TableCell>{job.production_date}</TableCell>
                      <TableCell>{job.branch_name ?? "-"}</TableCell>
                      <TableCell>{job.recipe_no ?? "-"}</TableCell>
                      <TableCell>{job.product_name ?? "-"}</TableCell>
                      <TableCell className="text-right">{formatNumber(job.planned_output_qty)} {job.output_uom}</TableCell>
                      <TableCell className="text-right">{job.actual_output_qty ? formatNumber(job.actual_output_qty) : "-"}</TableCell>
                      <TableCell><StatusBadge status={job.status} /></TableCell>
                      <TableCell>{job.created_by_name ?? "-"}</TableCell>
                      <TableCell>{job.posted_at ? new Date(job.posted_at).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" }) : "-"}</TableCell>
                      <TableCell className="text-right"><TableActionLink href={`/production/jobs/${job.id}`} label={`Open ${job.production_job_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    </DataGridRow>
                  ))}
                  {!jobs.rows.length ? (
                    <TableRow>
                      <TableCell colSpan={12}>
                        <EmptyState title={filtered ? "No jobs match these filters" : "No production jobs yet"} description={filtered ? `No production jobs match ${formatStatusLabel(selectedStatus)} and the current filters.` : "Production jobs appear after they are created."} action={filtered ? { href: "/production/jobs", label: "Reset filters" } : undefined} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <OperationalList ariaLabel="Production jobs">
                {jobs.rows.map((job) => <OperationalListRow key={job.id} href={`/production/jobs/${job.id}`} label={`Open ${job.production_job_no}`} primary={<DocumentNumber value={job.production_job_no} size="sm" />} status={<StatusBadge status={job.status} />} secondary={`${job.product_name ?? job.recipe_no ?? "No output"} · ${job.production_date}`} meta={`${formatNumber(job.planned_output_qty)} ${job.output_uom}`} />)}
                {!jobs.rows.length ? <EmptyState title={filtered ? "No jobs match these filters" : "No production jobs yet"} description={filtered ? "Reset the filters or widen the date range." : "Production jobs appear after they are created."} action={filtered ? { href: "/production/jobs", label: "Reset filters" } : undefined} /> : null}
              </OperationalList>
            <PaginationControls page={jobs.page} totalPages={jobs.totalPages} totalRows={jobs.totalRows} searchParams={filters} />
          </Card>
        </div>
      </BulkSelectionProvider>
    </>
  );
}
