import Link from "next/link";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStaffs } from "@/server/queries/foundation";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getStaffAuthState, staffAuthStateLabels } from "@/lib/staff-auth-state";
import { hasActiveFilters } from "@/lib/table-state";

export default async function StaffsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  const filters = await searchParams;
  const staffs = await getStaffs(filters);
  const filtered = hasActiveFilters(filters);
  return (
    <>
      <PageHeader title="Staffs" description="Staff access, default branch assignment, and account status." action={{ href: "/staffs/new", label: "New staff" }} />
      <WorkspaceGrid rightRail={<><ConsoleSection title="Actions"><Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/staffs/new">New staff</Link></Button></ConsoleSection><ConsoleSection title="Staff Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{staffs.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{staffs.filter((staff) => staff.status === "active").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Invited / pending</dt><dd className="font-semibold">{staffs.filter((staff) => ["invited", "pending"].includes(staff.invitation_status ?? staff.status)).length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Disabled</dt><dd className="font-semibold">{staffs.filter((staff) => staff.status === "disabled").length}</dd></div></dl></ConsoleSection></>}> 
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <div className="overflow-hidden rounded-[2px] border bg-card">
        <MasterDataFilters
          search={filters.search}
          status={filters.status}
          showStatus={false}
          leadingFilter={<StatusTabs statuses={[{ value: "invited", label: "Invited" }, { value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }]} activeStatus={filters.status} />}
          placeholder="Search staff, email, branch, or role"
          resultCount={staffs.length}
          filtered={filtered}
          resetHref="/staffs"
          statuses={[
            { value: "invited", label: "Invited" },
            { value: "active", label: "Active" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
        <DataGridHint text="Pro-tip: Double-click any row to open the staff profile." />
          <Table className="sb-staff-table" mobileHidden aria-label="Staff members" stickyColumn="second"><TableHeader><TableRow>
          <TableHead className="w-16 text-center">Action</TableHead><TableHead>Staff</TableHead><TableHead>Assignment</TableHead><TableHead>Status</TableHead>
        </TableRow></TableHeader><TableBody>
          {staffs.map((staff) => (
            <DataGridRow key={staff.id} href={`/staffs/${staff.id}`}>
              <TableCell className="w-16 p-0 text-center"><TableActionLink href={`/staffs/${staff.id}`} label={`Open ${staff.full_name}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
              <TableCell><p className="font-medium">{staff.full_name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{staff.staff_code?.toUpperCase() ?? "No staff code"} · {staff.email ?? "No email"}</p></TableCell>
              <TableCell><p>{staff.role_name ?? "No role"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{staff.default_branch_name ?? "No default branch"}</p></TableCell>
              <TableCell><StatusBadge status={staff.status} /><p className="mt-1 text-[11px] font-medium text-muted-foreground">{staffAuthStateLabels[getStaffAuthState(staff)]}</p></TableCell>
            </DataGridRow>
          ))}
          {!staffs.length ? <TableRow><TableCell colSpan={4}><EmptyState title="No staff found" description="Staff accounts will appear here after they are invited or created." action={{ href: "/staffs/new", label: "New staff" }} /></TableCell></TableRow> : null}
        </TableBody></Table>
        <OperationalList ariaLabel="Staff members" className="erp-surface overflow-hidden">{staffs.map((staff) => <OperationalListRow key={staff.id} href={`/staffs/${staff.id}`} label={`Open ${staff.full_name}`} primary={staff.full_name} status={<StatusBadge status={staff.status} />} statusMeta={staffAuthStateLabels[getStaffAuthState(staff)]} secondary={`${staff.staff_code?.toUpperCase() ?? "No staff code"} · ${staff.role_name ?? "No role"}`} detail={`${staff.email ?? "No email"} · ${staff.default_branch_name ?? "No default branch"}`} />)}{!staffs.length ? <EmptyState title="No staff found" description="Staff accounts will appear here after they are invited or created." action={{ href: "/staffs/new", label: "New staff" }} /> : null}</OperationalList>
      </div></WorkspaceGrid>
    </>
  );
}
