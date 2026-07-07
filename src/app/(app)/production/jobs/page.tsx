import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Eye, FileText, XCircle } from "lucide-react";
import { BulkSelectionProvider, BulkSelectAllCheckbox, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";
import { getBranchesForSelect } from "@/server/queries/common";
import { getProductionJobs } from "@/server/queries/production-jobs";
import { formatNumber } from "@/lib/utils";
import { formatStatusLabel } from "@/lib/status-label";

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
  const [jobs, allJobs, branches] = await Promise.all([getProductionJobs(filters), getProductionJobs({ page: "all" }), getBranchesForSelect()]);
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

  return (
    <>
      <PageHeader
        title="Production Jobs"
        description="Create, approve, and post recipe-based production without changing stock until posting."
        action={{ href: "/production/jobs/new", label: "New Production Job" }}
      />
      <RightConsoleMount>
        <ConsoleSection title="Production Summary">
          <div className="grid gap-2 text-xs">
            {insights.map((item) => (
              <Link key={item.label} href={item.href} className="flex justify-between rounded-md px-2 py-1.5 hover:bg-secondary">
                <span className={item.active ? "font-semibold text-foreground" : "text-muted-foreground"}>{item.label}</span>
                <strong>{item.value}</strong>
              </Link>
            ))}
          </div>
        </ConsoleSection>
      </RightConsoleMount>
      <BulkSelectionProvider ids={jobs.rows.map((row) => row.id)} actionLabel="Archive selected" canAct={false}>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {tabs.map(([value, label]) => (
              <Button key={value} asChild variant={selectedStatus === value ? "default" : "outline"} size="sm" className="rounded-full">
                <Link href={`/production/jobs${value === "all" ? "" : `?status=${value}`}`}>{label}</Link>
              </Button>
            ))}
          </div>

          <Card>
            <form className="grid gap-3 border-b p-4 md:grid-cols-[1fr_180px_180px_140px_auto]">
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search job no, recipe, output" />
              <SelectNative name="branch_id" defaultValue={filters.branch_id ?? "all"}>
                <option value="all">All branches</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
              <Input name="from" type="date" defaultValue={filters.from ?? ""} />
              <Input name="to" type="date" defaultValue={filters.to ?? ""} />
              <Button type="submit" variant="secondary">Filter</Button>
              {selectedStatus !== "all" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
            </form>
            <DataGridHint text="Pro-tip: Double-click any row to open the production job." />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20"><BulkSelectAllCheckbox /></TableHead>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BulkSelectRowCheckbox id={job.id} />
                          <Link href={`/production/jobs/${job.id}`} aria-label={`Quick view ${job.production_job_no}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </TableCell>
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
                    </DataGridRow>
                  ))}
                  {!jobs.rows.length ? (
                    <TableRow>
                      <TableCell colSpan={11}>
                        <EmptyState title="No production jobs found" description={`No production jobs found for ${formatStatusLabel(selectedStatus)}.`} action={{ href: "/production/jobs/new", label: "New Production Job" }} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            <PaginationControls page={jobs.page} totalPages={jobs.totalPages} totalRows={jobs.totalRows} searchParams={filters} />
          </Card>
        </div>
      </BulkSelectionProvider>
    </>
  );
}
