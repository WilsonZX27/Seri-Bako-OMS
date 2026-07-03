import Link from "next/link";
import { BulkSelectionProvider, BulkSelectAllCheckbox, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DocumentNumber } from "@/components/document-number";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
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
  const [jobs, branches] = await Promise.all([getProductionJobs(filters), getBranchesForSelect()]);
  const selectedStatus = filters.status ?? "all";

  return (
    <>
      <PageHeader
        title="Production Jobs"
        description="Create, approve, and post recipe-based production without changing stock until posting."
        action={{ href: "/production/jobs/new", label: "New Production Job" }}
      />
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><BulkSelectAllCheckbox /></TableHead>
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
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.rows.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell><BulkSelectRowCheckbox id={job.id} /></TableCell>
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
                      <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/production/jobs/${job.id}`}>Open</Link></Button></TableCell>
                    </TableRow>
                  ))}
                  {!jobs.rows.length ? (
                    <TableRow>
                      <TableCell colSpan={12} className="py-8 text-center text-sm text-muted-foreground">
                        No production jobs found for {formatStatusLabel(selectedStatus)}.
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
