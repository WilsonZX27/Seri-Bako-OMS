import Link from "next/link";
import { Eye } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPageError } from "@/server/actions/error-handling";
import { getBranches } from "@/server/queries/foundation";
import { hasActiveFilters } from "@/lib/table-state";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";

export const dynamic = "force-dynamic";

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  try {
    const filters = await searchParams;
    const branches = await getBranches(filters);
    const filtered = hasActiveFilters(filters);

    return (
      <>
        <PageHeader title="Branches" description="Central kitchen, outlets, event booths, offices, and operating units." action={{ href: "/branches/new", label: "New branch" }} />
        <WorkspaceGrid rightRail={<><ConsoleSection title="Branch Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{branches.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{branches.filter((branch) => branch.status === "active").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Archived</dt><dd className="font-semibold">{branches.filter((branch) => branch.status === "archived").length}</dd></div></dl></ConsoleSection></>}>
          {filters.error || filters.success ? (
            <Card>
              <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-emerald-700"}`}>
                {filters.error ?? filters.success}
              </CardContent>
            </Card>
          ) : null}
          <div className="overflow-hidden rounded-[2px] border bg-card">
            <StatusTabs statuses={["active", "archived"]} activeStatus={filters.status} />
            <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search branch code, name, or type" statuses={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
            <BulkSelectionProvider ids={branches.map((branch) => branch.id)} actionLabel="Archive selected" actionHint="Archive branches only after confirming they are no longer used by daily operations.">
            <DataGridHint text="Pro-tip: Double-click any row to open the branch." />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16"><BulkSelectAllCheckbox /></TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <DataGridRow key={branch.id} href={`/branches/${branch.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BulkSelectRowCheckbox id={branch.id} />
                          <Link href={`/branches/${branch.id}`} aria-label={`Quick view ${branch.branch_name}`} className="p-1 text-[var(--sb-text-soft)] opacity-0 hover:bg-[var(--sb-surface-muted)] hover:text-primary group-hover:opacity-100">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>{branch.branch_code}</TableCell>
                      <TableCell className="font-medium">{branch.branch_name}</TableCell>
                      <TableCell className="capitalize">{branch.branch_type.replaceAll("_", " ")}</TableCell>
                      <TableCell>{branch.phone ?? "-"}</TableCell>
                      <TableCell>{branch.email ?? "-"}</TableCell>
                      <TableCell className="max-w-64 truncate">{branch.address ?? "-"}</TableCell>
                      <TableCell><Badge variant={branch.status === "active" ? "success" : "secondary"}>{branch.status}</Badge></TableCell>
                    </DataGridRow>
                  ))}
                  {!branches.length ? <TableRow><TableCell colSpan={8}><EmptyState title={filtered ? "No records match these filters" : "No branches yet"} description={filtered ? "Clear filters or widen the search to see more branches." : "Branches will appear here after operating units are created."} action={filtered ? { href: "/branches", label: "Clear filters" } : { href: "/branches/new", label: "New branch" }} /></TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
            </BulkSelectionProvider>
          </div>
        </WorkspaceGrid>
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Branches" description="Central kitchen, outlets, event booths, offices, and operating units." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              {formatPageError(error, "The branch list could not load right now. Please try again shortly.")}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
}
