import Link from "next/link";
import { Pencil } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectionCell, TableSelectionHead } from "@/components/ui/table";
import { formatPageError } from "@/server/actions/error-handling";
import { getBranches } from "@/server/queries/foundation";
import { hasActiveFilters } from "@/lib/table-state";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { hasPermission } from "@/server/auth/permissions";
import { archiveBranches, restoreBranches } from "@/server/actions/foundation";

export const dynamic = "force-dynamic";

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  try {
    const filters = await searchParams;
    const [branches, summaryBranches, canCreate, canUpdate] = await Promise.all([getBranches(filters), getBranches({ ...filters, status: "all" }), hasPermission("branches.create"), hasPermission("branches.update")]);
    const isArchivedView = filters.status === "archived";
    const filtered = hasActiveFilters(filters);

    return (
      <>
        <PageHeader title="Branches" description="Central kitchen, outlets, event booths, offices, and operating units." />
        <WorkspaceGrid hideMobileConsole tabletRailMode="split" tabletRailBreakpoint="md" rightRail={<>{canCreate ? <ConsoleSection title="Actions"><Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/branches/new">New branch</Link></Button></ConsoleSection> : null}<ConsoleSection title="Branch Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{summaryBranches.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{summaryBranches.filter((branch) => branch.status === "active").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Archived</dt><dd className="font-semibold">{summaryBranches.filter((branch) => branch.status === "archived").length}</dd></div></dl></ConsoleSection></>}>
          {filters.error || filters.success ? (
            <Card>
              <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>
                {filters.error ?? filters.success}
              </CardContent>
            </Card>
          ) : null}
          <div className="min-w-0 space-y-3">
            <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search branch code, name, or type" statuses={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} showStatus={false} leadingFilter={<SelectControl key={filters.status ?? "all"} name="status" defaultValue={filters.status ?? "all"} ariaLabel="Filter by status" options={[{ value: "all", label: "All statuses" }, { value: "active", label: "active" }, { value: "archived", label: "archived" }]} className="sb-status-filter-control min-h-[var(--sb-control-height)] w-full text-xs font-medium" />} resultCount={branches.length} filtered={filtered} resetHref="/branches" />
            <BulkSelectionProvider toolbarLayout="stacked" ids={branches.map((branch) => branch.id)} action={isArchivedView ? restoreBranches : archiveBranches} fieldName="branch_id" canAct={canUpdate} actionLabel={isArchivedView ? "Restore selected" : "Archive selected"} actionVariant={isArchivedView ? "default" : "destructive"} confirmMessage={isArchivedView ? "Restore the selected branches to active operations?" : "Archive the selected branches? They will be removed from active lists while preserving their history."} actionHint={isArchivedView ? "Restore archived branches only when they are ready for daily operations." : "Archive branches only after confirming they are no longer used by daily operations."}>
              {/* Active view keeps the canonical action={archiveBranches} contract; archived view swaps in restoreBranches. */}
            <DataGridHint text="Pro-tip: Double-click any row to open the branch." />
              <div className="sb-list-content-card overflow-hidden">
              {canUpdate && branches.length ? <div className="flex min-h-11 items-center gap-1 border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-1 xl:hidden"><BulkSelectAllCheckbox touchTarget /><span className="text-xs font-medium text-muted-foreground">Select all visible branches</span></div> : null}
              <Table mobileHidden compactUntil="xl" aria-label="Branches" stickyColumn={canUpdate ? "third" : "first"}>
                <TableHeader>
                  <TableRow>
                    {canUpdate ? <TableSelectionHead><BulkSelectAllCheckbox /></TableSelectionHead> : null}
                    {canUpdate ? <TableHead className="w-12 text-center">Action</TableHead> : null}
                    <TableHead>Code</TableHead>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-[var(--sb-surface-raised)]">
                  {branches.map((branch) => (
                    <DataGridRow key={branch.id} href={canUpdate ? `/branches/${branch.id}` : "/branches"}>
                        {canUpdate ? <TableSelectionCell>
                         <BulkSelectRowCheckbox id={branch.id} />
                        </TableSelectionCell> : null}
                      {canUpdate ? <TableCell className="text-center"><TableActionLink href={`/branches/${branch.id}`} label={`Open ${branch.branch_name}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell> : null}
                      <TableCell>{branch.branch_code}</TableCell>
                      <TableCell className="font-medium">{branch.branch_name}</TableCell>
                      <TableCell className="capitalize">{branch.branch_type.replaceAll("_", " ")}</TableCell>
                      <TableCell>{branch.phone ?? "-"}</TableCell>
                      <TableCell>{branch.email ?? "-"}</TableCell>
                      <TableCell className="max-w-64 truncate">{branch.address ?? "-"}</TableCell>
                      <TableCell><Badge variant={branch.status === "active" ? "success" : "secondary"}>{branch.status}</Badge></TableCell>
                    </DataGridRow>
                  ))}
                  {!branches.length ? <TableRow><TableCell colSpan={canUpdate ? 9 : 7}><EmptyState title={filtered ? "No records match these filters" : "No branches yet"} description={filtered ? "Clear filters or widen the search to see more branches." : "Branches will appear here after operating units are created."} action={filtered ? { href: "/branches", label: "Clear filters" } : canCreate ? { href: "/branches/new", label: "New branch" } : undefined} /></TableCell></TableRow> : null}
                </TableBody>
              </Table>
              <OperationalList ariaLabel="Branches" showUntil="xl">
                {branches.map((branch) => <OperationalListRow
                  key={branch.id}
                  href={canUpdate ? `/branches/${branch.id}` : undefined}
                  label={canUpdate ? `Open ${branch.branch_name}` : branch.branch_name}
                  primary={branch.branch_name}
                  status={<Badge variant={branch.status === "active" ? "success" : "secondary"}>{branch.status}</Badge>}
                  secondary={`${branch.branch_code} · ${branch.branch_type.replaceAll("_", " ")}`}
                  detail={<><span className="block">{branch.phone ?? "No phone"} · {branch.email ?? "No email"}</span><span className="block break-words">{branch.address ?? "No address"}</span></>}
                  meta={canUpdate ? "Open" : undefined}
                  leading={canUpdate ? <BulkSelectRowCheckbox id={branch.id} label={`Select ${branch.branch_name}`} touchTarget /> : undefined}
                />)}
                {!branches.length ? <EmptyState title={filtered ? "No records match these filters" : "No branches yet"} description={filtered ? "Clear filters or widen the search to see more branches." : "Branches will appear here after operating units are created."} action={filtered ? { href: "/branches", label: "Clear filters" } : canCreate ? { href: "/branches/new", label: "New branch" } : undefined} /> : null}
              </OperationalList>
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
